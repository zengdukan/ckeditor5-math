import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import { toWidget, viewToModelPositionOutsideModelElement } from '@ckeditor/ckeditor5-widget/src/utils';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';

import InsertMathBlockCommand from './math_block_command';
import katex from 'katex';

import { debounce } from 'lodash-es';
const DEBOUNCE_TIME = 300;

export default class MathBlockEditing extends Plugin {
    static ModelName = 'math_block';
    static ModelAttrDisplayMode = 'displayMode';
    static ModelAttrSource = 'source';

    /**
         * @inheritDoc
         */
    static get pluginName() {
        return 'MathBlockEditing';
    }

    /**
     * @inheritDoc
     */
    init() {
        this._registerCommands();
        this._defineConverters();
    }

    /**
     * @inheritDoc
     */
    afterInit() {
        this.editor.model.schema.register( MathBlockEditing.ModelName, {
            allowAttributes: [ MathBlockEditing.ModelAttrDisplayMode, MathBlockEditing.ModelAttrSource ],
            allowWhere: '$block',
            isObject: true
        } );
    }


    /**
     * @inheritDoc
     */
     _registerCommands() {
        const editor = this.editor;
        
        editor.commands.add(InsertMathBlockCommand.Name, new InsertMathBlockCommand( editor ));
     }

     _defineConverters() {
        const editor = this.editor;

        editor.data.downcastDispatcher.on( `insert:${MathBlockEditing.ModelName}`, this._dataDowncast.bind(this));
        editor.editing.downcastDispatcher.on( `insert:${MathBlockEditing.ModelName}`, this._editingDowncast.bind(this));
        editor.editing.downcastDispatcher.on( `attribute:${MathBlockEditing.ModelAttrSource}:${MathBlockEditing.ModelName}`, this._sourceAttributeDowncast.bind(this));
        editor.data.upcastDispatcher.on( 'element:code', this._dataUpcast.bind(this), { priority: 'high'});
        
        editor.conversion.for('editingDowncast').attributeToAttribute({
            model: {
                name: MathBlockEditing.ModelName,
                key: MathBlockEditing.ModelAttrDisplayMode,
            },
            view: modelAttributeValue => ({
                key: 'class',
                value: 'ck-math__' + modelAttributeValue + '-mode'
            })
        });
     }

     _dataDowncast(evt, data, conversionApi) {
        const model = this.editor.model;
		const { writer, mapper } = conversionApi;

		if ( !conversionApi.consumable.consume( data.item, 'insert' ) ) {
			return;
		}

		const targetViewPosition = mapper.toViewPosition( model.createPositionBefore( data.item ) );
		// For downcast we're using only language-mermaid class. We don't set class to `mermaid language-mermaid` as
		// multiple markdown converters that we have seen are using only `language-mermaid` class and not `mermaid` alone.
		const code = writer.createContainerElement( 'code', {
			class: 'language-math'
		} );
		const pre = writer.createContainerElement( 'pre', {
			spellcheck: 'false'
		} );
		const sourceTextNode = writer.createText( data.item.getAttribute( 'source' ) );

		writer.insert( model.createPositionAt( code, 'end' ), sourceTextNode );
		writer.insert( model.createPositionAt( pre, 'end' ), code );
		writer.insert( targetViewPosition, pre );
		mapper.bindElements( data.item, code );
     }

     _editingDowncast(evt, data, conversionApi) {
        const { writer, mapper, consumable } = conversionApi;
		const { editor } = this;
		const { model, t } = editor;
		const that = this;

		if ( !consumable.consume( data.item, 'insert' ) ) {
			return;
		}

		const targetViewPosition = mapper.toViewPosition( model.createPositionBefore( data.item ) );

		const wrapperAttributes = {
			class: [ 'ck-math__wrapper' ]
		};
		const textareaAttributes = {
			class: [ 'ck-math__editing-view' ],
			placeholder: t( 'Insert math source code' ),
			'data-cke-ignore-events': true
		};

		const wrapper = writer.createContainerElement( 'div', wrapperAttributes );
		const editingContainer = writer.createUIElement( 'textarea', textareaAttributes, createEditingTextarea );
		const previewContainer = writer.createUIElement( 'div', { class: [ 'ck-math__preview' ] }, createMermaidPreview );

		writer.insert( writer.createPositionAt( wrapper, 'start' ), previewContainer );
		writer.insert( writer.createPositionAt( wrapper, 'start' ), editingContainer );

		writer.insert( targetViewPosition, wrapper );

		mapper.bindElements( data.item, wrapper );

		return toWidget( wrapper, writer, {
			widgetLabel: t( 'Math Block widget' ),
			hasSelectionHandle: true
		} );

		function createEditingTextarea( domDocument ) {
			const domElement = this.toDomElement( domDocument );

			domElement.value = data.item.getAttribute( 'source' );

			const debouncedListener = debounce( event => {
				editor.model.change( writer => {
					writer.setAttribute( 'source', event.target.value, data.item );
				} );
			}, DEBOUNCE_TIME );

			domElement.addEventListener( 'input', debouncedListener );

			/* Workaround for internal #1544 */
			domElement.addEventListener( 'focus', () => {
				const model = editor.model;
				const selectedElement = model.document.selection.getSelectedElement();

				// Move the selection onto the mermaid widget if it's currently not selected.
				if ( selectedElement !== data.item ) {
					model.change( writer => writer.setSelection( data.item, 'on' ) );
				}
			}, true );

			return domElement;
		}

		function createMermaidPreview( domDocument ) {
			// Taking the text from the wrapper container element for now
			const mathSource = data.item.getAttribute( 'source' );
			const domElement = this.toDomElement( domDocument );

			domElement.innerHTML = mathSource;

			window.setTimeout( () => {
				// @todo: by the looks of it the domElement needs to be hooked to tree in order to allow for rendering.
				that._renderMath(mathSource, domElement );
			}, 100 );

			return domElement;
		}
     }

     _sourceAttributeDowncast(evt, data, conversionApi) {
        // @todo: test whether the attribute was consumed.
		const newSource = data.attributeNewValue;
		const domConverter = this.editor.editing.view.domConverter;

		if ( newSource ) {
			const mathView = conversionApi.mapper.toViewElement( data.item );

			for ( const child of mathView.getChildren() ) {
				if ( child.name === 'textarea' && child.hasClass( 'ck-math__editing-view' ) ) {
					const domEditingTextarea = domConverter.viewToDom( child, window.document );

					if ( domEditingTextarea.value != newSource ) {
						domEditingTextarea.value = newSource;
					}
				} else if ( child.name === 'div' && child.hasClass( 'ck-math__preview' ) ) {
					// @todo: we could optimize this and not refresh mermaid if widget is in source mode.
					const domPreviewWrapper = domConverter.viewToDom( child, window.document );

					if ( domPreviewWrapper ) {
						domPreviewWrapper.innerHTML = newSource;
						domPreviewWrapper.removeAttribute( 'data-processed' );

						this._renderMath( newSource, domPreviewWrapper );
					}
				}
			}
		}
     }

     _dataUpcast(evt, data, conversionApi) {
        const viewCodeElement = data.viewItem;
		const hasPreElementParent = !viewCodeElement.parent || !viewCodeElement.parent.is( 'element', 'pre' );
		const hasCodeAncestors = data.modelCursor.findAncestor( 'code' );
		const { consumable, writer } = conversionApi;

		if ( !viewCodeElement.hasClass( 'language-math' ) || hasPreElementParent || hasCodeAncestors ) {
			return;
		}

		if ( !consumable.test( viewCodeElement, { name: true } ) ) {
			return;
		}
		const mathSource = Array.from( viewCodeElement.getChildren() )
			.filter( item => item.is( '$text' ) )
			.map( item => item.data )
			.join( '' );

		const mathElement = writer.createElement( MathBlockEditing.ModelName, {
			source: mathSource,
			displayMode: 'split'
		} );

		// Let's try to insert mermaid element.
		if ( !conversionApi.safeInsert( mathElement, data.modelCursor ) ) {
			return;
		}

		consumable.consume( viewCodeElement, { name: true } );

		conversionApi.updateConversionResult( mathElement, data );
     }

     _renderMath(tex, domElement) {
        katex.render(tex, domElement, { displayMode: true, throwOnError: false });
     }
}