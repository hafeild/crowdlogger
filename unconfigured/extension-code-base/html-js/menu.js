/**
 * @fileOverview Companion script for ../html/menu.html. 
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

var CROWDLOGGER;

try{
    CROWDLOGGER = chrome.extension.getBackgroundPage().CROWDLOGGER;
} catch(e){
    CROWDLOGGER = top.CROWDLOGGER;
}

/**
 * Add listeners and whatnot.
 */
jQuery(document).ready(function(){

    // Update the logging button.
    //CROWDLOGGER.gui.buttons.update_logging_buttons();
    refresh_icon();

    // Place listeners.
    add_listeners();

    // Add the hidden items at the end if we're in developers mode.
    if( CROWDLOGGER.preferences.get_bool_pref('dev_mode', false) ){
        CROWDLOGGER.debug.log('Displaying the dev_mode items in the menu...');
        jQuery('.dev').removeClass('hidden');
    }

    // Re-style the status page button (this class name might be empty).
    jQuery('crowdlogger-show-status-page-button').
        addClass(CROWDLOGGER.gui.buttons.current.status_page_class);

    // In Firefox, the default behavior is for this popup to be loaded once
    // when the window is created. However, to make things simpler and more
    // consistent with Chrome, we will reload the window each time the toolbar
    // button is pressed.
    if( CROWDLOGGER.version.info.is_firefox ){
        var frame = top.document.getElementById('crowdloggertoolbarmenupopup');

        frame.setAttribute('onpopupshown', 
            "document.getElementById('crowdlogger-menu-frame')."+
            "contentWindow.location.reload()");

        // We also need to resize because the popup is kind of small...
        resize();
    }
});

/**
 * Refreshes the logging icon to reflect the current state of logging.
 */
function refresh_icon(){
    var logging_button = jQuery('#crowdlogger-logging-button');
    if( CROWDLOGGER.preferences.get_bool_pref('logging_enabled', false ) ){
        logging_button.addClass('crowdlogger-logging-on-button').
                       removeClass('crowdlogger-logging-off-button');
    } else {
        logging_button.removeClass('crowdlogger-logging-on-button').
                       addClass('crowdlogger-logging-off-button');        
    }
}

/**
 * Resizes the popup as well as the iframe hosting this page. This is meant for
 * Firefox.
 */
var resize = function(){
    var frame = top.document.getElementById('crowdlogger-menu-frame');
    var popup = top.document.getElementById('crowdloggertoolbarmenupopup');

    var height = jQuery('body').outerHeight(true)+30;
    var width = jQuery('body').outerWidth(true);

    CROWDLOGGER.debug.log('Popup dims: '+ height +'x'+ width);

    popup.sizeTo(width, height);
    frame.setAttribute('width', width +'px');
    frame.setAttribute('height', height +'px');
};

/**
 * Places listeners on each of the links.
 */
function add_listeners(){
    jQuery(document).click(function(e){
        switch(e.target.id){
            case 'crowdlogger-logging-button':
                CROWDLOGGER.logging.toggle_logging();
                refresh_icon();
                break;

            case 'crowdlogger-registration-launch-button':
                CROWDLOGGER.study.launch_registration_dialog(); 
                exit(); 
                break;

            case 'crowdlogger-refer-a-friend-button':
                CROWDLOGGER.study.launch_refer_a_friend_dialog(); 
                exit(); 
                break;

            case 'crowdlogger-settings-button':
                CROWDLOGGER.gui.preferences.launch_preference_dialog(); 
                exit(); 
                break;

            case 'crowdlogger-show-status-page-button':
               CROWDLOGGER.gui.study.pages.launch_status_page(); 
               exit();  
                break;

            case 'crowdlogger-help-button':
                CROWDLOGGER.gui.study.pages.launch_help_page(); 
                exit(); 
                break;

            case 'crowdlogger-welcome-wizard-button':
                CROWDLOGGER.version.util.launch_welcome_page(); 
                exit(); 
                break;
        }
    });
}

/**
 * Exits the popup.
 */
function exit(){
    if( CROWDLOGGER.version.info.is_chrome ){
        // In Chrome, we just close the menu.
        self.close();
    } else {
        // In Firefox, we hide the popup in which the menu is loaded.
        top.document.getElementById('crowdloggertoolbarmenupopup').hidePopup();
    }
}