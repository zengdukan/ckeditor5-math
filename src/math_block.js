import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import Widget from '@ckeditor/ckeditor5-widget/src/widget';

import MathBlockUI from './math_block_ui';
import MathBlockEditing from './math_block_editing';
import '../theme/mathform.css';

export default class MathBlock extends Plugin {
	static get requires() {
		return [ MathBlockEditing, MathBlockUI ];
	}

	static get pluginName() {
		return 'MathBlock';
	}
}
