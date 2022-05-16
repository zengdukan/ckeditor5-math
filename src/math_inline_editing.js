import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import { toWidget, viewToModelPositionOutsideModelElement } from '@ckeditor/ckeditor5-widget/src/utils';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';

import {InsertMathInlineCommand,UpdateMathInlineCommand}  from './math_inline_command';
import katex from 'katex';

import { debounce } from 'lodash-es';
const DEBOUNCE_TIME = 300;

function renderMath(tex, domElement) {
    katex.render(tex, domElement, { displayMode: false, throwOnError: false });
}

export default class MathInlineEditing extends Plugin {
    static ModelName = 'math-inline';
    static ModelAttrSource = 'source';

    /**
         * @inheritDoc
         */
    static get pluginName() {
        return 'MathLineEditing';
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
        this.editor.model.schema.register(MathInlineEditing.ModelName, {
            allowAttributes: [MathInlineEditing.ModelAttrSource],
            allowWhere: '$text',
            isObject: true,
            isInline: true,
        });
    }


    /**
     * @inheritDoc
     */
    _registerCommands() {
        const editor = this.editor;

        editor.commands.add(InsertMathInlineCommand.Name, new InsertMathInlineCommand( editor ));
        editor.commands.add(UpdateMathInlineCommand.Name, new UpdateMathInlineCommand( editor ));
    }

    _defineConverters() {
        const editor = this.editor;
        const conversion = editor.conversion;

        editor.data.downcastDispatcher.on(`insert:${MathInlineEditing.ModelName}`, this._dataDowncast.bind(this));
        editor.editing.downcastDispatcher.on(`insert:${MathInlineEditing.ModelName}`, this._editDowncast.bind(this));
        editor.editing.downcastDispatcher.on(`attribute:${MathInlineEditing.ModelAttrSource}:${MathInlineEditing.ModelName}`, this._sourceAttributeDowncast.bind(this));
        editor.data.upcastDispatcher.on('element:code', this._dataUpcast.bind(this), { priority: 'high'});
    }

    _dataDowncast( evt, data, conversionApi ) {
        const model = this.editor.model;
		const { writer, mapper } = conversionApi;

		if ( !conversionApi.consumable.consume( data.item, 'insert' ) ) {
			return;
		}

		const targetViewPosition = mapper.toViewPosition( model.createPositionBefore( data.item ) );
		// For downcast we're using only language-mermaid class. We don't set class to `mermaid language-mermaid` as
		// multiple markdown converters that we have seen are using only `language-mermaid` class and not `mermaid` alone.
		const code = writer.createContainerElement( 'code', {
			class: MathInlineEditing.ModelName
		} );
		const sourceTextNode = writer.createText( data.item.getAttribute( MathInlineEditing.ModelAttrSource ) );
		writer.insert( model.createPositionAt( code, 'end' ), sourceTextNode );
		writer.insert( targetViewPosition, code );
		mapper.bindElements( data.item, code );
    }

    _dataUpcast( evt, data, conversionApi ) {
        const viewCodeElement = data.viewItem;
		const { consumable, writer } = conversionApi;

		if ( !viewCodeElement.hasClass( MathInlineEditing.ModelName )) {
			return;
		}

		if ( !consumable.test( viewCodeElement, { name: true } ) ) {
			return;
		}
		const mermaidSource = Array.from( viewCodeElement.getChildren() )
			.filter( item => item.is( '$text' ) )
			.map( item => item.data )
			.join( '' );

		const mermaidElement = writer.createElement( MathInlineEditing.ModelName, {
			source: mermaidSource
		} );

		// Let's try to insert mermaid element.
		if ( !conversionApi.safeInsert( mermaidElement, data.modelCursor ) ) {
			return;
		}

		consumable.consume( viewCodeElement, { name: true } );

		conversionApi.updateConversionResult( mermaidElement, data );
    }

    _editDowncast( evt, data, conversionApi ) {
        const { writer, mapper, consumable } = conversionApi;
		const { editor } = this;
		const { model, t } = editor;
		const that = this;

		if ( !consumable.consume( data.item, 'insert' ) ) {
			return;
		}

		const targetViewPosition = mapper.toViewPosition( model.createPositionBefore( data.item ) );

		const styles = 'user-select: none; display: inline-block;';
        const classes = 'ck-math-tex  ck-math-tex-inline';

		const wrapper = writer.createContainerElement( 'span', {
            style: styles,
            class: classes
        } );
        const uiElement = writer.createUIElement('div', null, function (domDocument) {
            const equation = data.item.getAttribute(MathInlineEditing.ModelAttrSource);
            const domElement = this.toDomElement(domDocument);
            renderMath(equation, domElement);
            return domElement;
        });
		writer.insert( writer.createPositionAt( wrapper, 'start' ), uiElement );

		writer.insert( targetViewPosition, wrapper );

		mapper.bindElements( data.item, wrapper );

		return toWidget( wrapper, writer, {
			widgetLabel: t( 'MathInline widget' )
		} );
    }

    _sourceAttributeDowncast( evt, data, conversionApi ) {
        // @todo: test whether the attribute was consumed.
        const newSource = data.attributeNewValue;
        const domConverter = this.editor.editing.view.domConverter;

        if ( newSource ) {
            const mermaidView = conversionApi.mapper.toViewElement( data.item );

            for ( const child of mermaidView.getChildren() ) {
               if ( child.name === 'div' ) {
                    // @todo: we could optimize this and not refresh mermaid if widget is in source mode.
                    const domPreviewWrapper = domConverter.viewToDom( child, window.document );

                    if ( domPreviewWrapper ) {
                        // domPreviewWrapper.innerHTML = newSource;
                        domPreviewWrapper.removeAttribute( 'data-processed' );

                        renderMath( newSource, domPreviewWrapper );
                    }
                }
            }
        }
    }
}