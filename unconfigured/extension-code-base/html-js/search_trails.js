/**
 * @fileOverview Companion script for ../html/search_trails.html. 
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
    var init_elm = document.getElementById( "init" );
    if( init_elm ) {
        if( init_elm.innerHTML === "" ){
            CROWDLOGGER.gui.tools.diplay_search_trails( document );
        }
    }
}

/**
 * Refreshes the contents of the page.
 */
function refresh_page(){
    CROWDLOGGER.gui.tools.diplay_search_trails( document );
}

// Initialize the search for the CROWDLOGGER variable.
init_crowdlogger();