/**
 * @fileOverview Companion script for ../html/export.html. 
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

// Places listeners on buttons.
function add_listeners(){
    jQuery('.refreshlink a').click(function(){
        refresh_page();
        return false;
    });
}

/**
 * Called when the CROWDLOGGER variable is found. Checks if this page 
 * has been initialized yet.
 */
function check_if_initialized(){
    CROWDLOGGER.gui.tools.export_log( document );
}

/**
 * Refreshes the contents of the page.
 */
function refresh_page(){
    CROWDLOGGER.gui.tools.export_log( document, true );
}

// Initialize the search for the CROWDLOGGER variable.
init_crowdlogger();