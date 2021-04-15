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
 * 
 * @param {*} child model element
 * @param {string} searchText searchText
 * @param {number} startIndex the index of text2 to start search
 * @param {function} callBack the callBack func when complete a match
 */
 export function searchSameText(child,searchText,startIndex,callBack){
    let matchIndex = startIndex;
    let start = 0;
    const text = child.data;
    for(let i=0;i<text.length;i++){
        // match over
        if(!searchText[matchIndex]){
            callBack && callBack(start,i);
            matchIndex = 0;
        }
        if(text[i] === searchText[matchIndex]){
            if(matchIndex == 0) start = i;
            if(i<text.length-1){
                matchIndex++;
            }else{
                return matchIndex;
            }          
        }else{
            start = i;
            matchIndex = 0;
        }
    }
}
