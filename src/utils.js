import InputTextView from '@ckeditor/ckeditor5-ui/src/inputtext/inputtextview';

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
export function getText( node ) {
    let str = '';
    if ( node.is( 'text' ) ) {
        str += node.data;
    } else {
        const children = Array.from( node.getChildren() );
        for ( const child of children ) {
            str += getText( child );
        }
    }
    return str;
}

export function changeAttributes( fieldView, newAttributes ) {
    const attr = { ...fieldView.template['attributes'], ...newAttributes.attributes}
    newAttributes.attributes = attr;
    const checkboxTemplate = {... fieldView.template, ...newAttributes }
    console.info(checkboxTemplate)
    fieldView.setTemplate(checkboxTemplate);
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
            ],
        }
    };
    changeAttributes( inputView, novoTemp);
    // const attr = { ...inputView.template['attributes'], ...novoTemp.attributes}
    // novoTemp.attributes = attr;
    // const checkboxTemplate = {... inputView.template, ...novoTemp }
    // console.info(checkboxTemplate)
    // inputView.setTemplate(checkboxTemplate);
    inputView.set( {
        id: viewUid,
        ariaDescribedById: statusUid
    } );

    inputView.bind( 'isReadOnly' ).to( labeledFieldView, 'isEnabled', value => !value );
    inputView.bind( 'hasError' ).to( labeledFieldView, 'errorText', value => !!value );

    inputView.on( 'input', () => {
        // UX: Make the error text disappear and disable the error indicator as the user
        // starts fixing the errors.
        labeledFieldView.errorText = null;
    } );

    labeledFieldView.bind( 'isEmpty', 'isFocused', 'placeholder' ).to( inputView );

    return inputView;
}
