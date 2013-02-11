/**
 * @fileOverview Companion script for ../html/dev_tools.html. 
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

/**
 * Places listeners on the various buttons.
 */
function add_listeners(){
    jQuery('#passphrase_save_button').click(function(){
        CROWDLOGGER.gui.tools.dev.set_passphrase(jQuery('#pass_phrase').val()); 
        return false;
    });

    jQuery('#clear_experiments').click(function(){
        CROWDLOGGER.gui.tools.dev.clear_experiments();
        return false;
    });

    jQuery('#check_for_experiments').click(function(){
        CROWDLOGGER.gui.tools.dev.check_for_experiments();
        return false;
    });

    jQuery('#clear_and_check_experiments').click(function(){
        CROWDLOGGER.gui.tools.dev.clear_experiments();
        CROWDLOGGER.gui.tools.dev.check_for_experiments();
        return false;
    });        

    jQuery('#load-clrm').click(function(){
        CROWDLOGGER.debug.log('Retrieving JS from '+ jQuery('#clrm-url').val());
        CROWDLOGGER.api.cli.base.loadCLRMFromURL( jQuery('#clrm-url').val() );
        return false;
    });
}

/**
 * Called when the page loads, after the CROWDLOGGER object is found.
 * Can be used (as below) to check if the init_elm has had any text
 * or html added within it -- this is a sign that the page has been
 * loaded already, and thus no initialization needs to take place.
 */
function check_if_initialized(){
    //var init_elm = document.getElementById( "init" );
    var init_elm = jQuery("#init");
    if( init_elm.length > 0 ){
        if( init_elm.html() === "" ){
            CROWDLOGGER.gui.tools.dev.populate_page(document);
        }
    }
}

// Initialize the search for the CROWDLOGGER variable.
init_crowdlogger();
