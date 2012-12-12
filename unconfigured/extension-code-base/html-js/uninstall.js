/**
 * @fileOverview Companion script for ../html/uninstall.html. 
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */


jQuery(document).ready(function(){
    add_listeners();
});

function add_listeners(){
    CROWDLOGGER.uninstall.user_response( document, window );
}
