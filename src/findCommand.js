import { scrollViewportToShowTarget } from '@ckeditor/ckeditor5-utils/src/dom/scroll';
import { Command } from 'ckeditor5/src/core';
import { CURRENT_SEARCH_MARKER, isSameSearch, removeCurrentSearchMarker, removeSearchMarkers, SEARCH_MARKER } from './utils';

const DEFAULT_OPTIONS = {
	findText: '',
	increment: 1,
	replaceText: '',
	replaceAll: false
};

export default class FindCommand extends Command {
    constructor(editor) {
        super(editor);
        this.currentSearchIndex = 0;
    }
    execute( userOptions ) {
		if ( !userOptions.findText ) {
			return;
		}
		const options = { ...DEFAULT_OPTIONS, ...userOptions };
		if ( options.replaceText ) {
			if ( options.replaceAll ) {
				return this._replaceAll( options.findText, options.replaceText );
			}
			return this._replace( options.findText, options.replaceText );
		}
		return this._find( options.findText, options.increment );
    }

    _find(searchText, increment){
    	const editor = this.editor;
    	const model = editor.model;
    	let markers = Array.from( model.markers.getMarkersGroup( SEARCH_MARKER ) );

		if ( isSameSearch( searchText, markers ) ) {
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
						const indices = getIndicesOf( searchText, text, false );
						for ( const index of indices ) {
							const label = SEARCH_MARKER + ':' + searchText + ':' + counter++;
							const startIndex = textNode.startOffset + index;
							const start = writer.createPositionAt( textNode.parent, startIndex );
							const end = writer.createPositionAt( textNode.parent, startIndex + searchText.length );
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
		return {
			currentMarker,
			markers,
			currentIndex:this.currentSearchIndex,
			total: markers.length,
		};
    }

    _replace(findText,replaceText ) {
		const model = this.editor.model;
		const markers = Array.from( model.markers.getMarkersGroup( SEARCH_MARKER ) );
		const sameSearch = this._isSameSearch( findText, markers );
		const currentMarker = sameSearch ? markers[ this.currentSearchIndex ] : this._find( findText, 1 );

		if ( currentMarker && currentMarker.getRange ) {
			model.change( writer => {
				model.insertContent( writer.createText( replaceText ), currentMarker.getRange() );
				writer.removeMarker( currentMarker );
				removeCurrentSearchMarker( model, writer );
			} );
			// refresh the items...
			return this._find( findText, 0 );
		}
	}

	_replaceAll( findText, replaceText ) {
		const model = this.editor.model;
		// fires the find operation to make sure the search is loaded before replace
		this._find( findText, 1 );

		model.change( writer => {
			const markers = model.markers.getMarkersGroup( SEARCH_MARKER );
			let size = 0;
			for ( const marker of markers ) {
				model.insertContent( writer.createText( replaceText ), marker.getRange() );
				size++;
			}
			this._resetStatus();

		} );
		return {}
	}

	_isSameSearch( searchText, markers ) {
		const firstMarker = markers[ 0 ];
		// search:searchTerm:counter
		const term = ( firstMarker && firstMarker.name ) ? firstMarker.name.split( ':' )[ 1 ] : '';
		const isSameSearch = term === searchText;
		return isSameSearch;
	}

    _scrollTo( marker ) {
		const editor = this.editor;
		if ( marker ) {
			editor.model.change( writer => {
				removeCurrentSearchMarker( model, writer );
				writer.addMarker( CURRENT_SEARCH_MARKER,
					{ range: marker.getRange(), usingOperation: false } );
			} );
			const viewRange = editor.editing.mapper.toViewRange( marker.getRange() );
			const domRange = editor.editing.view.domConverter.viewRangeToDom( viewRange );
			scrollViewportToShowTarget( { target: domRange, viewportOffset: 130 } );
		}
	}

	_resetStatus() {
		this.currentSearchIndex = 0;
		removeSearchMarkers( this.editor.model );
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
