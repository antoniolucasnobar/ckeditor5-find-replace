
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import { addToolbarToDropdown, createDropdown } from '@ckeditor/ckeditor5-ui/src/dropdown/utils';
import FocusCycler from '@ckeditor/ckeditor5-ui/src/focuscycler';
import LabeledFieldView from '@ckeditor/ckeditor5-ui/src/labeledfield/labeledfieldview';
import { createLabeledInputText } from '@ckeditor/ckeditor5-ui/src/labeledfield/utils';
import ViewCollection from '@ckeditor/ckeditor5-ui/src/viewcollection';
import { scrollViewportToShowTarget } from '@ckeditor/ckeditor5-utils/src/dom/scroll';
import FocusTracker from '@ckeditor/ckeditor5-utils/src/focustracker';
import KeystrokeHandler from '@ckeditor/ckeditor5-utils/src/keystrokehandler';
import '../theme/findReplace.css';
import searchIcon from '../theme/icons/loupe.svg';

const SEARCH_MARKER = 'search';
const CURRENT_SEARCH_MARKER = 'current_search';

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
	init() {
		const editor = this.editor;

		// conversion between model and view
		editor.conversion.for( 'downcast' ).markerToHighlight(
			{ model: SEARCH_MARKER, view: () => ( { classes: 'search-item' } ) } );
		editor.conversion.for( 'downcast' ).markerToHighlight(
			{ model: CURRENT_SEARCH_MARKER, view: () => ( { classes: 'current', priority: 99 } ) } );

		// Setup `findReplace` plugin button.
		editor.ui.componentFactory.add( 'findReplace', locale => {
			const dropdown = createDropdown( locale );
			const t = editor.t;
			this.findInput = new LabeledFieldView( this.locale, createLabeledInputText );
			const inputField = this.findInput.fieldView;
			inputField.placeholder = t( 'Enter: next; Shift+Enter: previous' );
			this.findInput.label = t( 'Find' );

			this.replaceInput = new LabeledFieldView( this.locale, createLabeledInputText );
			const replaceField = this.replaceInput.fieldView;
			replaceField.placeholder = t( 'Enter: replace; Ctrl+Enter: all' );
			this.replaceInput.label = t( 'Replace' );
			this._setUpDropdown( dropdown, this.findInput, this.replaceInput, editor );

			return dropdown;
		} );
	}

	/**
	 * Creates a button view.
	 *
	 * @private
	 * @param {String} label The button label.
	 * @param {String} icon The button icon.
	 * @param {String} className The additional button CSS class name.
	 * @param {String} [eventName] An event name that the `ButtonView#execute` event will be delegated to.
	 * @returns {module:ui/button/buttonview~ButtonView} The button view instance.
	 */
	_createButton( label, eventName ) {
		const button = new ButtonView( this.locale );

		button.set( {
			label,
			withText: true,
			tooltip: false
		} );

		if ( eventName ) {
			button.delegate( 'execute' ).to( this, eventName );
		}

		return button;
	}

	_setUpDropdown( dropdown, findField, replaceField ) {
		const editor = this.editor;
		const t = editor.t;
		const button = dropdown.buttonView;

		addToolbarToDropdown( dropdown, [ findField ] );
		addToolbarToDropdown( dropdown, [ replaceField ] );

		const keystrokes = new KeystrokeHandler();
		keystrokes.listenTo( findField.fieldView.element );
		const findItems = data => { this._find( findField, 1 ); data.preventDefault(); };
		const findItemsBackwards = data => { this._find( findField, -1 ); data.preventDefault(); };
		keystrokes.set( 'enter', findItems, { priority: 'highest' } );
		keystrokes.set( 'shift+enter', findItemsBackwards, { priority: 'highest' } );

		const keystrokesReplace = new KeystrokeHandler();
		keystrokesReplace.listenTo( replaceField.fieldView.element );
		const replaceItems = data => { this._replace( findField, replaceField ); data.preventDefault(); };
		const replaceAllItems = data => { this._replaceAll( findField, replaceField ); data.preventDefault(); };
		keystrokesReplace.set( 'enter', replaceItems, { priority: 'highest' } );
		keystrokesReplace.set( 'ctrl+enter', replaceAllItems, { priority: 'highest' } );

		this.replaceButton = this._createButton( t( 'Replace' ) );
		this.replaceAllButton = this._createButton( t( 'Replace all' ) );

		this.previousButton = this._createButton( t( 'Previous' ) );
		this.nextButton = this._createButton( t( 'Next' ) );

		this.listenTo( this.nextButton, 'execute', () => this._find( findField, 1 ) );
		this.listenTo( this.previousButton, 'execute', () => this._find( findField, -1 ) );
		this.listenTo( this.replaceButton, 'execute', () => this._replace( findField, replaceField ) );
		this.listenTo( this.replaceAllButton, 'execute', () => this._replaceAll( findField, replaceField ) );

		addToolbarToDropdown( dropdown,
			[ 	this.replaceButton,
				this.replaceAllButton,
				this.previousButton,
				this.nextButton
			]
		);

		/**
		 * Tracks information about DOM focus in the form.
		 *
		 * @readonly
		 * @member {module:utils/focustracker~FocusTracker}
		 */
		this.focusTracker = new FocusTracker();

		/**
		 * A collection of views that can be focused in the form.
		 *
		 * @readonly
		 * @protected
		 * @member {module:ui/viewcollection~ViewCollection}
		 */
		this._focusables = new ViewCollection();

		/**
		 * An instance of the {@link module:utils/keystrokehandler~KeystrokeHandler}.
		 *
		 * @readonly
		 * @member {module:utils/keystrokehandler~KeystrokeHandler}
		 */
		this.keystrokes = new KeystrokeHandler();

		/**
		 * Helps cycling over {@link #_focusables} in the form.
		 *
		 * @readonly
		 * @protected
		 * @member {module:ui/focuscycler~FocusCycler}
		 */
		this._focusCycler = new FocusCycler( {
			focusables: this._focusables,
			focusTracker: this.focusTracker,
			keystrokeHandler: this.keystrokes,
			actions: {
				// Navigate form fields backwards using the Shift + Tab keystroke.
				focusPrevious: 'shift + tab',
				// Navigate form fields forwards using the Tab key.
				focusNext: 'tab'
			}
		} );

		this._addTabSupport( findField );
		this._addTabSupport( replaceField );
		this._addTabSupport( this.replaceButton );
		this._addTabSupport( this.replaceAllButton );
		this._addTabSupport( this.previousButton );
		this._addTabSupport( this.nextButton );

		button.set( {
			label: t( 'Find and replace' ),
			icon: searchIcon,
			tooltip: true,
			keystroke: 'Ctrl+F'
		} );

		editor.keystrokes.set( 'Ctrl+F', ( keyEvtData, cancel ) => {
			button.set( 'isOn', true );
			dropdown.set( 'isOpen', true );
			findField.focus();
			cancel();
		} );

		// Note: Use the low priority to make sure the following listener starts working after the
		// default action of the drop-down is executed (i.e. the panel showed up). Otherwise, the
		// invisible form/input cannot be focused/selected.
		button.on( 'open', () => {
			findField.focus();
		}, { priority: 'low' } );

		// prevents the dropdown of closing on execute, since the user might want to keep searching or replacing text
		dropdown.off( 'execute' );

		// remove search markers when the search bar is closed
		dropdown.on( 'change:isOpen', () => {
			if ( !dropdown.isOpen ) {
				this._resetStatus();
				editor.editing.view.focus();
			}
		} );

		dropdown.on( 'cancel', () => closeUI() );
		function closeUI() {
			editor.editing.view.focus();
			dropdown.isOpen = false;
		}
	}

	_addTabSupport( object ) {
		// Register the view as focusable.
		this._focusables.add( object );
		// Register the view in the focus tracker.
		this.focusTracker.add( object.element );
		this.keystrokes.listenTo( object.element );
	}

	_isSameSearch( findField, markers ) {
		const searchTerm = findField.fieldView.element.value;

		const firstMarker = markers[ 0 ];
		// search:searchTerm:counter
		const term = ( firstMarker && firstMarker.name ) ? firstMarker.name.split( ':' )[ 1 ] : '';
		const isSameSearch = term === searchTerm;
		return isSameSearch;
	}

	_find( findField, increment ) {
		const searchTerm = findField.fieldView.element.value;
		const model = this.editor.model;
		let markers = Array.from( model.markers.getMarkersGroup( SEARCH_MARKER ) );

		if ( this._isSameSearch( findField, markers ) ) {
			// loop through the items
			this.currentSearchIndex = ( this.currentSearchIndex + markers.length + increment ) % markers.length;
		}
		else {
			this._resetStatus();
			// Create a range spanning over the entire root content:
			const range = model.createRangeIn( model.document.getRoot() );
			let counter = 0;
			model.change( writer => {
				// Iterate over all items in this range:
				for ( const value of range.getWalker() ) {
					const textNode = value.item.textNode;
					if ( textNode ) {
						const text = value.item.data;
						const indices = getIndicesOf( searchTerm, text, false );
						for ( const index of indices ) {
							const label = SEARCH_MARKER + ':' + searchTerm + ':' + counter++;
							const startIndex = textNode.startOffset + index;
							const start = writer.createPositionAt( textNode.parent, startIndex );
							const end = writer.createPositionAt( textNode.parent, startIndex + searchTerm.length );
							const range = writer.createRange( start, end );
							writer.addMarker( label, { range, usingOperation: false } );
						}
					}
				}
				// update markers variable after search
				markers = Array.from( model.markers.getMarkersGroup( SEARCH_MARKER ) );
			} );
			this.currentSearchIndex = 0;
		}
		const currentMarker = markers[ this.currentSearchIndex ];
		this._scrollTo( currentMarker );
		const t = this.editor.t;
		if ( markers && markers.length && markers.length > 0 ) {
			findField.infoText = this.currentSearchIndex + 1 + t( ' of ' ) + markers.length;
		} else {
			findField.infoText = t( 'Not found' );
		}
		return currentMarker;
	}

	_scrollTo( marker ) {
		const editor = this.editor;
		if ( marker ) {
			editor.model.change( writer => {
				this._removeCurrentSearchMarker( writer );
				this.currentSearchMarker = writer.addMarker( CURRENT_SEARCH_MARKER,
					{ range: marker.getRange(), usingOperation: false } );
			} );
			const viewRange = editor.editing.mapper.toViewRange( marker.getRange() );
			const domRange = editor.editing.view.domConverter.viewRangeToDom( viewRange );
			scrollViewportToShowTarget( { target: domRange, viewportOffset: 130 } );
		}
	}

	_resetStatus() {
		this.findInput.infoText = undefined;
		this.replaceInput.infoText = undefined;
		this.currentSearchIndex = 0;
		const model = this.editor.model;
		model.change( writer => {
			for ( const searchMarker of model.markers.getMarkersGroup( SEARCH_MARKER ) ) {
				writer.removeMarker( searchMarker );
			}
			this._removeCurrentSearchMarker( writer );
		} );
	}

	_removeCurrentSearchMarker( writer ) {
		if ( this.currentSearchMarker ) {
			writer.removeMarker( this.currentSearchMarker );
			this.currentSearchMarker = undefined;
		}
	}

	_replace( findField, replaceField ) {
		const model = this.editor.model;
		const markers = Array.from( model.markers.getMarkersGroup( SEARCH_MARKER ) );
		const sameSearch = this._isSameSearch( findField, markers );
		const currentMarker = sameSearch ? markers[ this.currentSearchIndex ] : this._find( findField, 1 );
		const replaceBy = replaceField.fieldView.element.value;
		if ( currentMarker && currentMarker.getRange ) {
			model.change( writer => {
				model.insertContent( writer.createText( replaceBy ), currentMarker.getRange() );
				writer.removeMarker( currentMarker );
				this._removeCurrentSearchMarker( writer );
			} );
			// refresh the items...
			this._find( findField, 0 );
		}
	}

	_replaceAll( findField, replaceField ) {
		const model = this.editor.model;
		const t = this.editor.t;
		// fires the find operation to make sure the search is loaded before replace
		this._find( findField, 1 );
		const replaceBy = replaceField.fieldView.element.value;
		model.change( writer => {
			const markers = model.markers.getMarkersGroup( SEARCH_MARKER );
			let size = 0;
			for ( const marker of markers ) {
				model.insertContent( writer.createText( replaceBy ), marker.getRange() );
				size++;
			}
			this._resetStatus();
			replaceField.infoText = t( 'Replaced ' ) + size + t( ' times' );
		} );
	}
}
function getIndicesOf( searchStr, str, caseSensitive ) {
	const searchStrLen = searchStr.length;
	if ( searchStrLen === 0 ) {
		return [];
	}
	let startIndex = 0;
	let index;
	const indices = [];
	if ( !caseSensitive ) {
		str = str.toLowerCase();
		searchStr = searchStr.toLowerCase();
	}
	while ( ( index = str.indexOf( searchStr, startIndex ) ) > -1 ) {
		indices.push( index );
		startIndex = index + searchStrLen;
	}
	return indices;
}
