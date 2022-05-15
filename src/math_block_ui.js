import { Plugin } from 'ckeditor5/src/core';
import { ButtonView } from 'ckeditor5/src/ui';
import InsertMathBlockCommand from './math_block_command';
import mathIcon from '../theme/icons/math.svg';

export default class MathBlockUI extends Plugin {
    /**
     * @inheritDoc
     */
    static get pluginName() {
        return 'MathBlockUI';
    }

    /**
     * @inheritDoc
     */
    init() {
        this._addButtons();
    }

    _addButtons() {
        const editor = this.editor;
        this._addInsertMathBlockButton();
    }

    _addInsertMathBlockButton() {
        const editor = this.editor;
        const t = editor.t;
        const view = editor.editing.view;

        editor.ui.componentFactory.add('add_math_block', locate => {
            const buttonView = new ButtonView(locate);
            const command = editor.commands.get(InsertMathBlockCommand.Name);

            buttonView.set({
                label: t('Insert Math block'),
                icon: mathIcon,
                tooltip: true
            });

            buttonView.bind('isOn', 'isEnabled').to(command, 'value', 'isEnabled');

            // Execute the command when the button is clicked.
            command.listenTo(buttonView, 'execute', () => {
                const mathBlockItem = editor.execute(InsertMathBlockCommand.Name);
                const viewElement = editor.editing.mapper.toViewElement( mathBlockItem );
                
                view.scrollToTheSelection();
                view.focus();

                if (viewElement) {
                    const domElement = view.domConverter.viewToDom(viewElement, document);
                    if (domElement) {
                        domElement.querySelector( '.ck-math__editing-view' ).focus();
                    }
                }
            });

            return buttonView;
        });
    }

    
}