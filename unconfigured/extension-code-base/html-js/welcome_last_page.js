/**
 * @fileOverview Companion script for ../html/welcome_last_page.html. 
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

var CROWDLOGGER;

jQuery(document).ready(function(){
   add_listeners(); 
});

function add_listeners(){
    jQuery('#launch_status_page').click(function(){
        CROWDLOGGER.gui.study.pages.launch_status_page();
        return false;
    });
}

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