import { scrollViewportToShowTarget } from '@ckeditor/ckeditor5-utils/src/dom/scroll';
import Command from '@ckeditor/ckeditor5-core/src/command';
import { CURRENT_SEARCH_MARKER, isSameSearch, removeCurrentSearchMarker, clearSearchMarkers, SEARCH_MARKER } from './utils';

const DEFAULT_OPTIONS = {
    findText: '',
    matchCase: false,
    increment: 1,
    replaceText: '',
    replaceAll: false
};

export default class FindCommand extends Command {
    constructor( editor ) {
        super( editor );
        this.currentSearchIndex = 0;
        this.lastUsedOptions = { ...DEFAULT_OPTIONS };
        this.isSameSearch = false;
    }

    execute( userOptions ) {
        if ( !userOptions.findText ) {
            return;
        }
        const options = { ...DEFAULT_OPTIONS, ...userOptions };
        // any other property is needed? I do not think so. check better way. maybe use lodash?
        this.isSameSearch = options.matchCase === this.lastUsedOptions.matchCase && options.findText === this.lastUsedOptions.findText;
        this.lastUsedOptions = { ...options };
        if ( options.replaceText ) {
            if ( options.replaceAll ) {
                return this._replaceAll( options.findText, options.replaceText, options.matchCase );
            }
            return this._replace( options.findText, options.replaceText, options.increment, options.matchCase );
        }
        return this._find( options );
    }

    /**
     * @param options {{findText: string, matchCase: boolean, increment: number}}
     * @returns {{total: number, markers: [], currentIndex: number, currentMarker: unknown}}
     * @private
     */
    _find( { findText, increment, matchCase } ) {
        const model = this.editor.model;
        let searchMarkers = Array.from( model.markers.getMarkersGroup( SEARCH_MARKER ) );

        if ( this.isSameSearch && isSameSearch( findText, searchMarkers ) ) {
            // go to next/previous item. loop through the items
            this.currentSearchIndex = Math.abs( this.currentSearchIndex + searchMarkers.length + increment ) % searchMarkers.length;
        } else {
            searchMarkers = this.performSearch( findText, matchCase, searchMarkers );
        }

        const currentMarker = searchMarkers[ this.currentSearchIndex ];
        if ( currentMarker ) {
            model.change( writer => {
                removeCurrentSearchMarker( model, writer );
                writer.addMarker( CURRENT_SEARCH_MARKER,
                    { range: currentMarker.getRange(), usingOperation: false } );
            } );
            this._scrollTo( currentMarker );
        }
        return {
            currentMarker,
            markers: searchMarkers,
            currentIndex: this.currentSearchIndex,
            total: searchMarkers.length
        };
    }

    performSearch( searchText, matchCase, markers ) {
        const model = this.editor.model;
        this._resetStatus();
        // Create a range spanning over the entire root content:
        const documentRange = model.createRangeIn( model.document.getRoot() );
        let counter = 0;
        model.change( writer => {
            let textNodeStartIndex = undefined;
            let text = '';
            for ( const value of documentRange.getWalker() ) {
                let item = value.item;
                const textNode = item.textNode;
                if ( textNode && item.is( '$textProxy' ) ) {
                    if ( !textNodeStartIndex ) {
                        textNodeStartIndex = textNode;
                    }
                    text += item.data;
                } else if ( textNodeStartIndex ) {
                    // as we found a non text node, now we perform the search and create highlight markers
                    const indices = getIndicesOf( searchText, text, matchCase );
                    const { parent, startOffset } = textNodeStartIndex;
                    for ( const index of indices ) {
                        const label = SEARCH_MARKER + ':' + searchText + ':' + counter++;
                        const start = writer.createPositionAt( parent, index + startOffset );
                        const end = writer.createPositionAt( parent, index + startOffset + searchText.length );
                        const range = writer.createRange( start, end );
                        writer.addMarker( label, { range, usingOperation: false } );
                    }
                    // clears context to continue the search
                    textNodeStartIndex = undefined;
                    text = '';
                }
            }
            // update markers variable after search
            markers = Array.from( model.markers.getMarkersGroup( SEARCH_MARKER ) );
        } );
        this.currentSearchIndex = 0;
        return markers;
    }

    _replace( findText, replaceText, increment , matchCase ) {
        const model = this.editor.model;
        const markers = Array.from( model.markers.getMarkersGroup( SEARCH_MARKER ) );
        const sameSearch = this.isSameSearch && isSameSearch( findText, markers );
        const currentMarker = markers[ this.currentSearchIndex ];
        if ( sameSearch && currentMarker && currentMarker.getRange ) {
            model.change( writer => {
                model.insertContent( writer.createText( replaceText ), currentMarker.getRange() );
                writer.removeMarker( currentMarker );
            } );
            // at each replacement, we have one less to search, so we need to decrease 1
            increment = increment > 0 ? increment - 1 : increment;
            // refresh the items...
            return this._find( { findText, increment, matchCase }  );
        } else {
            return this._find( { findText, increment: 1, matchCase } );
        }
    }

    _replaceAll( findText, replaceText, matchCase ) {
        const model = this.editor.model;
        // fires the find operation to make sure we have markers replace all
        const { markers } = this._find( { findText, increment: 1, matchCase } );
        const total = markers.length;
        model.change( writer => {
            for ( const marker of markers ) {
                model.insertContent( writer.createText( replaceText ), marker.getRange() );
            }
            this._resetStatus();
        } );
        return { total };
    }

    _scrollTo( marker ) {
        const editor = this.editor;
        if ( marker ) {
            const viewRange = editor.editing.mapper.toViewRange( marker.getRange() );
            const domRange = editor.editing.view.domConverter.viewRangeToDom( viewRange );
            scrollViewportToShowTarget( { target: domRange, viewportOffset: 130 } );
        }
    }

    _resetStatus() {
        this.currentSearchIndex = 0;
        clearSearchMarkers( this.editor.model );
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
