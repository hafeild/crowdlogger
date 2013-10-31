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

    jQuery('body').on('click', 'li,button,a', function(e){
        switch(e.target.id){
            case 'search_histogram_button':
                CROWDLOGGER.gui.tools.diplay_search_histogram();
                break;
            case 'search_trails_button':
                CROWDLOGGER.gui.tools.diplay_search_trails();
                break;
            case 'export_log_button':
                CROWDLOGGER.gui.tools.export_log();
                break;
            case 'clear_log_button':
                jQuery('#clear_log_confirm_button').show();
                jQuery('#cleared').hide();
                break;
            case 'clear_log_confirm_button':
                CROWDLOGGER.io.log.clear_activity_log();
                jQuery('#cleared').show();
                jQuery('#clear_log_confirm_button').hide();
                break;
            case 'feedback_button':
                window.open(
                    '%%PING_SERVER_BASE_URL%%/feedback/leaveFeedback.html');
                break;
            case 'app-library-button':
                CROWDLOGGER.clrm.launchCLRMLibraryPage();
                break;
            case 'launch_dev_tools':
                CROWDLOGGER.gui.tools.dev.launch();
                break;
            case 'settings_button':
                CROWDLOGGER.gui.preferences.launch_preference_dialog(); 
                break;
            case 'register_button':
                CROWDLOGGER.study.launch_registration_dialog(); 
                break;
            case '':
                return true;
        }
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

/**
 * Re-organizes the sections so they fit nicely into two sections.
 */
function refreshLayout(){
    console.log('In refreshLayout');
    var rcol = jQuery('#right-column');
    var lcol = jQuery('#left-column');

    var sections = jQuery('.section');
    var i = 0;

    // Appends the next section to the shortest column.
    var append = function(){
        if( i < sections.length ){
            if( rcol.height() < lcol.height() ){
                jQuery(sections[i]).appendTo(rcol);
            } else {
                jQuery(sections[i]).appendTo(lcol);
            }
            i++;
            // A little delay just to let the UI update.
            setTimeout(append, 100);
        }
    };

    append();
}

// Initialize the search for the CROWDLOGGER variable.
init_crowdlogger();
