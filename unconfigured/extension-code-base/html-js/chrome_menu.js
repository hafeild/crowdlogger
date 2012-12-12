/**
 * @fileOverview Companion script for ../html/chrome_menu.html. 
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

var CROWDLOGGER = chrome.extension.getBackgroundPage().CROWDLOGGER;


jQuery(document).ready(function(){
    // Place listeners.
    jQuery('#crowdlogger-logging-button').click(
        CROWDLOGGER.logging.toggle_logging);

    jQuery('#crowdlogger-registration-launch-button').click(function(){
        CROWDLOGGER.study.launch_registration_dialog(); self.close();
    });

    jQuery('#crowdlogger-refer-a-friend-button').click(function(){
        CROWDLOGGER.study.launch_refer_a_friend_dialog(); self.close();
    });

    jQuery('#crowdlogger-settings-button').click(function(){
        CROWDLOGGER.gui.preferences.launch_preference_dialog(); self.close();
    });

    jQuery('#crowdlogger-show-status-page-button').click(function(){
       CROWDLOGGER.gui.study.pages.launch_status_page(); self.close(); 
    });

    jQuery('#crowdlogger-help-button').click(function(){
        CROWDLOGGER.gui.study.pages.launch_help_page(); self.close();
    });

    jQuery('#crowdlogger-welcome-wizard-button').click(function(){
        CROWDLOGGER.version.util.launch_welcome_page(); self.close();
    });

    jQuery('#crowdlogger-welcome-wizard-button').click(function(){
        CROWDLOGGER.experiments.run_test(); self.close();
    });        
});

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