/**
 * @fileOverview Creates a new namespace called CROWDLOGGER.study that contains
 * functions that are related to the study portion of this extension (e.g., the
 * consent form and registration). At some point, some of these functions may 
 * migrate out of this namespace.
 * 
 * See the CROWDLOGGER.study namespace.<p>
 * 
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%% 
 */


if( CROWDLOGGER.study === undefined ){
/**
 * @namespace Contains functions that are related to the study portion of this
 * extension (e.g., the consent form and registration).
 */
CROWDLOGGER.study = {};

/**
 * Initializes the checking process for:
 * <ul>
 *      <li>new experiments</li>
 *      <li>new versions of %%PROJECT_NAME%%</li>
 *      <li>raffle wins</li>
 *      <li>new messages</li>
 *      <li>notifications</li>
 * </ul>
 */
CROWDLOGGER.study.init_checks = function() {

    //B_DEBUG
    CROWDLOGGER.debug.log( "Setting timeout to check for new experiments...\n" );
    //E_DEBUG

    // Set a timeout frequency to check for new experiments.
    // setTimeout( function(){
    //     CROWDLOGGER.experiments.check_for_new_experiments(
    //         // Check every x minutes (defaults to 30 minutes).
    //         CROWDLOGGER.preferences.get_int_pref(
    //             "experiment_update_interval", 30*60*1000 ),
    //         // Says to keep checking.
    //         true,
    //         // Figure out what to do once we know we have experiments.
    //         CROWDLOGGER.experiments.handle_new_experiments,
    //         // If no experiments, unset the experiment notification.
    //         CROWDLOGGER.notifications.unset_notification("new_experiments")
    //     );
    // }, 50000 );



    //B_DEBUG
    CROWDLOGGER.debug.log( 
        "Setting timeout to check for a new extension version...\n" );
    //E_DEBUG

    // Check if there is a new version of the extension available.
    setTimeout(
        CROWDLOGGER.version.util.check_for_new_extension_version, 6000 );

    //B_DEBUG
    CROWDLOGGER.debug.log( "Checking version...\n" );
    //E_DEBUG

    // Check if this is a new version; display welcome if necessary.
    // Takes necessary steps if it is.
    setTimeout(
        CROWDLOGGER.version.util.check_if_first_startup_after_update, 1000 );

    // Start the check message process.
    CROWDLOGGER.study.initiate_check_for_new_messages( 4000 );

    // Start the check notification process (starts in 1 minute).
    CROWDLOGGER.study.initialize_notification_check_process( 60000 );
    //CROWDLOGGER.notifications.set_notification("unredeemed_raffle_win");
    //CROWDLOGGER.study.initialize_notification_check_process( 5000, 2000 );

};

/**
 * Checks if there are new messages available and notifies the user if there
 * are. The message status will be checked at regular intervals, as specified 
 * by the check_message_interval preference.
 *
 * @param {int} timeout How long to wait before checking the first time.
 */
CROWDLOGGER.study.initiate_check_for_new_messages = function( timeout ){

    // Called when we hear back from the server.
    var on_server_response = function( response ){
        // If we got something back, it means there are new messages. Alert
        // the user.

        //B_DEBUG
        CROWDLOGGER.debug.log( "Heard back from message server.\n");
        //E_DEBUG
        
        if( response.match( /^\d/ ) ){
            //B_DEBUG
            CROWDLOGGER.debug.log( "\tThere's at least 1 new message.\n" );
            //E_DEBUG

            // Mark that this notification is for a new message.
            CROWDLOGGER.notifications.set_notification( "new_messages" );
        } else {
            CROWDLOGGER.notifications.unset_notification( "new_messages" );
        }
    }

    // Check the server.
    setTimeout( function(){
        CROWDLOGGER.study.check_for_new_messages(0,true,on_server_response);
    }, timeout );
}

/**
 * Checks if there are new messages available.
 *
 * @param {int} timeout How long to wait before checking the first time.
 * @param {boolean} do_continue If true, then the message status will be
 *      checked at regular intervals, as specified by the 
 *      check_message_interval preference.
 * @param {function} callback A function to invoke when we hear back
 *      from the server.
 */
CROWDLOGGER.study.check_for_new_messages = function( timeout, do_continue,
        callback ){
   
    // The interval between checking for new messages.
    var check_message_interval = 
        CROWDLOGGER.preferences.get_int_pref( "check_message_interval",
            30*60*1000 ); // Default to 30 minutes.

    // This is the function we will call when we hear back from the server.
    var on_server_response = function( response ) {
        //B_DEBUG
        //CROWDLOGGER.debug.log( "Heard back when checking for messages: [" +
        //     response + "]\n");
        //E_DEBUG

        // Invoke the callback with the response.
        callback( response );
    }

    
    // The method to call on failure.
    var on_error = function( response ) {
        CROWDLOGGER.io.log.write_to_error_log( {data: [{
            f: "CROWDLOGGER.study.check_for_new_messages",
            err: response,
            t: new Date().getTime()
        }]});
    };

    // This is the brains of the operation -- it contacts the server
    // and then recurses if the caller requested that.
    var check_status = function(){
        // Attempt to contact the server, using the functions above in the
        // event of a success or failure.
        CROWDLOGGER.io.network.send_data(
           CROWDLOGGER.io.network.get_server_url( "check_messages_url" ),
           "msgID=" +
                CROWDLOGGER.preferences.get_char_pref("most_recent_message_id"),
           on_server_response,
           on_error,
           "GET"
        );

        // Set a timeout for another call to this if the do_continue flag
        // was set to true.
        if( CROWDLOGGER.enabled && do_continue ){
            setTimeout( check_status, check_message_interval );
        }
    }

    setTimeout( check_status, timeout );
};

/**
 * Checks if the user's registration is valid. If not, a new registration is
 * retrieved.
 * @function
 */
CROWDLOGGER.study.check_if_registration_is_valid = function(){
    // TODO Implement.
};

/**
 * Launches and handles the registration dialog.
 */
CROWDLOGGER.study.launch_registration_dialog = function(){
    // The page to load.
    var registration_page = CROWDLOGGER.preferences.get_char_pref( 
        'registration_dialog_url', 'not_found.html' );

    // The prefix for the extension's html files.
    var extension_prefix = CROWDLOGGER.version.info.get_extension_html_prefix();

    // The full url.
    var url = extension_prefix + registration_page;

    // Open the window and call the handler when the page loads.
    CROWDLOGGER.gui.windows.open_dialog( url, '', //"registration", 
        CROWDLOGGER.study.registration.initialize_registration_page );
};

/**
 * Starts a process that checks if there are any notifications available.
 * The interval between checks is specified by the notification_check_interval
 * preference.
 *
 * @param {int} timeout The timeout until the initial check.
 */
CROWDLOGGER.study.initialize_notification_check_process = function( 
        initial_timeout, frequency ){
    
    if( frequency === undefined ){
        frequency = 1000*60*20;
    }   

    // Checks if there are notifications and launches the notification.
    var check_notifications = function(){
        //B_DEBUG
        CROWDLOGGER.debug.log( 'Checking for notifications...\n' );
        //E_DEBUG

        if( CROWDLOGGER.notifications.new_notifications > 0 ) {
            //B_DEBUG
            CROWDLOGGER.debug.log( '\tFound ' + 
                CROWDLOGGER.notifications.new_notifications + 
                ', notifying user...\n' );
            //E_DEBUG

            // Launch the notification box.
            CROWDLOGGER.notifications.launch_notifications_available_alert();        
        }

        // Check again a little later.
        if( CROWDLOGGER.enabled ){
            setTimeout( check_notifications, 
                CROWDLOGGER.preferences.get_int_pref( 
                    'notification_check_interval', frequency ) 
            );
        }
    };
    
    // Set the timeout for the initial check.
    setTimeout( check_notifications, initial_timeout );
};

} // END CROWDLOGGER.study NAMESPACE
