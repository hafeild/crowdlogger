/**
 * @fileOverview Companion script for ../html/preferences.html. 
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

// Add click listeners to the buttons.
function add_listeners() {
    jQuery('#save_button').click(function(){
        CROWDLOGGER.gui.preferences.submit_preferences( document ); 
        return false;
    });

    jQuery('#save_and_close_button').click(function(){
        CROWDLOGGER.gui.preferences.submit_preferences( document, window ); 
        return false;
    });

}

// Checks if this page has been initialized yet.
function check_if_initialized(){
    var init_elm = document.getElementById( "init" );
    if( init_elm && init_elm.innerHTML === "" ){
        CROWDLOGGER.gui.preferences.refresh_preference_page( document );
    }
}

// Initialize the search for the CROWDLOGGER variable.
init_crowdlogger();
