/**
 * @fileOverview Provides notification setters and unsetters.
 * 
 * See the  CROWDLOGGER.notifications namespace.<p>
 * 
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

if( CROWDLOGGER.notifications === undefined ) {

/**
 * @namespace Provides notification setters and unsetters.
 */
CROWDLOGGER.notifications = {
    new_notifications :     0,
    update_registration :   0,
    register :              0,
    refer_a_friend :        0,
    set_passphrase :        0,
    update_settings :       0,
    unredeemed_raffle_win : 0,
    new_messages :          0,
    extension_update :      0,
    new_experiments :       0,
    consent :               0,
    new_version:            0,
    show_update_message:    false,
};

/**
 * Sets the preference 'registration_dismissed' to the given value.
 *
 * @param {boolean} value  The value to set 'registration_dismissed' to.
 */
CROWDLOGGER.notifications.set_registration_dismissed = function( value ) {
    CROWDLOGGER.preferences.set_bool_pref( "registration_dismissed", value );
};

/**
 * Returns the value of the preference 'registration_dismissed'.
 *
 * @return {boolean} The value of the preference 'registration_dismissed'; if
 *      unset, the default is <tt>false</tt>.
 */
CROWDLOGGER.notifications.registration_dismissed = function() {
    return CROWDLOGGER.preferences.get_bool_pref( 
        "registration_dismissed", false );
};

/**
 * Unsets the given otification (assuming it's a valid notification). This also
 * updates the number of new notifications.
 *
 * @param {string} notification The name of the notification to unset.
 */
CROWDLOGGER.notifications.unset_notification = function( notification ) {
    var notifications = CROWDLOGGER.notifications;

    if( notifications[notification] !== undefined &&
            notifications[notification] > 0 ) {
        notifications.new_notifications = Math.max( 0,
            notifications.new_notifications - notifications[notification] );

        notifications[notification] = 0;
    }

    if( notifications.new_notifications == 0 ) {
        CROWDLOGGER.gui.notifications.un_notify();
    }
};

/**
 * Sets the given notification (assuming it's a valid notification). This also
 * updates the number of new notifications.
 *
 * @param {string} notification The name of the notification to set.
 */
CROWDLOGGER.notifications.set_notification = function( notification ) {
    var notifications = CROWDLOGGER.notifications;

    if( notifications[notification] !== undefined &&
            notifications[notification] == 0 ) {
        notifications.new_notifications++;
        notifications[notification]++;
    }
};

/**
 * Notifies the user that there are important notifications available. 
 * When clicked, the user will be redirected to the extension's status page.
 * @name CROWDLOGGER.notifications.launch_notifications_available_alert
 * @function
 */
CROWDLOGGER.notifications.launch_notification_init = function(){
    var title = "Important notification";
    var message = "There are important notifications available. " +
                "See the status for details.";

    CROWDLOGGER.notifications.launch_notifications_available_alert = function(){
        CROWDLOGGER.gui.notifications.notify( "low", message );
    };
};

} // END CROWDLOGGER.notifications NAMESPACE
