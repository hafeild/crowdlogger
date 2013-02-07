
if( CROWDLOGGER.version === undefined ){
    CROWDLOGGER.version = {};
}

if( CROWDLOGGER.version.util === undefined ){

/**
 * @namespace Provides utilities such as checking for updates.
 */
CROWDLOGGER.version.util = {};

/**
 * Checks if there is a new version of the extension. If so, the user is
 * notified. A call to this function starts a process
 * that will check the status every so often, as defined by the 
 * extension_version_check_interval preference.
 * @name CROWDLOGGER.version.util.check_for_new_extension_version
 * @function
 *
 * @param {int} initial_timeout The time to wait before making the first check.
 */
CROWDLOGGER.version.util.init = function(){
    // The check interval. Default to 5 hours.
    var check_interval = CROWDLOGGER.preferences.get_int_pref(
        'crowdlogger.extension_version_check_interval', 1000*60*60*5 );

    // A function that checks for the update.
    /** @ignore */
    var check_for_update;

    // Get the version & browser.
    var version_data = 'version=' + 
        CROWDLOGGER.version.info.get_extension_version();
    var browser_name = CROWDLOGGER.version.info.get_browser_name();

    // This will point to the function that should be called when a new
    // update is available.
    /** @ignore */
    var notify_user_of_update;

    // The error function.
    /** @ignore */
    var on_error;

    // Called when we hear back from the server.
    /** @ignore */
    var on_server_response;

    // The extension version web site address.
    var extension_udpate_url = CROWDLOGGER.io.network.get_server_url(
            'extension_version_url', '' );

    // This is Firefox.
//    if( browser_name.match( /^ff/ ) !== null ){
//        // A button for the notification below.
//        // This defines the 'How do I update?' button that will appear on
//        // the notification.
//        /** @ignore */
//        var Button = function() {
//            this.accessKey = '';
//            this.callback = function(notification, button) {
//               gBrowser.selectedTab =
//                gBrowser.addTab( CROWDLOGGER.preferences.get_char_pref(
//                    'how_to_update_url' ) );
//            };
//            this.label = 'How do I update?';
//            this.popup = null;
//        };
//
//        // Firefox will notify the user using a notification.   
//        /** @ignore */ 
//        notify_user_of_update = function(){
//            var notifyBox = gBrowser.getNotificationBox();
//            notifyBox.appendNotification(
//              'There is a new version of the privacy-preserving ' +
//              'search logger. Please update as soon as ' +
//              'possible.',
//            'crowdloggerlogtoolbar-update-notification',
//            '',
//            notifyBox.PRIORITY_WARNING_MEDIUM,
//            [new Button()] );
//        };
//
//
//    // This is Chrome.
//    } else if( browser_name === 'chrome' ){
//        // Chrome will notify the user using a desktop notification.
//
//        // TODO Implement.
//    }

    // Set the function that will update the users that a new version of the
    // extension is available.
    notify_user_of_update = function(){
        // Set the flag for 'update required'.
        CROWDLOGGER.notifications.set_notification( 'extension_update' );
    };


    // Defines what happens when we hear back from the server.
    /** @ignore */
    on_server_response = function( response ) {
        if( response === 'update' ){
            // Notify the user.
            notify_user_of_update();
        } else {
            // Unset the notification.
            CROWDLOGGER.notifications.unset_notification( 'extension_update' );
        }
    };


    // The error function will write a message to the error log.
    /** @ignore */
    on_error = function( error ){
        CROWDLOGGER.io.log.write_to_error_log({ data: [{
            f: 'CROWDLOGGER.version.util.init',
            err: 'In CROWDLOGGER.version.info.check_for_new_version: '+ error,
            t: new Date().getTime()
        }]});
    }

    // Checks for the update, notifies the user if necessary, and 
    // sets the timeout for the next check.
    /** @ignore */
    check_for_update = function(){
        // Contact the update url (the server will let us know if we
        // need to update or not).
        CROWDLOGGER.io.network.send_get_data(
            extension_udpate_url,
            version_data,
            on_server_response,
            on_error );

        // Set a new timeout.
        setTimeout( check_for_update, check_interval );
    }


    // Create the function wrapper to call the correct browser-dependent
    // check.        
    CROWDLOGGER.version.util.check_for_new_extension_version = function( 
            initial_timeout ){
        // Set a new timeout.
        setTimeout( check_for_update, initial_timeout );
    };

};


/**
 * Determines if this is the first start after an update.
 *
 * @return {boolean} <tt>true</tt> if this is the first start after an update.
 */
CROWDLOGGER.version.util.is_first_start_after_update = function(){
    var extension_version = CROWDLOGGER.version.info.get_extension_version();
    var stored_version = CROWDLOGGER.preferences.get_char_pref( 'version', '' );

    return stored_version !== '' && extension_version !== stored_version;
};

/**
 * Determines if this is the first start after an install (i.e., the first
 * time the user is using this system).
 *
 * @return {boolean} <tt>true</tt> if this is the first start after an install.
 */
CROWDLOGGER.version.util.is_first_start_after_install = function(){
    var extension_version = CROWDLOGGER.version.info.get_extension_version();
    var stored_version = CROWDLOGGER.preferences.get_char_pref( 'version', '' );

    return stored_version === '';
}

/**
 * Determines if this is the first start after an update or install.
 *
 * @return {boolean} <tt>true</tt> if this is the first start after an update
 *      or install.
 */
CROWDLOGGER.version.util.is_first_start = function(){
    var extension_version = CROWDLOGGER.version.info.get_extension_version();
    var stored_version = CROWDLOGGER.preferences.get_char_pref( 'version', '' );

    return extension_version !== stored_version;
};



/**
 * Checks if this is the first startup after an install or update. If so,
 * a welcome page is launched.
 * 
 * @return {boolean} <code>true</code> if this is a new version, <code>false</code> otherwise.
 */
CROWDLOGGER.version.util.check_if_first_startup_after_update = function(){
    if( CROWDLOGGER.version.util.is_first_start_after_install() ) {
        //B_DEBUG
        CROWDLOGGER.debug.log( 'First start after install.\n' ); 
        //E_DEBUG

        CROWDLOGGER.version.util.launch_welcome_page();
        return true;
    } else if( CROWDLOGGER.version.util.is_first_start_after_update() ) {
        //B_DEBUG
        CROWDLOGGER.debug.log( 'First start after update.\n' ); 
        //E_DEBUG

        // Create appropriate notifications.
        if( CROWDLOGGER.preferences.get_bool_pref( 'consent_required', true ) ){
            CROWDLOGGER.study.notify_of_new_consent_form();
        }

        if( CROWDLOGGER.preferences.get_bool_pref( 'registered', false ) ){
            // Add a notification about registering or updating the 
            // registration.
            CROWDLOGGER.notifications.set_notification( 'update_registration' );

            // Add a notification about referring friends.
            CROWDLOGGER.notifications.set_notification( 'refer_a_friend' );
        } else if( !CROWDLOGGER.notifications.registration_dismissed() ) {
            CROWDLOGGER.notifications.set_notification( 'register' );
        }

        // Check if the pass phrase is set. If not, add a notification for that.
        if( CROWDLOGGER.preferences.get_char_pref( 'pass_phrase', '' ) === '' ){
            CROWDLOGGER.notifications.set_notification( 'set_passphrase' );
        } else {
            // Create a notification about updating settings.
            CROWDLOGGER.notifications.set_notification( 'update_settings' );
        }

        // TODO Pull up the status page.
        CROWDLOGGER.notifications.show_update_message = true;

        // This will launch the status page and show the updates.
        //CROWDLOGGER.gui.study.pages.launch_status_page();
    
        // Launch a notification.
        CROWDLOGGER.gui.notifications.notify( 'low', 
            '%%PROJECT_NAME%% has been updated -- check out the status page '+
            'for important notifications.' );

        // Set the new version.
        var extension_version = 
            CROWDLOGGER.version.info.get_extension_version();
        CROWDLOGGER.preferences.set_char_pref('version', extension_version);
    } else {
        //B_DEBUG
        CROWDLOGGER.debug.log( 'Just a regular start up.\n' );
        //E_DEBUG

        // Check if the user need to register.
        if( !CROWDLOGGER.preferences.get_bool_pref( 'registered', false ) &&
            !CROWDLOGGER.notifications.registration_dismissed() ){
            CROWDLOGGER.notifications.set_notification( 'register' );
        }

        // Check if the pass phrase is set. If not, add a notification for that.
        if( CROWDLOGGER.preferences.get_char_pref( 'pass_phrase', '' ) === '' ){
            CROWDLOGGER.notifications.set_notification( 'set_passphrase' );
        }
    }
    
    return false;
};


/**
 * Opens a new tab with a welcome page for the current version of the
 * extension.
 */
CROWDLOGGER.version.util.launch_welcome_page = function() {
    var browser_name = CROWDLOGGER.version.info.get_browser_name();
    var extension_version = CROWDLOGGER.version.info.get_extension_version();
   
    // The page to load.
    var welcome_page = CROWDLOGGER.preferences.get_char_pref(
        'update_welcome_url', 'not_found.html' );

    // The prefix for the extension's html files.
    var extension_prefix = CROWDLOGGER.version.info.get_extension_html_prefix();

    // The full url.
    var url = extension_prefix + welcome_page + '?version=' + extension_version;
 
    // Launch a tutorial page.
    CROWDLOGGER.gui.windows.open_dialog(
            url,
            '%%FULL_PROJECT_NAME%% Welcome',
            function(){});

   // Set the new version.
   CROWDLOGGER.preferences.set_char_pref( 'version', extension_version );
};

} // END CROWDLOGGER.version.util NAMESPACE
