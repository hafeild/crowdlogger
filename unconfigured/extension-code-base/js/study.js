/**
 * @fileOverview Creates a new namespace called CROWDLOGGER.study that contains
 * functions that are related to the study portion of this extension (e.g., the
 * consent form and registration). At some point, some of these functions may 
 * migrate out of this namespace.
 * 
 * See the CROWDLOGGER.study namespace.<p>
 * 
 * %%VERSION_WEB%%
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
    setTimeout( function(){
        CROWDLOGGER.experiments.check_for_new_experiments(
            // Check every x minutes (defaults to 30 minutes).
            CROWDLOGGER.preferences.get_int_pref(
                "experiment_update_interval", 30*60*1000 ),
            // Says to keep checking.
            true,
            // Figure out what to do once we know we have experiments.
            CROWDLOGGER.experiments.handle_new_experiments,
            // If no experiments, unset the experiment notification.
            CROWDLOGGER.notifications.unset_notification("new_experiments")
        );
    }, 50000 );



    //B_DEBUG
    CROWDLOGGER.debug.log( "Setting timeout to check for a new extension version...\n" );
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

    // Set the process that will periodically check if the user has an
    // un-redeemed raffle win.
    CROWDLOGGER.study.check_raffle_status( 10000 );

    // Start the check message process.
    CROWDLOGGER.study.initiate_check_for_new_messages( 4000 );

    // Start the check notification process (starts in 1 minute).
    CROWDLOGGER.study.initialize_notification_check_process( 60000 );
    //CROWDLOGGER.notifications.set_notification("unredeemed_raffle_win");
    //CROWDLOGGER.study.initialize_notification_check_process( 5000, 2000 );

};

/**
 * Checks if the user has any outstanding raffle winnings. This starts a process
 * that will check the status every so often, as defined by the 
 * check_raffle_status_interval preference.
 * @function
 *
 * @param {int} timeout How long to wait before checking the first time.
 * @param {boolean} do_continue If true, then the raffle status will be
 *      checked at regular intervals, as specified by the 
 *      check_raffle_status_interval preference.
 */
CROWDLOGGER.study.check_raffle_status = function( timeout, do_continue ){
    // Specifies how often we should check.
    var check_status_interval = CROWDLOGGER.preferences.get_int_pref( 
        "check_raffle_status_interval", 1000*60*60*24 ); // Default to a day.

    // Fields in the server response text.
    var DATE     = 0;
    var URL      = 1;
    var REDEEMED = 2;

    // This will be called when we've successfully heard back from the server.
    var on_server_response = function( response ){
        if( response != "" ){
            //B_DEBUG
            CROWDLOGGER.debug.log( "Reached server for raffle status check!" );
            //E_DEBUG

            // A flag to keep track of whether or not there is at least one
            // price left to redeem.
            var isCardToRedeem = false;

            // Process the list of wins.
            var lines = response.split( "\n" ) ;

            for( var i = 0; i < lines.length; i++ ) {
                var line = lines[i];

                //B_DEBUG
                //CROWDLOGGER.debug.log( "line: " + line + "\n" );
                //E_DEBUG

                var columns = line.split( "\t" );

                if( columns[REDEEMED] =="no" ) {
                    //B_DEBUG
                    //CROWDLOGGER.debug.log( "Found one to redeem!\n" );
                    //E_DEBUG

                    isCardToRedeem = true;
                }
            } // end for

            // Is there an unredeemed win?
            if (isCardToRedeem) {

                // Set a notification for this unredeemed win.
                CROWDLOGGER.notifications.set_notification( 
                    "unredeemed_raffle_win" );
            } else {
                // Unset the notification for unredeemed wins, if it exists.
                CROWDLOGGER.notifications.unset_notification( 
                    "unredeemed_raffle_win" );
            }
        }
    }

    // The method to call on failure.
    var on_error = function( response ) {
        CROWDLOGGER.io.log.write_to_error_log( "Error: " + response );
    }


    // This is the brains of the operation -- it contacts the server
    // and then recurses if the caller requested that.
    var check_status = function(){
        // Attempt to contact the server, using the functions above in the
        // event of a success or failure.
        CROWDLOGGER.io.network.send_data(
           CROWDLOGGER.preferences.get_char_pref( "check_status_url" ),
           "regID=" +
                CROWDLOGGER.preferences.get_char_pref( "registration_id" ),
           on_server_response,
           on_error,
           "GET"
        );

        // Set a timeout for another call to this if the do_continue flag
        // was set to true.
        if( do_continue ){
            setTimeout( check_status, check_status_interval );
        }
    }


    setTimeout( check_status, timeout );
};

/**
 * Contacts the server to determine what raffles the user has won. The given
 * callback is invoked once we've heard back from the server. It is passed
 * one parameter, the server response (string).
 *
 * @param {function} callback The function to invoke with the server response.
 *      It will be passed one parameter: the server response as a string.
 */
CROWDLOGGER.study.get_raffle_wins = function( callback ){
    // The method to call on failure.
    var on_error = function( response ) {
        CROWDLOGGER.io.log.write_to_error_log( 
            "There was an error while we were contacting the server about " +
            "raffle wins: " + response );
    }

    // Attempt to contact the server, using the functions above in the
    // event of a success or failure.
    CROWDLOGGER.io.network.send_data(
        CROWDLOGGER.preferences.get_char_pref( "check_status_url" ),
        "regID=" + CROWDLOGGER.preferences.get_char_pref( "registration_id" ),
        callback,
        on_error,
        "GET"
    );
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
        CROWDLOGGER.study.check_for_new_messages( 0, true, on_server_response );
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
        CROWDLOGGER.io.log.write_to_error_log( "Error: " + response );
    }

    // This is the brains of the operation -- it contacts the server
    // and then recurses if the caller requested that.
    var check_status = function(){
        // Attempt to contact the server, using the functions above in the
        // event of a success or failure.
        CROWDLOGGER.io.network.send_data(
           CROWDLOGGER.preferences.get_char_pref( "check_messages_url" ),
           "msgID=" +
                CROWDLOGGER.preferences.get_char_pref( "most_recent_message_id" ),
           on_server_response,
           on_error,
           "GET"
        );

        // Set a timeout for another call to this if the do_continue flag
        // was set to true.
        if( do_continue ){
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
    // Make sure that logging is turned on. If not, just return.
    if( CROWDLOGGER.preferences.get_bool_pref( "consent_required", true ) ){
        alert( "Please agree to the Informed Consent (see the status page) " +
               "before attempting to register. Thanks!" ); 
        return false;
    }


    // The page to load.
    var registration_page = CROWDLOGGER.preferences.get_char_pref( 
        "registration_dialog_url", "not_found.html" );

    // The prefix for the extension's html files.
    var extension_prefix = CROWDLOGGER.version.info.get_extension_html_prefix();

    // The full url.
    var url = extension_prefix + registration_page;

    // Open the window and call the handler when the page loads.
    CROWDLOGGER.gui.windows.open_dialog( url, "registration", 
        CROWDLOGGER.study.registration.initialize_registration_page );
};

/**
 * Launches and handles the refer_a_friend dialog.
 *
 * @param {boolean} is_post_registration [Optional.] If true, then the
 *      'post_registration' element on the refer-a-friend page will be
 *      displayed.
 */
CROWDLOGGER.study.launch_refer_a_friend_dialog = function( is_post_registration ){

    // Make sure that logging is turned on. If not, just return.
    if( CROWDLOGGER.preferences.get_bool_pref( "consent_required", true ) ){
        alert( "Please agree to the Informed Consent (see the status page) " +
               "before attempting to refer friends. Thanks!" ); 
        return false;
    }

    // The page to load.
    var refer_a_friend_page = CROWDLOGGER.preferences.get_char_pref(
        "refer_a_friend_dialog_url", "not_found.html" );

    // The prefix for the extension's html files.
    var extension_prefix = CROWDLOGGER.version.info.get_extension_html_prefix();

    // The full url.
    var url = extension_prefix + refer_a_friend_page;

    // Called when the page loads.
    var on_page_load = function( doc ) {
        CROWDLOGGER.study.refresh_refer_a_friend_page( doc, is_post_registration );
    };

    // Open the window and call the handler when the page loads.
    CROWDLOGGER.gui.windows.open_dialog( url, "refer a friend", on_page_load ); 
};

/**
 * Populates a refer-a-friend page.
 *
 * @param {object} doc The document of the refer-a-friend page to populate.
 */
CROWDLOGGER.study.refresh_refer_a_friend_page = function(
        doc, is_post_registration){
    var email_box, message_elm, message, registered, referral_id;

    // Set the init element so that we don't load this twice.
    var init_elm         = doc.getElementById( "init" );
    if( init_elm ){
        init_elm.innerHTML = "true";
    }    

    // If this dialog is being called because the user just finished
    // registering, display the post-registration note.
    if( is_post_registration !== undefined &&
           is_post_registration ){
        var post_registration_elm = doc.getElementById("post_registration");
        if( post_registration_elm ){
            //B_DEBUG
            CROWDLOGGER.debug.log( "Un-revealing header on refer-a-freind\n");
            //E_DEBUG

            post_registration_elm.style.display = "block";
        }
    }

    // Get the email box.
    if( doc.forms.email && doc.forms.email.email_box ){
        email_box = doc.forms.email.email_box;
    } else {
        return false;
    }

    // Get the message parts.
    message_elm = doc.getElementById( "message" );


    var populate_message = function( referral_id ){
        if( message_elm ){
            message = message_elm.innerHTML;
        }
    
        // Replace the code place holder with the real code.
        message = message.replace( /ADD_CODE_HERE/, referral_id );
    
        // Pop the message in the email box.
        email_box.innerHTML = message;    
    };

    var on_error = function( error ){
        populate_message( "70c616519c33fce85134b65dac1ace463c34aa0f" );
    };

    var on_server_response = function( response ){
        if( response.match( /^id:/ ) !== null ){
            var id =response.replace( /^id:/, "" );
            CROWDLOGGER.preferences.set_char_pref( "id_code", id ); 
            populate_message( id );
        } else {
            on_error( "Empty reponse." );
        }   
    };

    // Get the users registration info.
    referral_id = CROWDLOGGER.preferences.get_char_pref( "id_code", "" );

    // If there's no referral id, put in a dummy one.
    if( referral_id === "" ){
        CROWDLOGGER.io.network.send_data(
            CROWDLOGGER.preferences.get_char_pref( "id_code_url" ),
            "userID=" + CROWDLOGGER.preferences.get_char_pref( 
                "registration_id", "" ),
            on_server_response,
            on_error,
            "POST" );
    } else {
        populate_message( referral_id );
    }


};

/**
 * Starts a process that checks if there are any notifications available.
 * The interval between checks is specified by the notification_check_interval
 * preference.
 *
 * @param {int} timeout The timeout until the initial check.
 */
CROWDLOGGER.study.initialize_notification_check_process = function( initial_timeout, frequency ){
    if( frequency === undefined ){
        frequency = 1000*60*20;
    }   

    // Checks if there are notifications and launches the notification.
    var check_notifications = function(){
        //B_DEBUG
        CROWDLOGGER.debug.log( "Checking for notifications...\n" );
        //E_DEBUG

        if( CROWDLOGGER.notifications.new_notifications > 0 ) {
            //B_DEBUG
            CROWDLOGGER.debug.log( "\tFound " + 
                CROWDLOGGER.notifications.new_notifications + 
                ", notifying user...\n" );
            //E_DEBUG

            // Launch the notification box.
            CROWDLOGGER.notifications.launch_notifications_available_alert();        
        }

        // Check again a little later.
        setTimeout( check_notifications, 
            CROWDLOGGER.preferences.get_int_pref( 
                "notification_check_interval", frequency ) 
        );
    };
    
    // Set the timeout for the initial check.
    setTimeout( check_notifications, initial_timeout );
};



/**
 * Sets the necessary flags to indicate that a new consent form is available and
 * then notifies the user.
 */
CROWDLOGGER.study.notify_of_new_consent_form = function(){
        // Set a notification for the new consent form.
        CROWDLOGGER.notifications.set_notification( "consent" );
};


/**
 * Notifies the user that there were one or more errors while running
 * the experiments.
 */
CROWDLOGGER.study.notify_user_of_experiment_failures = function( error_log ){

    // TODO implement!

};


/**
 * Lets the server know that this user has accepted the new consent form.
 */
CROWDLOGGER.study.user_accepted_consent_form = function( the_window ){
    // Called when we've heard back from the server.
    var on_server_response = function( response ) {
        if( response == "success" ){
            CROWDLOGGER.preferences.set_bool_pref(
                "consent_required", false );
            // Turn logging back to it's former status.
            CROWDLOGGER.logging.set_logging( 
                CROWDLOGGER.preferences.get_bool_pref( 
                    "logging_enabled_pre_consent", true ) );

            // Unset the consent notification.
            CROWDLOGGER.notifications.unset_notification( "consent" );

        } else {
            on_error( "The server encountered an error while processing." );
        }
        if( the_window ){
            the_window.close();
        }
    }

    // If an error has occurred.
    var on_error = function( error ){
        alert( "An error occurred saving your consent status: " + error );
        if( the_window ){
            the_window.close();
        }
    }

    // Called once we know we have a registration id.
    var on_have_id = function() {
        var url = CROWDLOGGER.preferences.get_char_pref(
                "consent_accepted_url" );
        var data = "userID=" + 
            CROWDLOGGER.preferences.get_char_pref("registration_id");
        CROWDLOGGER.io.network.send_data( 
            url, 
            data, 
            on_server_response, 
            on_error, 
            "GET" );
    };


    // Check if the user already has a registration id. If not, get one.
    if( CROWDLOGGER.preferences.get_char_pref(
            "registration_id" ) == "" ) {
        CROWDLOGGER.study.registration.get_new_registration_id( on_have_id,
            on_error );
    } else {
        on_have_id();
    }
    
};


} // END CROWDLOGGER.study NAMESPACE
