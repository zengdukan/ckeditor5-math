import ClassicEditor from "@ckeditor/ckeditor5-editor-classic/src/classiceditor";
import Essentials from "@ckeditor/ckeditor5-essentials/src/essentials";
import Paragraph from "@ckeditor/ckeditor5-paragraph/src/paragraph";
import Bold from "@ckeditor/ckeditor5-basic-styles/src/bold";
import Italic from "@ckeditor/ckeditor5-basic-styles/src/italic";
import CKEditorInspector from '@ckeditor/ckeditor5-inspector';
import Math from "../src/math";
import AutoformatMath from "../src/autoformatmath";

import SourceEditing from '@ckeditor/ckeditor5-source-editing/src/sourceediting';
import Markdown from '@ckeditor/ckeditor5-markdown-gfm/src/markdown';
import Autoformat from '@ckeditor/ckeditor5-autoformat/src/autoformat';

ClassicEditor.create(document.querySelector("#editor"), {
	plugins: [Essentials, Paragraph, Bold, Italic, Math, AutoformatMath, SourceEditing,  Autoformat, Markdown],
	toolbar: ["bold", "italic", "math",'sourceEditing'],
		enablePreview: true, // Enable preview view
		math: { engine: "katex", outputType: 'span' },
})
	.then((editor) => {
		console.log("Editor was initialized", editor);
		CKEditorInspector.attach(editor);
	})
	.catch((error) => {
		console.error(error);
		console.error(error.stack);
	});
