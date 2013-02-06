/**
 * @fileOverview Provides functions to launch various study web pages and 
 * dialogs.<p>
 * 
 * See the  CROWDLOGGER.gui.study.pages namespace.<p>
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

if( CROWDLOGGER.gui.study === undefined ){
    CROWDLOGGER.gui.study = {};
}


if( CROWDLOGGER.gui.study.pages === undefined ){

/**
 * @namespace Provides functions to launch various study web pages and  
 * dialogs.
 */
CROWDLOGGER.gui.study.pages = {
    // This should really go in some utility, but for now it's only used 
    // here.
    months : ["Jan", "Feb", "March", "April", "May", "June", "July", "Aug", 
        "Sep", "Oct", "Nov", "Dec" ],
    months_long : [
        "January", "February", "March", "April", "May", "June", "July", 
        "August", "September", "October", "November", "December" ],
    MESSAGE_SUMMARY_SIZE : 25
};


/**
 * Adds listeners that listen for custom events from extension pages,
 * e.g., the crowdlogger_status_page_refresh event.
 *
 * @param {object} the_window   The window to which the listeners should be 
 *      added.
 */
CROWDLOGGER.gui.study.pages.add_listeners = function(the_window){

    // A listener for the status page refresh request. The event passed in
    // should include a "doc" attribute pointing to the page.
    the_window.addEventListener( "crowdlogger_status_page_refresh",
        function( e ){ 
            //B_DEBUG
            CROWDLOGGER.debug.log( "Caught crowdlogger_status_page_refresh\n" );
            //E_DEBUG

            CROWDLOGGER.gui.study.pages.refresh_status_page(e.originalTarget);
        },
        false );

};


/**
 * Launches the page containing the most recent consent form.
 */
CROWDLOGGER.gui.study.pages.launch_consent_form_page = function(){
    //B_DEBUG
    CROWDLOGGER.debug.log( "In launch_consent_form_page\n" );
    //E_DEBUG


    // Get the url of the status page.
    var consent_form_page = CROWDLOGGER.preferences.get_char_pref(
        "consent_dialog_url", "not_found.html" );

    // The prefix for the extension's html files.
    var extension_prefix = CROWDLOGGER.version.info.get_extension_html_prefix();

    // The full url.
    var url = extension_prefix + consent_form_page;

   
    // Populates the page.
    var on_load = function( doc ){
        CROWDLOGGER.gui.study.pages.refresh_consent_page( doc );
    } 


    // Once the new tab has opened, this will give us a handle on it.
    CROWDLOGGER.gui.windows.open_dialog( url, "%%FULL_PROJECT_NAME%% Consent Page",
       on_load );
};

/**
 * Adds the consent form to the consent frame in the given document.
 *
 * @param {object} doc The consent form page document.
 */
CROWDLOGGER.gui.study.pages.refresh_consent_page = function( doc ){
    var extension_prefix = CROWDLOGGER.version.info.get_extension_html_prefix();
    var consent_body_url = CROWDLOGGER.preferences.get_char_pref(
        "consent_body_url", extension_prefix + "not_found.html" );

    // Once we get the consent body HTML from the server, this function
    // will place it in the page.
    var on_server_response = function( consent_body ){
        var init_elm         = doc.getElementById( "init" );
       
        var consent_frame = doc.getElementById( "consent_frame" );
        if( consent_frame ){
            //consent_frame.setAttribute( "src",  consent_body_url );
            consent_frame.innerHTML = consent_body + consent_frame.innerHTML;
        }
    
        if( init_elm ){
            init_elm.innerHTML = "true";
        }
    
    }

    // Ask the server for the consent form body.
    CROWDLOGGER.io.network.send_data( consent_body_url, null, 
        on_server_response, function(){}, "GET" );
};


/**
 * Launches the update help popup.
 */
CROWDLOGGER.gui.study.pages.launch_update_help = function(){
    // Figure out whether this is FF or Chrome.
    var update_help_url;
    var browser = CROWDLOGGER.version.info.get_browser_name();
    // Firefox 3.
    if( browser === "ff3" ) {
        update_help_url = CROWDLOGGER.preferences.get_char_pref( 
            "firefox_3_update_help_url", "not_found.html" );
    // Firefox 4.
    } else if ( browser === "ff4" ) {
        update_help_url = CROWDLOGGER.preferences.get_char_pref( 
            "firefox_4_update_help_url", "not_found.html" );
    // Chrome.
    } else {
        update_help_url = CROWDLOGGER.preferences.get_char_pref( 
            "chrome_update_help_url", "not_found.html" );
    }

    // The prefix for the extension's html files.
    var extension_prefix = CROWDLOGGER.version.info.get_extension_html_prefix();

    // Open the pop up.
    CROWDLOGGER.gui.windows.open_popup( extension_prefix + update_help_url, 
        "Update help" );
};

/**
 * Launches the status page in a new tab. If for whatever reason the status
 * page url as stored in the preferences is not found, a "not_fount.html"
 * page is pointed to.
 */
CROWDLOGGER.gui.study.pages.launch_status_page = function(){

    // Get the url of the status page.
    var status_page = CROWDLOGGER.preferences.get_char_pref(
        "status_page_url", "not_found.html" );

    // The prefix for the extension's html files.
    var extension_prefix = CROWDLOGGER.version.info.get_extension_html_prefix();

    // The full url.
    var url = extension_prefix + status_page;

    // Once the new tab has opened, this will give us a handle on it.
    CROWDLOGGER.gui.windows.open_dialog( url, "%%FULL_PROJECT_NAME%% Status Page",
            CROWDLOGGER.gui.study.pages.refresh_status_page );

};


CROWDLOGGER.gui.study.pages.refresh_status_page = function( doc ){
    // TODO Implement all the dynamic things to stick on the page.
    var jq = doc.defaultView.jQuery; 

    // Get the elements we need to populate.
    var notification_elm = jq('#notifications');
    var messages_elm     = doc.getElementById( "messages" );
    var experiments_elm  = doc.getElementById( "experiments" );
    var raffle_wins_elm  = doc.getElementById( "raffleWins" );
    var init_elm         = doc.getElementById( "init" );
    
    // This tells the page that it's been initialized.
    init_elm.innerHTML = "starting";

    // For the special update notifications (shown after an update is installed).
    var clear_update_notification_delay = 30*1000; // 30-seconds
    var clear_update_message_delay = 30*60*1000; // 30-minutes

    /*
    CROWDLOGGER.study.notify_of_new_consent_form();
    CROWDLOGGER.notifications.set_notification( "update_registration" );
    CROWDLOGGER.notifications.set_notification( "refer_a_friend" );
    CROWDLOGGER.notifications.set_notification( "register" );
    CROWDLOGGER.notifications.set_notification( "set_passphrase" );
    CROWDLOGGER.notifications.set_notification( "update_settings" );
    CROWDLOGGER.notifications.set_notification( "new_messages" );
    CROWDLOGGER.notifications.set_notification( "unredeemed_raffle_win" );
    CROWDLOGGER.notifications.set_notification( "extension_update" );
    CROWDLOGGER.notifications.set_notification( "new_experiments" );
    */

    // Place the version number.
    var version = CROWDLOGGER.version.info.get_extension_version();
    var version_elms = doc.getElementsByName( "version_no" );
    for( var i = 0; i < version_elms.length; i++ ) {
        if( version_elms[i] ) {
            version_elms[i].innerHTML = "version " + version; 
        }
    }
    
    var whatsnew_elms = doc.getElementsByName( "whatsnew" );
    for( var i = 0; i < whatsnew_elms.length; i++ ) {
        if( whatsnew_elms[i] ) {
            whatsnew_elms[i].onclick = function(){
                CROWDLOGGER.gui.windows.open_tab(
                    CROWDLOGGER.preferences.get_char_pref( "whatsnew_url" ) + 
                        "?version=" + version,
                   function(){} );
            };
        }
    }

    // Reveal the update message if need be.
    if( CROWDLOGGER.notifications.show_update_message ){
        var update_message = doc.getElementById( "update_message" );
        if( update_message ){
            update_message.style.display = "block";
        }

        setTimeout( 
            function(){ 
                CROWDLOGGER.notifications.show_update_message = false; 
            }, clear_update_message_delay );
    }

    // Insert the notifications.
    if( notification_elm.size() > 0 ){
        var notifications = jq('<table class="notifications">');
        // This will keep track of how many notifications have
        // been posted.
        var notifications_posted = 0;
        var note_board = CROWDLOGGER.notifications;

            // Check for notifications about an available update.
            if( note_board.extension_update > 0 ){
                notifications_posted++;
                notifications.append('<tr><td class="alert"></td>' +
                    '<td>There is a new version of %%PROJECT_NAME%% ' +
                    'available. Please download and install it '+
                    'as soon as you can.</td><td><span class="button" ' +
                    'style="width: 100%" id="launch_update_help>'+
                    'See how to update</span></td><td></td></tr>');

                notifications.find('#launch_update_help').click(function(){
                    CROWDLOGGER.gui.study.pages.launch_update_help(); 
                    return false;
                });
            }

            
            // Check for notifications about a new consent form.
            if( note_board.consent > 0 ){
                notifications_posted++;
                notifications.append('<tr><td class="alert"></td>' +
                    '<td>There is a new consent form that '+
                    'you must read and accept before more data can be ' +
                    'logged and mined.</td><td><span class="button" ' +
                    'style="width: 100%" id="launch_consent_form">' +
                    'Read consent form</span></td><td></td></tr>');

                jq('#launch_consent_form').click(function(){
                    CROWDLOGGER.gui.study.pages.launch_consent_form_page();
                });
            }

            // Register.
            if( note_board.register > 0 ) {
                notifications_posted++;
                notifications.append('<tr id="register_notification">' +
                    '<td class="alert"></td>'+
                    '<td>You have not registered yet, would you like to now?' +
                    '</td><td><span class="button" ' +
                      'style="width: 100%" id="launch_registration_dialog">' +
                        'Register</span></td><td>'+
                    '<span class="button" ' +
                      'style="width: 100%" id="dismiss_registration_notification">'+
                      'Dismiss</span></td></tr>');

                // Clear this after a minute.
                setTimeout(
                    function(){
                        CROWDLOGGER.notifications.unset_notification(
                            'register' );
                    }, clear_update_notification_delay );

            } else if( note_board.registration_dismissed() ) {
                notifications_posted++;
                notifications.append('<tr id="register_notification">' +
                    '<td class="alert"></td>'+
                    '<td>You have not registered yet, would you like to now?' +
                    '</td><td><span class="button" ' +
                        'style="width: 100%" id="launch_registration_dialog">'+
                    'Register</span></td><td></td></tr>');
            }

            // For the registration.
            notifications.find('#launch_registration_dialog').click(function(){
                CROWDLOGGER.study.launch_registration_dialog();
                CROWDLOGGER.notifications.set_registration_dismissed(false);
                jq('#register_notification').hide();
            });

            notifications.find('#dismiss_registration_notification').
                      click(function(){
                CROWDLOGGER.notifications.unset_notification('register');
                jq('#register_notification').hide();
                CROWDLOGGER.notifications.set_registration_dismissed(true);
                return false;
            });            


            // Update Registration.
            if( note_board.update_registration > 0 ) {
                notifications_posted++;
                notifications.append('<tr id="update_registration_notification">'+
                    '<td class="alert"></td>'+
                    '<td>Would you like to update your registration?' +
                    '</td><td><span class="button" ' +
                      'style="width: 100%" id="update_registration">' +
                        'Update registration</span> </td><td>' +
                    '<span class="button" ' +
                      'style="width: 100%" '+
                      'id="dismiss_update_registration_notification">' +
                    'Dismiss</span></td></tr>');

                notifications.find('#update_registration').click(function(){
                    CROWDLOGGER.study.launch_registration_dialog();
                    CROWDLOGGER.notifications.unset_notification(
                        'update_registration'); 
                    return false;
                });

                notifications.find(
                  '#dismiss_update_registration_notification').click(function(){
                    CROWDLOGGER.notifications.unset_notification(
                            'update_registration');
                    jq('#update_registration_notification').hide();
                    return false;
                });

                // Clear this after a minute.
                setTimeout( 
                    function(){
                        CROWDLOGGER.notifications.unset_notification(
                            'update_registration' );
                    }, clear_update_notification_delay );
            }

            // Refer a friend.
            if( note_board.refer_a_friend > 0 ) {
                notifications_posted++;
                notifications.append('<tr id="refer_a_friend_notification">' +
                    '<td class="alert"></td>'+
                    '<td>Would you like to refer a friend to this study?' +
                    '</td><td><span class="button" ' +
                      'style="width: 100%" id="launch_refer_a_friend">' +
                      'Refer a friend</span></td><td>' +
                    '<span class="button" ' +
                      'style="width: 100%" id="unset_refer_a_friend_notification">'+
                      'Dismiss</span></td></tr>');

                notifications.find('#launch_refer_a_friend').click(function(){
                    CROWDLOGGER.study.launch_refer_a_friend_dialog();
                    CROWDLOGGER.notifications.unset_notification(
                       'refer_a_friend'); 
                    return false; 
                });

                notifications.find(
                        '#unset_refer_a_friend_notification').click(function(){
                    CROWDLOGGER.notifications.unset_notification(
                        'refer_a_friend');
                    jq('#refer_a_friend_notification').hide();
                    return false;
                });

                // Clear this after a minute.
                setTimeout( 
                    function(){
                        CROWDLOGGER.notifications.unset_notification(
                            'refer_a_friend' );
                    }, clear_update_notification_delay );
            }


            // Set a pass phrase.
            if( note_board.set_passphrase > 0 ) {
                notifications_posted++;
                notifications.append('<tr id="set_passphrase_notification">' +
                    '<td class="alert"></td>'+
                    '<td>You have not set a pass phrase yet. This means we ' +
                    'cannot run experiments on your search log.</td><td>' +
                    '<span class="button" ' +
                        'style="width: 100%" id="set_passphrase">' +
                        'Set pass phrase</span></td><td>' +
                    '<span class="button" ' +
                      'style="width: 100%" id="dismiss_passphrase_notification">' +
                      'Dismiss</span></td></tr>');

                notifications.find('#set_passphrase').click(function(){
                    CROWDLOGGER.gui.preferences.launch_preference_dialog();
                    jq('#set_passphrase_notification').hide(); 
                });

                notifications.find('#dismiss_passphrase_notification').click(function(){
                    CROWDLOGGER.notifications.unset_notification(
                        'set_passphrase');
                    jq('#set_passphrase_notification').hide();
                    return false;
                });
            }

            // Update settings.
            if( note_board.update_settings > 0 ) {
                notifications_posted++;
                notifications.append('<tr id="update_settings_notification">' +
                    '<td class="alert"></td>'+
                    '<td>Would you like to update your settings?</td><td>' +
                    '<span class="button" ' +
                        'style="width: 100%" id="launch_preference_dialog">' +
                        'Update settings</span></td><td>' +
                    '<span class="button" ' +
                      'style="width: 100%" '+
                      'id="unset_update_settings_notification">'+
                      'Dismiss</span></td></tr>');

                notifications.find('#launch_preference_dialog').click(function(){
                    CROWDLOGGER.gui.preferences.launch_preference_dialog(); 
                    CROWDLOGGER.notifications.unset_notification(
                        'update_settings'); 
                    return false;
                });

                notifications.find('#launch_preference_dialog').click(function(){
                    CROWDLOGGER.notifications.unset_notification(
                        'update_settings');
                    jq('#update_settings_notification').hide();
                    return false;
                });

                // Clear this after a minute.
                setTimeout( 
                    function(){
                        CROWDLOGGER.notifications.unset_notification(
                            'update_settings' );
                    }, clear_update_notification_delay );
            }

            // Check for notifications about new experiments.
            if( note_board.new_experiments > 0 ) {
                CROWDLOGGER.debug.log( 'Posting experiment' );
                notifications_posted++;
                notifications.append('<tr id="new_experiments_notification">' +
                    '<td class="alert"></td>' +
                    '<td>There are new experiments to run!</td><td>' +
                    '<span class="buttonPanel" style="height: auto;">' +
                    '<span class="button" style="width: 100%" '+
                       'id="run_new_experiments">'+
                       'Run experiments now</span><p>' +
                    '<span class="button" style="width: 100%" '+
                        'id="run_experiments_automatically">'+
                        'Run now and run automatically in the future</span>'+
                    '</span><p>' +
                    '<span class="button" style="width: 100%" '+
                        'id="run_experiments_later">'+
                        'Run experiments later</span></td><td>' +
                    '</td></tr>');

                notifications.find('#run_new_experiments').click(function(){
                    CROWDLOGGER.experiments.run_available_experiments();
                    CROWDLOGGER.notifications.unset_notification(
                        'new_experiments');
                    jq('#new_experiments_notification').hide();
                });

                notifications.find(
                        '#run_experiments_automatically').click(function(){
                    CROWDLOGGER.preferences.set_bool_pref(
                       'run_experiments_automatically', true );
                    CROWDLOGGER.experiments.run_available_experiments();
                    CROWDLOGGER.notifications.unset_notification(
                        'new_experiments');
                    jq('#new_experiments_notification').hide();
                });

                notifications.find('#run_experiments_later').click(function(){
                    CROWDLOGGER.notifications.unset_notification(
                        'new_experiments');
                    jq('#new_experiments_notification').hide();
                });
            }

            // Check for notifications about unread messages.
            if( note_board.new_messages > 0 ){
                notifications_posted++;
                notifications.append("<tr><td class=\"alert\"></td>" +
                    "<td>There are <a href=\"#messages\">new messages</a> " +
                    " from the project researchers.</td><td></td></tr>");
            }

            // Check for notifications about raffle wins.
            if( note_board.unredeemed_raffle_win > 0 ){
                notifications_posted++;
                notifications.append("<tr><td class=\"alert\"></td>" +
                    "<td>You have <a href=\"#raffleWins\">un-redeemed</a> " + 
                    " raffle wins.</td><td></td></tr>");
            }

            if( notifications_posted === 0 ){
                notification_elm.html("No new notifications");
                note_board.new_notifications = 0;
            } else {
                //notifications += "</table>";
                //B_DEBUG   
                CROWDLOGGER.debug.log( "Added " + notifications + 
                    " to the status page.\n" );
                //E_DEBUG
                //notification_elm.innerHTML = notifications;
                notification_elm.append(notifications);
            }


            // Place listeners.
            
//        }
    }

    // Now take care of the messages section.
    if( messages_elm ){
        messages_elm.innerHTML = "<span class=\"loading\">Loading ...</span>";
        setTimeout( function(){
            CROWDLOGGER.gui.study.pages.populate_messages( jq(messages_elm), jq);
        }, 5 );
    }

    CROWDLOGGER.gui.study.pages.populate_experiments_status( doc,
        experiments_elm );

    // And now the raffle wins.
    if( raffle_wins_elm ){
        raffle_wins_elm.innerHTML = 
            "<span class=\"loading\">Loading ...</span>";
        setTimeout( function(){
            CROWDLOGGER.gui.study.pages.populate_raffle_wins( raffle_wins_elm );
        }, 5 );
    }

    // This tells the page that it's been initialized.
    init_elm.innerHTML = "done";

    if( CROWDLOGGER.preferences.get_bool_pref('dev_mode', false) &&
            jq('#dev_tools').length == 0) {
        jq('#tools ul').append(
            '<p id="dev_tools"><h2><a href="#" id="launch_dev_tools">'+
            'Development tools</a>'+
            '</h2>View the available development tools.'
        );
    
        jq('#launch_dev_tools').click(function(){
            CROWDLOGGER.gui.tools.dev.launch();
            return false;
        });
    }

};

/**
 * Lists statistics about what experiments are pending, running, and have
 * run in the past.
 *
 * @param {object} doc The document that contains the experiments section.
 * @param {object} doc_element  The document element to which the stats 
 *      should be added.
 */
CROWDLOGGER.gui.study.pages.populate_experiments_status = function(doc, 
    doc_element){

    // Populate the experiment history section.
    if( doc_element ){
        var running_doc_element = 
            doc.getElementById( "running_experiments" );
        var upcoming_doc_element = 
            doc.getElementById( "upcoming_experiments" );
        var last_completed_experiment_elm =
            doc.getElementById( "last_completed_experiment" );
        var number_completed_doc_element =
            doc.getElementById( "number_completed_experiments" );

        var current_running_job_id = "";

        // Display the current running experiment
        var html = "<span class=\"note\">None</span>";
        if( CROWDLOGGER.session_data.keep_running_experiments === true ){
            //B_DEBUG
            CROWDLOGGER.debug.log( "running_doc_element: " + 
                running_doc_element + 
                "\nCROWDLOGGER.session_data.keep_running_experiments: " + 
                CROWDLOGGER.session_data.keep_running_experiments + "\n" );
            //E_DEBUG

            current_running_job_id = JSON.parse(
                CROWDLOGGER.preferences.get_char_pref(
                    "current_running_experiment", "{}" ) ).job_id;
            html = current_running_job_id + 
                " <span class=\"note\">(" + 
                CROWDLOGGER.session_data.current_running_experiment_status.
                    message + ")</span>"; 
        } 
             
        if( running_doc_element && running_doc_element.innerHTML !== html ) {
            running_doc_element.innerHTML = html;
        }
        
        // Generate the list of upcoming experiments.
        html = "<span class=\"note\">None</span>"
        if( CROWDLOGGER.session_data.job_indicies_to_run !== undefined && 
                ((CROWDLOGGER.session_data.cur_job_index <
                CROWDLOGGER.session_data.job_indicies_to_run.length &&
                !CROWDLOGGER.session_data.keep_running_experiments) || 
                (CROWDLOGGER.session_data.cur_job_index +1 <
                CROWDLOGGER.session_data.job_indicies_to_run.length &&
                CROWDLOGGER.session_data.keep_running_experiments))){
            //upcoming_doc_element.innerHTML = "";
            html = "";

            // If the current experiment is running, don't show it in the
            // 'upcoming' list; but if its not running, it should be displayed.
            var start_index = CROWDLOGGER.session_data.cur_job_index;
            if( start_index === undefined ){
                start_index = 0;
            }
            if( CROWDLOGGER.session_data.keep_running_experiments === true ) {
                start_index++;
            }



            for( var i = start_index;
                     i < CROWDLOGGER.session_data.job_indicies_to_run.length;
                     i++ ){
                html += 
                    CROWDLOGGER.session_data.job_indicies_to_run[i] + "<br>";
            }
        }

        CROWDLOGGER.debug.log("start_index: "+ start_index +
          "; upcoming_doc_element.innerHTML: "+ upcoming_doc_element.innerHTML);

        if( upcoming_doc_element && upcoming_doc_element.innerHTML !== html ) {
            upcoming_doc_element.innerHTML = html;
        }

        // Display info about the most recently completed experiment.
        html = "N/A";
        if( last_completed_experiment_elm ){
            var job_id = 
                CROWDLOGGER.preferences.get_char_pref( "last_ran_experiment_id",
                    "N/A" );

            //B_DEBUG
            CROWDLOGGER.debug.log( "Last run job_id: " + job_id + "\n" +
                "Ran experiments: " + CROWDLOGGER.preferences.get_char_pref(
                        "ran_experiments" ) 
                );
            //E_DEBUG

            if( job_id === "N/A" || job_id === "" ){
                html = "N/A";
            } else {
                var completion_time = new Date(
                    JSON.parse( CROWDLOGGER.preferences.get_char_pref(
                        "ran_experiments" ) )[job_id] );
                var date_string = CROWDLOGGER.gui.study.pages.months_long[
                    completion_time.getMonth()] +
                    " " + completion_time.getDate();

                html = job_id + " on " +
                    date_string;
            }

            if( html !== last_completed_experiment_elm.innerHTML ){
                last_completed_experiment_elm.innerHTML = html;
            }

        }

        // Display the number of experiments completed.
        html = "0";
        if( number_completed_doc_element ){

            var ran_experiments_length = Object.keys( JSON.parse(
                CROWDLOGGER.preferences.get_char_pref(
                    "ran_experiments", "{}"))).length;

            var total_experiments_run = CROWDLOGGER.preferences.get_int_pref(
                    "total_experiments_run", 0 );

            var number_to_report = Math.max( ran_experiments_length, 
                total_experiments_run );

            html = number_to_report+""; 

            if( number_completed_doc_element.innerHTML !== html ) {
                number_completed_doc_element.innerHTML = html;
            }
        }
    }
}


/**
 * Gets messages from the server and then adds them to the given document
 * element.
 *
 * @param {object} doc_element  The document element to which the messages 
 *      should be added. 
 */
CROWDLOGGER.gui.study.pages.populate_messages = function( doc_jq, jq ){

    // Called when we hear back from the server.
    var on_server_response = function( response ){
        var html_to_add;

        // Check if there are new messages.
        var most_recent_message_id = parseInt(
            CROWDLOGGER.preferences.get_char_pref(
                'most_recent_message_id', '0' ) );

        // Split the message up into lines.
        var messages = response.split( /\n/ );

        if( response.match( /^\d/ ) !== null ){
            // Only set the id if the new message has an id that is greater
            // than the current id.
            if( parseInt( messages[0] ) > parseInt( most_recent_message_id )){
                var new_message_id = messages[0];
                CROWDLOGGER.preferences.set_char_pref(
                    'most_recent_message_id', new_message_id );
            }
        }

        // Print out the messages. Start with the second line -- that's where
        // the messages start.
        if( messages !== undefined && messages.length > 0 ) {
            var parts = messages[1].split(/\t/);
            var the_date  = new Date( parts[1] );
            var message_summary = parts[2];
            if( parts[2].length > 
                    CROWDLOGGER.gui.study.pages.MESSAGE_SUMMARY_SIZE ){
                message_summary = parts[2].substring( 0, 
                    CROWDLOGGER.gui.study.pages.MESSAGE_SUMMARY_SIZE ) + "...";
            }

            var entry = jq(
                '<span>The most recent message is from ' +
                '<span class="date">' +
                CROWDLOGGER.gui.study.pages.months_long[the_date.getMonth()] + 
                ' ' + the_date.getDate() + '</span> ' +
                '(<span class="messageSummary">"' + message_summary + 
                '"</span>).</span>');

            // If the current message is new, we should highlight it.
            if( parseInt( parts[0] ) > most_recent_message_id ){
                entry = jq("<span> class=\"newMessage\">").append(entry);
            } else {
                entry = jq("<span>").append(entry);
            }

            html_to_add = entry;

            var message_url = CROWDLOGGER.preferences.get_char_pref(
                'show_messages_url', '' );
            var total_message_count = parseInt( parts[0] );
            var new_message_count = total_message_count- most_recent_message_id;
            var message_info = '<span>There are <u>no new messages</u> of ';
            if( new_message_count > 0 ) {
                message_info = '<span>There are <u>' + new_message_count + 
                    '</u> new messages of ';
            }
            message_info += '<u>'+ total_message_count +
                '</u> total messages.</span>';

            html_to_add = jq(message_info).append('<br>').append(html_to_add).
                append('<br><a href="#" id="see_messages">'+
                'Click here to see all messages.</a></span>');

            html_to_add.find('#see_messages').click(function(){
                CROWDLOGGER.gui.windows.open_tab(message_url);
            });

        } else {
            html_to_add = jq('<span>No messages at this time.</span>');
        }

        doc_jq.html('');
        doc_jq.append(html_to_add);
        CROWDLOGGER.notifications.unset_notification( 'new_messages' );
    };

    // Check for messages.
    CROWDLOGGER.study.check_for_new_messages(10, false, on_server_response);
    
};

/**
 * Gets raffle wins from the server and then adds them to the given document
 * element.
 *
 * @param {object} doc_element  The document element to which the raffle wins
 *      should be added. 
 */
CROWDLOGGER.gui.study.pages.populate_raffle_wins = function( doc_element ){

    // Called when we hear back from the server.
    var on_server_response = function( response ){
        var DATE     = 1;
        var URL      = 2;
        var REDEEMED = 3;


        // Check if there are any winnings.
        if( response !== "" && response.match(/^GO\t/) !== null ){
            CROWDLOGGER.debug.log('Raffle response: '+ response);

            var html_to_add = "The drawings you have won are listed below " +
             "along with the date on which the drawing took place. " +
             "Click on the 'View' button to redeem and view your Amazon.com " +
             "gift card.<p><table class=\"raffleWins\">" +
             "<tr><th>Date</th><th>Link</th></tr>";
            
            var lines = response.split( "\n" ) ;
            for( var i = 0; i < lines.length; i++ ) {
                var line = lines[i];

                //B_DEBUG
                CROWDLOGGER.debug.log( "line: " + line + "\n" );
                //E_DEBUG

                var columns = line.split( "\t" );

                // Work out the date.
                var date = new Date( columns[DATE] );

                var display_date = 
                    CROWDLOGGER.gui.study.pages.months[date.getMonth()] + " " +
                    date.getDate() + ", " + date.getFullYear();

                // Form the redemption url.
                var url = CROWDLOGGER.preferences.get_char_pref(
                    "redeem_url", "" ) + "?url=" + columns[URL] +
                    "&date=" + escape( columns[DATE] );


                //B_DEBUG
                //CROWDLOGGER.debug.log( "Display date: " + displayDate + "\n" );
                //E_DEBUG
            
                var button_text = "View";
                if( columns[REDEEMED] === "no" ){
                    button_text = "View (un-redeemed)";
                }

                html_to_add += "<tr><td class=\"date\">" + 
                    display_date + "</td><td>" +
                    "<span class=\"buttonPanel\"><span class=\"button\" " +
                        "onclick=\"CROWDLOGGER.gui.windows.open_tab('" + 
                        url + "')\">" + button_text +
                    "</span></td></tr>";
            } // end for
           
            // Add all of the html to the element.
            doc_element.innerHTML = html_to_add+ "</table>";
 
        // There haven't, so let the user know.        
        } else {
            doc_element.innerHTML = 
                "You have not won any drawings at this time.";
        }
    };


    CROWDLOGGER.study.get_raffle_wins( on_server_response );
};

/**
 * Launches the help page in a new tab.
 */
CROWDLOGGER.gui.study.pages.launch_help_page = function(){
    // Get the url of the help page.
    var help_page = CROWDLOGGER.preferences.get_char_pref(
        "help_url", "" );

    CROWDLOGGER.gui.windows.open_tab( help_page, function(){} );
};


/**
 * Sends invitation emails out to the addresses specified in the form. If
 * not all of the information is provided on the form, error messages are
 * displayed. After hearing back from the server, either a 'success' message
 * is displayed or a 'failure' message. 
 *
 * @param {object} doc  The document object of the refer-a-friend page.
 * @param {object} form The specific form data.
 */
CROWDLOGGER.gui.study.pages.send_auto_email = function( doc, form ){
    var reg_id, data_missing = false, data, on_error, on_server_response;
    var elms = {
        missing_name: doc.getElementById( "missingName" ),
        missing_emails: doc.getElementById( "missingEmails" ),
        success: doc.getElementById( "success" ),
        failure: doc.getElementById( "failure" ),
        custom_failure: doc.getElementById( "custom_failure" ),
        not_registered_alert: doc.getElementById( "not_registered_alert" ),
        sending: doc.getElementById( "sending" )
    };
    var cleaned_emails_elm = doc.getElementById( "cleaned_emails" );
    var successful_emails_elm = doc.getElementById( "successful_emails" );

    var emails = CROWDLOGGER.util.clean_mixed_emails( form.emails.value );

    var unset_elm = function( elm ) {
        elm.style.display = "none";
    };
    var set_elm = function( elm ) {
        elm.style.display = "inline";
    };

    var apply_to_all_elms = function(elms, f){
        for( elm in elms ){
            f(elms[elm]);
        }
    };
    apply_to_all_elms( elms, unset_elm );

    // Check that the form as a name and list of emails.
    var check_form_val = function( value, message_elm ) {
        if( value.match(/^\s*$/) !== null ){
            data_missing = true;
            set_elm(message_elm);
        }
    }
    check_form_val( form.sender.value, elms.missing_name );
    check_form_val( emails, elms.missing_emails );

    if( data_missing ){
        return;
    }

    // Get the registration id.
    reg_id = CROWDLOGGER.preferences.get_char_pref( "registration_id", "" );
    if( reg_id === "" ){
        set_elm(elms.not_registered_alert);
        return;
    }

    apply_to_all_elms( elms, unset_elm );
    cleaned_emails_elm.innerHTML = emails;
    set_elm( elms.sending );    

    // This will be called when we hear back from the server.
    on_error = function( message ){
        unset_elm( elms.sending );
        set_elm( elms.failure );
    };

    on_server_response = function( response ) {
        if( response.match(/^(true)|(false)/) !== null ){
            var parts = response.split("\t");
            var successful = 1, failed = 2;

            dump( JSON.stringify( parts ) + "\n\n" );

            if( parts[successful].length > 0 ){
                set_elm( elms.success );
                successful_emails_elm.innerHTML = parts[successful];
            } 

            if( parts.length > failed &&  parts[failed].length > 0 ){
                elms.custom_failure.innerHTML = 
                    "There were errors sending the following emails: " + 
                    parts[failed];
                set_elm( elms.custom_failure );
            }
            unset_elm( elms.sending );
            
        } else {
            on_error( "Processing issue: " + response );
        }
    }    

    // Send the data off to the server.
    data = "userID=" + reg_id + 
           "&sender=" + encodeURIComponent( form.sender.value ) +
           "&emails=" + encodeURIComponent( 
                CROWDLOGGER.util.clean_mixed_emails(form.emails.value ) );

    CROWDLOGGER.io.network.send_data(
        CROWDLOGGER.preferences.get_char_pref( "email_url" ),
        data,
        on_server_response,
        on_error,
        "POST" );

    
};

} // END CROWDLOGGER.gui.pages NAMESPACE
