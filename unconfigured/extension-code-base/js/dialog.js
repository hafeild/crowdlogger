/**
 * @fileOverview Contains several functions used to aid in window dialogs
 * (which are simple html files). These include reading parameters passed in
 * via the URL and finding the CROWDLOGGER variable. 
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */


/**
 * Check if we have the CROWDLOGGER object. It will actually keep looking
 * indefinitely. Once found, this function will invoke the check_if_initialized
 * function (if defined) which should be defined in the HTML file importing this
 * script.
 */
function init(){
    // If the current page is being loaded in an iframe, this code will 
    // set the "frame_loaded" variable in the parent's window.
    try{
        //parent.set_frame_loaded( true );
        if( !parent.frame_loaded ){
            parent.frame_loaded = true;
        }
    } catch( e ) {
    }

    // Try to get the CROWDLOGGER object.
    try{
        // Chrome.
        try{
            CROWDLOGGER = chrome.extension.getBackgroundPage().CROWDLOGGER;
        // Firefox.
        } catch (e) {
            CROWDLOGGER = opener.CROWDLOGGER;
        }
    } catch(e){
        if( parent && parent.CROWDLOGGER ){
            CROWDLOGGER = parent.CROWDLOGGER;
        } else {
            setTimeout( init, 20 );
            return false;
        }
    }
  
    if( CROWDLOGGER && check_if_initialized !== undefined ){
        setTimeout( check_if_initialized, 5 );    
    }

    return true;
}

/**
 * Initializes the search for the CROWDLOGGER variable (on the page load).
 */
function init_crowdlogger() {
    // Make sure we have the CROWDLOGGER object.
    jQuery(document).ready( function(){ 
        setTimeout( init, 5 ); 
    })
}


/**
 * Read in the GET arguments. Adapted from:
 * http://www.netlobo.com/url_query_string_javascript.html
 * 
 * @param {string} name The name of the URL argument to extract.
 *
 * @return The value of the given parameter; empty string if the
 *      parameter was not found.
 */
function get_url_param( name ) {
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regex_s = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp( regex_s );
    var results = regex.exec( window.location.href );
    if( results == null ){
        return "";
    } else {
        return unescape(results[1]);
    }
}


/**
 * Hides the element corresponding to the given id.
 *
 * @param {string} id The id of the HTML element to hide.
 *
 * @return <code>true</code> if the element was found and hidden; 
 * <code>false</code> otherwise.
 */
function hide_element( id ) {
    var elm = document.getElementById( id );
    if( elm ) {
        elm.style.display = "none";
        return true;
    } else {
        return false;
    }
}
