import Command from '@ckeditor/ckeditor5-core/src/command';

export default class InsertMathBlockCommand extends Command {
    static Name = 'InsertMathBlockCommand';

    /**
	 * @inheritDoc
	 */
    refresh() {
        const documentSelection = this.editor.model.document.selection;
		const selectedElement = documentSelection.getSelectedElement();

		if ( selectedElement && selectedElement.name === 'math_block' ) {
			this.isEnabled = false;
		} else {
			this.isEnabled = true;
		}
    }

    /**
	 * @inheritDoc
	 */
	execute() {
        const editor = this.editor;
		const model = editor.model;
		let mermaidItem;

		model.change( writer => {
			mermaidItem = writer.createElement( 'math_block', {
				displayMode: 'preview',
				source: 'e=mc^2'
			} );

			model.insertContent( mermaidItem );
		} );

		return mermaidItem;
    }
}