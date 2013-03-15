/**
 * @fileOverview Companion script for ../html/chrome_menu.html. 
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


jQuery(document).ready(function(){
    // Update the logging button.
    //CROWDLOGGER.gui.buttons.update_logging_buttons();
    refresh_icon();

    // Place listeners.
    add_listeners();

    if( CROWDLOGGER.preferences.get_bool_pref('dev_mode', false) ){
        jQuery('.dev').show();
    }

    if( CROWDLOGGER.version.info.is_firefox ){
        parent.frames[0].height = jQuery(document).height();
    }
});

function refresh_icon(){
    var logging_button = jQuery('#crowdlogger-logging-button');
    if( CROWDLOGGER.preferences.get_bool_pref('logging_enabled', false ) ){
        logging_button.addClass('crowdlogger-logging-on-icon').
                       removeClass('crowdlogger-logging-off-icon');
    } else {
        logging_button.removeClass('crowdlogger-logging-on-icon').
                       addClass('crowdlogger-logging-off-icon');        
    }
}

/**
 * Places listeners on each of the links.
 */
function add_listeners(){
    jQuery('#crowdlogger-logging-button').click(function(){
        CROWDLOGGER.logging.toggle_logging();
        refresh_icon();
        return exit();
    });

    jQuery('#crowdlogger-registration-launch-button').click(function(){
        CROWDLOGGER.study.launch_registration_dialog(); return exit();
    });

    jQuery('#crowdlogger-refer-a-friend-button').click(function(){
        CROWDLOGGER.study.launch_refer_a_friend_dialog(); return exit();
    });

    jQuery('#crowdlogger-settings-button').click(function(){
        CROWDLOGGER.gui.preferences.launch_preference_dialog(); return exit();
    });

    jQuery('#crowdlogger-show-status-page-button').click(function(){
       CROWDLOGGER.gui.study.pages.launch_status_page(); return exit(); 
    });

    jQuery('#crowdlogger-help-button').click(function(){
        CROWDLOGGER.gui.study.pages.launch_help_page(); return exit();
    });

    jQuery('#crowdlogger-welcome-wizard-button').click(function(){
        CROWDLOGGER.version.util.launch_welcome_page(); return exit();
    });

    jQuery('#crowdlogger-welcome-wizard-button').click(function(){
        CROWDLOGGER.experiments.run_test(); return exit();
    }); 
}

function clicked( x ) {
    console.log( x );
    // Create a simple text notification:
    var notification = webkitNotifications.createHTMLNotification(
      //'img/pauseLogging.png',  // icon url - can be relative
      //'Test',  // notification title
      'notification.html?message=test+message&title=test+title'  // notification body text
    );
    
    // Then show the notification.
    notification.show();
}          

function store_message(){
    CROWDLOGGER.message = "Hmmm";
}

function display_message(){
    var notification = webkitNotifications.createHTMLNotification(
      '', // Image.
      'Test',  // notification title
      '<a href="http://www.google.com">' + CROWDLOGGER.message  + '</a>'// notification body text
    );
    
    // Then show the notification.
    notification.show();
}

function ext(){
    jQuery('#my_text')[0].value = chrome.extension.getURL("");
}

function exit(){
    if( CROWDLOGGER.version.info.is_chrome ){
        CROWDLOGGER.debug.log('Closing Chrome menu');
        self.close();
    } else {
        CROWDLOGGER.debug.log('Closing Firefox menu');
        parent.close();
    }
}