import { scrollViewportToShowTarget } from '@ckeditor/ckeditor5-utils/src/dom/scroll';
import Command from '@ckeditor/ckeditor5-core/src/command';
import { CURRENT_SEARCH_MARKER, getText, isSameSearch, removeCurrentSearchMarker, removeSearchMarkers, SEARCH_MARKER } from './utils';

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
        return this._find( options.findText, options.increment, options.matchCase );
    }

    /**
     *
     * @param searchText {string}
     * @param increment {number}
     * @param matchCase {boolean}
     * @returns {{total: number, markers: any[], currentIndex: number, currentMarker: any}}
     * @private
     */
    _find( searchText, increment, matchCase ) {
        const editor = this.editor;
        const model = editor.model;
        let markers = Array.from( model.markers.getMarkersGroup( SEARCH_MARKER ) );

        if ( this.isSameSearch && isSameSearch( searchText, markers ) ) {
            // loop through the items
            this.currentSearchIndex = Math.abs( this.currentSearchIndex + markers.length + increment ) % markers.length;
        }
        else {
            this._resetStatus();
            const root = model.document.getRoot();

            let counter = 0;
            model.change( writer => {
                for ( const element of root.getChildren() ) {
                    getText( element, ( textNode ) => {
                        // get correct position of inline widget
                        const { parent, startOffset, data } = textNode;
                        const indices = getIndicesOf( searchText, data, matchCase );
                        for ( const index of indices ) {
                            const label = SEARCH_MARKER + ':' + searchText + ':' + counter++;
                            const start = writer.createPositionAt( parent, index + startOffset );
                            const end = writer.createPositionAt( parent, index + startOffset + searchText.length );
                            const range = writer.createRange( start, end );
                            writer.addMarker( label, { range, usingOperation: false } );
                        }
                    });
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
            currentIndex: this.currentSearchIndex,
            total: markers.length
        };
    }

    _replace( findText, replaceText, increment = 0, matchCase ) {
        const model = this.editor.model;
        const markers = Array.from( model.markers.getMarkersGroup( SEARCH_MARKER ) );
        const sameSearch = this.isSameSearch && isSameSearch( findText, markers );
        const currentMarker = markers[ this.currentSearchIndex ];
        if ( sameSearch && currentMarker && currentMarker.getRange ) {
            model.change( writer => {
                model.insertContent( writer.createText( replaceText ), currentMarker.getRange() );
                writer.removeMarker( currentMarker );
                removeCurrentSearchMarker( model, writer );
            } );
            // we need this as positive number will jump as replace reduce the number of occurrences of the searched term
            increment = increment > 0 ? increment - 1 : increment;
            // refresh the items...
            return this._find( findText, increment, matchCase );
        } else {
            return this._find( findText, 1, matchCase );
        }
    }

    _replaceAll( findText, replaceText, matchCase ) {
        const model = this.editor.model;
        // fires the find operation to make sure the search is loaded before replace
        this._find( findText, 1, matchCase );

        let total = 0;
        model.change( writer => {
            const markers = model.markers.getMarkersGroup( SEARCH_MARKER );
            for ( const marker of markers ) {
                model.insertContent( writer.createText( replaceText ), marker.getRange() );
                total++;
            }
            this._resetStatus();
        } );
        return { total };
    }

    _scrollTo( marker ) {
        const editor = this.editor;
        if ( marker ) {
            editor.model.change( writer => {
                removeCurrentSearchMarker( editor.model, writer );
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
