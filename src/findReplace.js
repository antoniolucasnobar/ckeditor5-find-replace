import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import FindReplaceEditing from './findReplaceEditing';
import FindReplaceUI from './findReplaceUI';

export default class FindReplace extends Plugin {
    /**
	 * @inheritDoc
	 */
    static get pluginName() {
        return 'FindReplace';
    }

    /**
	 * @inheritDoc
	 */
    static get requires() {
        return [ FindReplaceEditing, FindReplaceUI ];
    }
}
