import InputTextView from '@ckeditor/ckeditor5-ui/src/inputtext/inputtextview';

export const SEARCH_MARKER = 'search';
export const CURRENT_SEARCH_MARKER = 'current_search';

export function isSameSearch( searchText, markers ) {
    const firstMarker = markers[ 0 ];
    // search:searchTerm:counter
    const term = ( firstMarker && firstMarker.name ) ? firstMarker.name.split( ':' )[ 1 ] : '';
    return term === searchText;
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
export function getText( node ) {
    let str = '';
    if ( node.is( 'text' ) || node.is( '$text' ) ) {
        str += node.data;
    } else {
        for ( const child of node.getChildren() ) {
            str += getText( child );
        }
    }
    return str;
}

export function changeAttributes( fieldView, newAttributes ) {
    newAttributes.attributes = { ...fieldView.template.attributes, ...newAttributes.attributes };
    const checkboxTemplate = { ... fieldView.template, ...newAttributes };
    fieldView.setTemplate( checkboxTemplate );
}

export function createLabeledCheckbox( labeledFieldView, viewUid, statusUid ) {
    const inputView = new InputTextView( labeledFieldView.locale );
    const bind = inputView.bindTemplate;
    const novoTemp = {
        attributes: {
            type: 'checkbox',
            class: [
                'ck',
                'ck-input',
                bind.if( 'isFocused', 'ck-input_focused' ),
                bind.if( 'hasError', 'ck-error' )
            ]
        }
    };
    changeAttributes( inputView, novoTemp );
    inputView.set( {
        id: viewUid,
        ariaDescribedById: statusUid
    } );

    inputView.bind( 'isReadOnly' ).to( labeledFieldView, 'isEnabled', value => !value );
    inputView.bind( 'hasError' ).to( labeledFieldView, 'errorText', value => !!value );

    labeledFieldView.bind( 'isEmpty', 'isFocused', 'placeholder' ).to( inputView );

    return inputView;
}
