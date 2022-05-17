import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import ClickObserver from '@ckeditor/ckeditor5-engine/src/view/observer/clickobserver';
import ContextualBalloon from '@ckeditor/ckeditor5-ui/src/panel/balloon/contextualballoon';
import clickOutsideHandler from '@ckeditor/ckeditor5-ui/src/bindings/clickoutsidehandler';
import uid from '@ckeditor/ckeditor5-utils/src/uid';
import global from '@ckeditor/ckeditor5-utils/src/dom/global';
import { getBalloonPositionData } from './utils';

import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import InlineEditorView from './ui/inline_editor_view';
import {InsertMathInlineCommand} from './math_inline_command';

// Need math commands from there
import MathEditing from './math_inline_editing';

import mathIcon from '../theme/icons/math.svg';

const mathKeystroke = 'Ctrl+M';

export default class MathUI extends Plugin {
	static get requires() {
		return [ ContextualBalloon, MathEditing ];
	}

	static get pluginName() {
		return 'MathInlineUI';
	}

	init() {
		const editor = this.editor;
		editor.editing.view.addObserver( ClickObserver );

		this._previewUid = `math-preview-${ uid() }`;

		this.formView = this._createFormView();

		this._balloon = editor.plugins.get( ContextualBalloon );

		this._createToolbarMathButton();

		this._enableUserBalloonInteractions();
	}

	destroy() {
		super.destroy();

		this.formView.destroy();

		// Destroy preview element
		const previewEl = global.document.getElementById( this._previewUid );
		if ( previewEl ) {
			previewEl.parentNode.removeChild( previewEl );
		}
	}

	_showUI() {
		const editor = this.editor;
		const mathCommand = editor.commands.get( InsertMathInlineCommand.Name );

		if ( !mathCommand.isEnabled ) {
			return;
		}

		this._addFormView();

		this._balloon.showStack( 'main' );
	}

	_createFormView() {
		const editor = this.editor;
		const mathCommand = editor.commands.get( InsertMathInlineCommand.Name );

		const mathConfig = editor.config.get( 'math' );

		const formView = new InlineEditorView(
			editor.locale,
			mathConfig.engine,
			mathConfig.lazyLoad,
			mathConfig.enablePreview,
			this._previewUid,
			mathConfig.previewClassName,
			[]
		);

		formView.mathInput.bind( 'value' ).to( mathCommand, 'value' );

		// Form elements should be read-only when corresponding commands are disabled.
		formView.mathInput.bind( 'isReadOnly' ).to( mathCommand, 'isEnabled', value => !value );
		formView.saveButtonView.bind( 'isEnabled' ).to( mathCommand );

		// Listen to submit button click
		this.listenTo( formView, 'submit', () => {
            editor.execute( 'UpdateMathInlineCommand', formView.equation);
			this._closeFormView();
		} );

		// Listen to cancel button click
		this.listenTo( formView, 'cancel', () => {
			this._closeFormView();
		} );

		// Close plugin ui, if esc is pressed (while ui is focused)
		formView.keystrokes.set( 'esc', ( data, cancel ) => {
			this._closeFormView();
			cancel();
		} );

		return formView;
	}

	_addFormView() {
		if ( this._isFormInPanel ) {
			return;
		}

		const editor = this.editor;
		const mathCommand = editor.commands.get( InsertMathInlineCommand.Name );

		this._balloon.add( {
			view: this.formView,
			position: getBalloonPositionData( editor )
		} );

		if ( this._balloon.visibleView === this.formView ) {
			this.formView.mathInput.select();
		}

		// Show preview element
		const previewEl = global.document.getElementById( this._previewUid );
        this.formView.mathPreview.updateMath();

		this.formView.equation = mathCommand.value || '';
	}

	_hideUI() {
		if ( !this._isFormInPanel ) {
			return;
		}

		const editor = this.editor;

		this.stopListening( editor.ui, 'update' );
		this.stopListening( this._balloon, 'change:visibleView' );

		editor.editing.view.focus();

		// Remove form first because it's on top of the stack.
		this._removeFormView();
	}

	_closeFormView() {
		const mathCommand = this.editor.commands.get( InsertMathInlineCommand.Name );
		if ( mathCommand.value !== undefined ) {
			this._removeFormView();
		} else {
			this._hideUI();
		}
	}

	_removeFormView() {
		if ( this._isFormInPanel ) {
			this.formView.saveButtonView.focus();

			this._balloon.remove( this.formView );

			// Hide preview element
			const previewEl = global.document.getElementById( this._previewUid );
			if ( previewEl ) {
				previewEl.style.visibility = 'hidden';
			}

			this.editor.editing.view.focus();
		}
	}

	_createToolbarMathButton() {
		const editor = this.editor;
		const mathCommand = editor.commands.get( InsertMathInlineCommand.Name );
		const t = editor.t;

		// Handle the `Ctrl+M` keystroke and show the panel.
		editor.keystrokes.set( mathKeystroke, ( keyEvtData, cancel ) => {
			// Prevent focusing the search bar in FF and opening new tab in Edge. #153, #154.
			cancel();

			if ( mathCommand.isEnabled ) {
				this._showUI();
			}
		} );

		this.editor.ui.componentFactory.add( 'add_math_inline', locale => {
			const button = new ButtonView( locale );

			button.isEnabled = true;
			button.label = t( 'Insert inline math' );
			button.icon = mathIcon;
			button.keystroke = mathKeystroke;
			button.tooltip = true;
			button.isToggleable = true;

			button.bind( 'isEnabled' ).to( mathCommand, 'isEnabled' );

			this.listenTo( button, 'execute', () => {
                const mathBlockItem = editor.execute("InsertMathInlineCommand");
                const viewElement = editor.editing.mapper.toViewElement( mathBlockItem );
                // this._showUI() 
            });

			return button;
		} );
	}

	_enableUserBalloonInteractions() {
		const editor = this.editor;
		const viewDocument = this.editor.editing.view.document;
		this.listenTo( viewDocument, 'click', () => {
			const mathCommand = editor.commands.get( InsertMathInlineCommand.Name );
			if ( mathCommand.value ) {
				if ( mathCommand.isEnabled ) {
					this._showUI();
				}
			}
		} );

		// Close the panel on the Esc key press when the editable has focus and the balloon is visible.
		editor.keystrokes.set( 'Esc', ( data, cancel ) => {
			if ( this._isUIVisible ) {
				this._hideUI();
				cancel();
			}
		} );

		// Close on click outside of balloon panel element.
		clickOutsideHandler( {
			emitter: this.formView,
			activator: () => this._isFormInPanel,
			contextElements: [ this._balloon.view.element ],
			callback: () => this._hideUI()
		} );
	}

	get _isUIVisible() {
		const visibleView = this._balloon.visibleView;

		return visibleView == this.formView;
	}

	get _isFormInPanel() {
		return this._balloon.hasView( this.formView );
	}
}
