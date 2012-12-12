/**
 * @fileOverview Companion script for ../html/welcome_first_page.html. 
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

var CROWDLOGGER;

/**
 * Called when the page loads, after the CROWDLOGGER object is found.
 */
function check_if_initialized(){
    var init_elm = document.getElementById( "init" );
    if( init_elm ){
        if( init_elm.innerHTML === "" ){
        }
    }
}

// Initialize the search for the CROWDLOGGER variable.
init_crowdlogger();