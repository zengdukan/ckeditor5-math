import ClassicEditor from "@ckeditor/ckeditor5-editor-classic/src/classiceditor";
import Essentials from "@ckeditor/ckeditor5-essentials/src/essentials";
import Paragraph from "@ckeditor/ckeditor5-paragraph/src/paragraph";
import Bold from "@ckeditor/ckeditor5-basic-styles/src/bold";
import Italic from "@ckeditor/ckeditor5-basic-styles/src/italic";
import CKEditorInspector from '@ckeditor/ckeditor5-inspector';

import MathBlock from "../src/math_block";

ClassicEditor.create(document.querySelector("#editor"), {
	plugins: [Essentials, Paragraph, Bold, Italic, MathBlock],
	toolbar: ["bold", "italic", "add_math_block"],
	math: { engine: "katex" },
})
	.then((editor) => {
		console.log("Editor was initialized", editor);
		CKEditorInspector.attach(editor)
	})
	.catch((error) => {
		console.error(error);
		console.error(error.stack);
	});
