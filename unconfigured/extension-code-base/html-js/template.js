/**
 * @fileOverview Companion script for ../html/template.html. 
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

var CROWDLOGGER;

/**
 * Called when the page loads, after the CROWDLOGGER object is found.
 * Can be used (as below) to check if the init_elm has had any text
 * or html added within it -- this is a sign that the page has been
 * loaded already, and thus no initialization needs to take place.
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