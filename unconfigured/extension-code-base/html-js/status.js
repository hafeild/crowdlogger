/**
* @fileOverview Companion script for ../html/status.html. 
* 
* %%VERSION%%
* 
* @author hfeild
* @version %%VERSION%%
*/

var CROWDLOGGER;
var experimentRefreshActivated = false;
var experimentRefreshInterval  = 5 * 1000; // 5 sec.
var experimentElm = undefined;

// On load.
jQuery(document).ready(function(){
    set_click_listeners();
});


function set_click_listeners(){
    jQuery('#refresh_button').click(function(){
        refresh_page();  return false;
    });

    jQuery('.close_button').click(function(){
        window.open('', '_self', ''); window.close(); return false;
    });

    jQuery('#whatsnew').click(function(){return false;});

    jQuery('#search_histogram_button').click(function(){
        CROWDLOGGER.gui.tools.diplay_search_histogram(); return false;
    });

    jQuery('#search_trails_button').click(function(){
        CROWDLOGGER.gui.tools.diplay_search_trails(); return false;
    });

    jQuery('#export_log_button').click(function(){
        CROWDLOGGER.gui.tools.export_log(); return false;
    });

    jQuery('#clear_log_button').click(function(){
        jQuery('#confirm_clear').show();
        jQuery('#cleared').hide();
        return false;
    });

    jQuery('#clear_log_confirm_button').click(function(){
        CROWDLOGGER.io.log.clear_activity_log();
        jQuery('#cleared').show();
        jQuery('#confirm_clear').hide();
        return false;
    });    

    jQuery('#feedback_button').click(function(){
        window.open('%%PING_SERVER_BASE_URL%%/feedback/leaveFeedback.html');
        return false;
    });

    jQuery('#app-library-button').click(function(){
        CROWDLOGGER.clrm.launchCLRMLibraryPage(); 
        return false;
    });
  
}

/**
 * In FF, launches a custom event (crowdlogger_status_page_refresh) that
 * the %%PROJECT_NAME%% extension is listening for. In Chrome, refreshes
 * via the CROWDLOGGER object directly.
 */
function refresh_page(){
    if( CROWDLOGGER !== undefined ){
        CROWDLOGGER.gui.study.pages.refresh_status_page(document);
    }
}

/**
 * Called when the CROWDLOGGER variable has been found. Checks if this 
 * page has been initialized yet.
 */
function check_if_initialized(){
    if( jQuery('#init').html() === '' ){
        CROWDLOGGER.debug.log('Initializing from status.js\n');
        CROWDLOGGER.gui.study.pages.refresh_status_page( document );
    }

    // if( !experimentRefreshActivated ) {
    //     experimentRefreshActivated = true;
    //     refreshExperimentStats();
    // }
}


/**
 * Refreshes just the experiments section, every few seconds.
 */
function refreshExperimentStats() {
    //CROWDLOGGER.debug.log( "In refreshExperimentStats!\n" );

    if( experimentElm === undefined ) {
        experimentElm = jQuery("#experiments")[0];
    }
    CROWDLOGGER.gui.study.pages.populate_experiments_status(
        document, experimentElm ); 

    setTimeout( refreshExperimentStats, experimentRefreshInterval );
}


function refreshLayout(){
    console.log('In refreshLayout');
    var rcol = jQuery('#right-column');
    var lcol = jQuery('#left-column');
    jQuery('.section').each(function(i, elm){
        console.log('-------')
        console.log('rcol.height: '+ rcol.height());
        console.log('lcol.height: '+ lcol.height());
        if( rcol.height() < lcol.height() ){
            jQuery(elm).appendTo(rcol);
        } else {
            jQuery(elm).appendTo(lcol);
        }
    });
}

// Initialize the search for the CROWDLOGGER variable.
init_crowdlogger();
