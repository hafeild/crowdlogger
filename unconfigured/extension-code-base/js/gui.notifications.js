/**
 * @fileOverview Provides functions for presenting notifications to the user.<p>
 * 
 * See CROWDLOGGER.gui.notifications namespace.<p>
 *
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */


if( CROWDLOGGER.gui.notifications === undefined ){


/**
 * @namespace Provides functions for presenting notifications to the user.<p>
 */
CROWDLOGGER.gui.notifications = {};

CROWDLOGGER.gui.notifications.low_alert = {
    logging_on_class: "crowdlogger-logging-on_low_alert-button",
    logging_off_class: "crowdlogger-logging-off_low_alert-button",
    status_page_class: "crowdlogger-dynamic-highlight-menu-item-end"
};

CROWDLOGGER.gui.notifications.high_alert = {
    logging_on_class: "crowdlogger-logging-on_high_alert-button",
    logging_off_class: "crowdlogger-logging-off_high_alert-button",
    status_page_class: "crowdlogger-dynamic-highlight-menu-item-end"
};


/**
 * Modifies the pause/play icon to display the current alert level, using the
 * given message as the hover text. Valid alert levels:
 *
 * <ul>
 *      <li>none</li>
 *      <li>low</li>
 *      <li>high</li>
 * </ul>
 * 
 * @name CROWDLOGGER.gui.notifications.notify
 * @function
 *
 * @param {string} alert_level The alert level. See above for current valid
 *      options.
 */
CROWDLOGGER.gui.notifications.init = function(){
    var notify_function;
    var notification_image_name = CROWDLOGGER.preferences.get_char_pref(
        'notification_image_name', 'notification.png' );
    var extension_prefix = CROWDLOGGER.version.info.get_extension_img_prefix();
    var notification_image_url = extension_prefix + notification_image_name; 


    // The new version of notification will be to simply change the icon to
    // one of the valid statuses.
    
    CROWDLOGGER.gui.notifications.notify = function( alert_level, hover_text ){
        var alert_data;
        if( alert_level === 'high' ){
            alert_data = CROWDLOGGER.gui.notifications.high_alert;
        } else if( alert_level === 'low' ){
            alert_data = CROWDLOGGER.gui.notifications.low_alert;
        } else {
            CROWDLOGGER.gui.notifications.un_notify();
            return;
        }

        CROWDLOGGER.gui.buttons.current.logging_on_class = 
            alert_data.logging_on_class;
        CROWDLOGGER.gui.buttons.current.logging_off_class = 
            alert_data.logging_off_class;
        CROWDLOGGER.gui.buttons.current.status_page_class = 
            alert_data.status_page_class;
        CROWDLOGGER.gui.buttons.current.logging_on_hover_text = hover_text;
        CROWDLOGGER.gui.buttons.current.logging_off_hover_text = hover_text;

        CROWDLOGGER.gui.buttons.update_logging_buttons(); 
            
    };

    CROWDLOGGER.gui.notifications.un_notify = function(){
        // Copy the defaults.
        var x;
        for( x in CROWDLOGGER.gui.buttons.defaults ) {
            CROWDLOGGER.gui.buttons.current[x] = 
                CROWDLOGGER.gui.buttons.defaults[x];
        }
        CROWDLOGGER.gui.buttons.update_logging_buttons();
    };
};

} // END CROWDLOGGER.gui.notifications NAMESPACE
