export const SEARCH_MARKER = 'search';
export const CURRENT_SEARCH_MARKER = 'current_search';

export function isSameSearch( searchText, markers ) {
    const firstMarker = markers[ 0 ];
    // search:searchTerm:counter
    const term = ( firstMarker && firstMarker.name ) ? firstMarker.name.split( ':' )[ 1 ] : '';
    const isSameSearch = term === searchText;
    return isSameSearch;
}

export function removeSearchMarkers( model ) {
    model.change( writer => {
        for ( const searchMarker of model.markers.getMarkersGroup( SEARCH_MARKER ) ) {
            writer.removeMarker( searchMarker );
        }
        removeCurrentSearchMarker( model, writer );
    } );
}

export function removeCurrentSearchMarker( model, writer ) {
    const currentSearchMarker = model.markers.get( CURRENT_SEARCH_MARKER );
    if ( currentSearchMarker ) {
        writer.removeMarker( currentSearchMarker );
    }
}


/**
 * return the whole text of the node without tags
 * @param {*} node model node
 * @returns {string} the whole text of the node
 */
 export function getText(node){
    let str = '';
    if(node.is('text')){
        str += node.data
    }else{
        const children = Array.from(node.getChildren());
        for(const child of children){
            str += getText(child)
        }
    }
    return str
}
