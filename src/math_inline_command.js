import Command from '@ckeditor/ckeditor5-core/src/command';

export class InsertMathInlineCommand extends Command {
    static Name = 'InsertMathInlineCommand';

    /**
	 * @inheritDoc
	 */
    refresh() {
        const documentSelection = this.editor.model.document.selection;
		const selectedElement = documentSelection.getSelectedElement();

        this.isEnabled = selectedElement === null || selectedElement.is( 'element', 'math-inline' );
        this.value = selectedElement ? selectedElement.getAttribute( 'source' ) : null;
    }

    /**
	 * @inheritDoc
	 */
	execute() {
        const editor = this.editor;
		const model = editor.model;
		let mermaidItem;

		model.change( writer => {
			mermaidItem = writer.createElement( 'math-inline', {
				source: 'e=mc^2'
			} );

			model.insertContent( mermaidItem );
		} );

		return mermaidItem;
    }
}

export class UpdateMathInlineCommand extends Command {
    static Name = 'UpdateMathInlineCommand';

    /**
	 * @inheritDoc
	 */
    refresh() {
        const editor = this.editor;
        const documentSelection = editor.model.document.selection;
		const selectedElement = documentSelection.getSelectedElement();
        const isSelectedElementMathInline = selectedElement && selectedElement.name === 'math-inline';

        if ( isSelectedElementMathInline || documentSelection.getLastPosition().findAncestor( 'math-inline' ) ) {
			this.isEnabled = !!selectedElement;
		} else {
			this.isEnabled = false;
		}

        this.value = selectedElement ? selectedElement.getAttribute( 'source' ) : null;
    }

    /**
	 * @inheritDoc
	 */
	execute(source) {
        const editor = this.editor;
		const model = editor.model;
		const documentSelection = model.document.selection;
		const mathItem = documentSelection.getSelectedElement() || documentSelection.getLastPosition().parent;

		model.change( writer => {
			writer.setAttribute('source', source, mathItem);
		} );

		return mathItem;
    }
}