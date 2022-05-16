import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';

import MathInlineUI from './math_inline_ui';
import MathInlineEditing from './math_inline_editing';
import '../theme/mathform.css';

export default class MathInline extends Plugin {
	static get requires() {
		return [ MathInlineEditing, MathInlineUI ];
	}

	static get pluginName() {
		return 'MathInline';
	}
}
