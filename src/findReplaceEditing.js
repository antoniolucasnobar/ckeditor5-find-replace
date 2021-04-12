import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import '../theme/findReplace.css';
import FindCommand from './findCommand';
import { CURRENT_SEARCH_MARKER, SEARCH_MARKER } from './utils';

export default class FindReplaceEditing extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get pluginName() {
		return 'FindReplaceEditing';
	}

	/**
	 * @inheritDoc
	 */
	init() {
		const editor = this.editor;

		// conversion between model and view
		editor.conversion.for( 'downcast' ).markerToHighlight(
			{ model: SEARCH_MARKER, view: () => ( { classes: 'search-item' } ) } );
		editor.conversion.for( 'downcast' ).markerToHighlight(
			{ model: CURRENT_SEARCH_MARKER, view: () => ( { classes: 'current', priority: 99 } ) } );

		// add command
		const findCommand = new FindCommand(editor);
        editor.commands.add( 'findReplace', findCommand );
	}

}
