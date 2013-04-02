/**
 * @fileOverview Provides functions to launch various study web pages and 
 * dialogs.<p>
 * 
 * See the  CROWDLOGGER.gui.study.pages namespace.<p>
 * 
 * %%LICENSE%%
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
    months : ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 
        'Sep', 'Oct', 'Nov', 'Dec' ],
    months_long : [
        'January', 'February', 'March', 'April', 'May', 'June', 'July', 
        'August', 'September', 'October', 'November', 'December' ],
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
    // should include a 'doc' attribute pointing to the page.
    the_window.addEventListener( 'crowdlogger_status_page_refresh',
        function( e ){ 
            //B_DEBUG
            CROWDLOGGER.debug.log( 'Caught crowdlogger_status_page_refresh\n' );
            //E_DEBUG

            CROWDLOGGER.gui.study.pages.refresh_status_page(e.originalTarget);
        },
        false );

};

/**
 * Launches the update help popup.
 */
CROWDLOGGER.gui.study.pages.launch_update_help = function(){
    // Figure out whether this is FF or Chrome.
    var update_help_url;
    var browser = CROWDLOGGER.version.info.get_browser_name();
    // Firefox 3.
    if( browser === 'ff3' ) {
        update_help_url = CROWDLOGGER.preferences.get_char_pref( 
            'firefox_3_update_help_url', 'not_found.html' );
    // Firefox 4.
    } else if ( browser === 'ff4' ) {
        update_help_url = CROWDLOGGER.preferences.get_char_pref( 
            'firefox_4_update_help_url', 'not_found.html' );
    // Chrome.
    } else {
        update_help_url = CROWDLOGGER.preferences.get_char_pref( 
            'chrome_update_help_url', 'not_found.html' );
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
    var url = CROWDLOGGER.gui.windows.get_local_page('status_page_url');

    // Once the new tab has opened, this will give us a handle on it.
    CROWDLOGGER.gui.windows.open_dialog( url, '%%FULL_PROJECT_NAME%% Status Page',
            CROWDLOGGER.gui.study.pages.refresh_status_page );
};



CROWDLOGGER.gui.study.pages.refresh_status_page = function( doc ){
    // TODO Implement all the dynamic things to stick on the page.
    var jq = doc.defaultView.jQuery; 

    if( !jq ){ return };

    var init_elm         = doc.getElementById( 'init' );
    
    if( init_elm.innerHTML.length > 0 ){ return; }
    // This tells the page that it's been initialized.
    init_elm.innerHTML = 'initialized';

    // Get the elements we need to populate.
    var notification_elm = jq('#notifications').html('');
    var messages_elm     = doc.getElementById( 'messages' );
    // var experiments_elm  = doc.getElementById( 'experiments' );
    // var raffle_wins_elm  = doc.getElementById( 'raffleWins' );

    // For the special update notifications (shown after an update is installed).
    var clear_update_notification_delay = 30*1000; // 30-seconds
    var clear_update_message_delay = 30*60*1000; // 30-minutes


    CROWDLOGGER.clrm.populateCLRMLibraryPage(doc, null, null, true);

    // Place the version number.
    var version = CROWDLOGGER.version.info.get_extension_version();
    var version_elms = doc.getElementsByName( 'version_no' );
    for( var i = 0; i < version_elms.length; i++ ) {
        if( version_elms[i] ) {
            version_elms[i].innerHTML = 'version ' + version; 
        }
    }
    
    var whatsnew_elms = doc.getElementsByName( 'whatsnew' );
    for( var i = 0; i < whatsnew_elms.length; i++ ) {
        if( whatsnew_elms[i] ) {
            whatsnew_elms[i].onclick = function(){
                CROWDLOGGER.gui.windows.open_tab(
                    CROWDLOGGER.io.network.get_server_url( 'whatsnew_url' ) + 
                        '?version=' + version,
                   function(){} );
            };
        }
    }

    // Reveal the update message if need be.
    if( CROWDLOGGER.notifications.show_update_message ){
        jq('#update_message').show();

        setTimeout( 
            function(){ 
                CROWDLOGGER.notifications.show_update_message = false; 
            }, clear_update_message_delay );
    }

    // Insert the notifications.
    if( CROWDLOGGER.notifications.new_notifications > 0 ){
        jq('#notifications-wrapper').show();
        var notifications = jq('#notifications');
        // This will keep track of how many notifications have
        // been posted.
        var notifications_posted = 0;
        var note_board = CROWDLOGGER.notifications;

        var attach_notification = function(id, message, buttons){
            var i;
            var notification = jq('#notification').clone().attr('id', id);
            notification.appendTo(notifications);
            notification.find('[data-type=message]').html(message);
            for(i = 0; i < buttons.length; i++){
                var button = jq('#notification-button').clone().
                    attr('id',  buttons[i].id).
                    html(buttons[i].label).
                    appendTo(notification.find('[data-type=buttons]'));
                if( buttons[i].on_click ){
                    button.click(buttons[i].on_click);
                }
            }
        }

        // Check for notifications about an available update.
        if( note_board.extension_update > 0 ){
            notifications_posted++;

            attach_notification(
                'extension_update_notification',
                'There is a new version of %%PROJECT_NAME%% '+
                'available. Please download and install it '+
                'as soon as you can.', [{
                    id: 'launch_update_help',
                    label: 'See how to update',
                    on_click: function(){
                        CROWDLOGGER.gui.study.pages.launch_update_help(); 
                        return false;
                    }
                }]
            );

        }


        // Check for notifications about an available update.
        if( note_board.study_updates > 0 ){
            notifications_posted++;

            attach_notification(
                'study_updates_notification',
                'There are new messages from one or more of your installed '+
                'apps/studies. Check the apps and studies sections below.', [{
                    id: 'dismiss_update_registration_notification',
                    label: 'Dismiss',
                    on_click: function(){
                        CROWDLOGGER.notifications.unset_notification(
                            'study_updates');
                        jq('#study_updates_notification').hide();
                        return false;
                    }
                }]
            );

            // Clear this after a minute.
            setTimeout( 
                function(){
                    CROWDLOGGER.notifications.unset_notification(
                        'study_updates' );
                }, clear_update_notification_delay );

        }


        // Register.
        if( note_board.register > 0 ) {
            notifications_posted++;

            attach_notification(
                'register_notification',
                'You have not registered yet, would you like to now?', [{
                    id: 'launch_registration_dialog',
                    label: 'Register',
                    on_click: function(){
                        CROWDLOGGER.study.launch_registration_dialog();
                        CROWDLOGGER.notifications.
                            set_registration_dismissed(false);
                        jq('#register_notification').hide();
                    }
                },{
                    id: 'dismiss_registration_notification',
                    label: 'Dismiss',
                    on_click: function(){
                        CROWDLOGGER.notifications.
                            unset_notification('register');
                        jq('#register_notification').hide();
                        CROWDLOGGER.notifications.
                            set_registration_dismissed(true);
                        return false;
                    }
                }]
            );

            // Clear this after a minute.
            setTimeout(
                function(){
                    CROWDLOGGER.notifications.unset_notification(
                        'register' );
                }, clear_update_notification_delay );

        } else if( note_board.registration_dismissed() ) {
            notifications_posted++;

            attach_notification(
                'register_notification',
                'You have not registered yet, would you like to now?', [{
                    id: 'launch_registration_dialog',
                    label: 'Register',
                    on_click: function(){
                        CROWDLOGGER.study.launch_registration_dialog();
                        CROWDLOGGER.notifications.
                            set_registration_dismissed(false);
                        jq('#register_notification').hide();
                    }
                }]
            );
        }         


        // Update Registration.
        if( note_board.update_registration > 0 ) {
            notifications_posted++;

            attach_notification(
                'update_registration_notification',
                'Would you like to update your registration?', [{
                    id: 'update_registration',
                    label: 'Update registration',
                    on_click: function(){
                        CROWDLOGGER.study.launch_registration_dialog();
                        CROWDLOGGER.notifications.unset_notification(
                            'update_registration'); 
                        return false;
                    }
                }, {
                    id: 'dismiss_update_registration_notification',
                    label: 'Dismiss',
                    on_click: function(){
                        CROWDLOGGER.notifications.unset_notification(
                            'update_registration');
                        jq('#update_registration_notification').hide();
                        return false;
                    }
                }]
            );

            // Clear this after a minute.
            setTimeout( 
                function(){
                    CROWDLOGGER.notifications.unset_notification(
                        'update_registration' );
                }, clear_update_notification_delay );
        }


        // // Set a pass phrase.
        // if( note_board.set_passphrase > 0 ) {
        //     notifications_posted++;

        //     attach_notification(
        //         'set_passphrase_notification',
        //         'You have not set a pass phrase yet!', [{
        //             id: 'set_passphrase',
        //             label: 'Set pass phrase',
        //             on_click: function(){
        //                 CROWDLOGGER.gui.preferences.launch_preference_dialog();
        //                 jq('#set_passphrase_notification').hide();  
        //                 return false;
        //             }
        //         }, {
        //             id: 'dismiss_passphrase_notification',
        //             label: 'Dismiss',
        //             on_click: function(){
        //                 CROWDLOGGER.notifications.unset_notification(
        //                     'set_passphrase');
        //                 jq('#set_passphrase_notification').hide();
        //                 return false;
        //             }
        //         }]
        //     );
        // }

        // Update settings.
        if( note_board.update_settings > 0 ) {
            notifications_posted++;

            attach_notification(
                'update_settings_notification',
                'Would you like to update your settings?', [{
                    id: 'launch_preference_dialog',
                    label: 'Update settings',
                    on_click: function(){
                        CROWDLOGGER.gui.preferences.launch_preference_dialog(); 
                        CROWDLOGGER.notifications.unset_notification(
                            'update_settings'); 
                        return false;
                    }
                }, {
                    id: 'unset_update_settings_notification',
                    label: 'Dismiss',
                    on_click: function(){
                        CROWDLOGGER.notifications.unset_notification(
                            'update_settings');
                        jq('#update_settings_notification').hide();
                        return false;
                    }
                }]
            );

            // Clear this after a minute.
            setTimeout( 
                function(){
                    CROWDLOGGER.notifications.unset_notification(
                        'update_settings' );
                }, clear_update_notification_delay );
        }

        // Check for notifications about unread messages.
        if( note_board.new_messages > 0 ){
            notifications_posted++;

            attach_notification(
                'update_settings_notification',
                'There are <a href="#messages">new messages</a> ' +
                ' from the project researchers.',[]
            );
        }

        // if( notifications_posted === 0 ){
        //     notification_elm.html('No new notifications');
        //     note_board.new_notifications = 0;
        // } else {
        //     //notifications += '</table>';
        //     //B_DEBUG   
        //     // CROWDLOGGER.debug.log( 'Added ' + notifications + 
        //     //     ' to the status page.\n' );
        //     //E_DEBUG
        //     //notification_elm.innerHTML = notifications;
        //     notification_elm.append(notifications);
        // }
    } 

    // Now take care of the messages section.
    if( messages_elm ){
        messages_elm.innerHTML = '<span class="loading">Loading ...</span>';
        setTimeout( function(){
            CROWDLOGGER.gui.study.pages.populate_messages(jq(messages_elm), jq);
        }, 5 );
    }

    // CROWDLOGGER.gui.study.pages.populate_experiments_status( doc,
    //     experiments_elm );

    // // And now the raffle wins.
    // if( raffle_wins_elm ){
    //     raffle_wins_elm.innerHTML = 
    //         '<span class="loading">Loading ...</span>';
    //     setTimeout( function(){
    //         CROWDLOGGER.gui.study.pages.populate_raffle_wins( 
    //             jq(raffle_wins_elm), jq );
    //     }, 5 );
    // }

    // // This tells the page that it's been initialized.
    // init_elm.innerHTML = "initialized";

    if( CROWDLOGGER.preferences.get_bool_pref('dev_mode', false) ){
        jq('#launch_dev_tools').show();

    }
    
    doc.defaultView.refreshLayout();
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
            doc.getElementById( 'running_experiments' );
        var upcoming_doc_element = 
            doc.getElementById( 'upcoming_experiments' );
        var last_completed_experiment_elm =
            doc.getElementById( 'last_completed_experiment' );
        var number_completed_doc_element =
            doc.getElementById( 'number_completed_experiments' );

        var current_running_job_id = '';

        // Display the current running experiment
        var html = '<span class=\"note\">None</span>';
        if( CROWDLOGGER.session_data.keep_running_experiments === true ){
            //B_DEBUG
            // CROWDLOGGER.debug.log( 'running_doc_element: ' + 
            //     running_doc_element + 
            //     '\nCROWDLOGGER.session_data.keep_running_experiments: ' + 
            //     CROWDLOGGER.session_data.keep_running_experiments + '\n' );
            //E_DEBUG

            current_running_job_id = JSON.parse(
                CROWDLOGGER.preferences.get_char_pref(
                    'current_running_experiment', '{}' ) ).job_id;
            html = current_running_job_id + 
                ' <span class="note">(' + 
                CROWDLOGGER.session_data.current_running_experiment_status.
                    message + ')</span>'; 
        } 
             
        if( running_doc_element && running_doc_element.innerHTML !== html ) {
            running_doc_element.innerHTML = html;
        }
        
        // Generate the list of upcoming experiments.
        html = '<span class="note">None</span>'
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
                    CROWDLOGGER.session_data.job_indicies_to_run[i] + '<br>';
            }
        }

        // CROWDLOGGER.debug.log('start_index: '+ start_index +
        //   '; upcoming_doc_element.innerHTML: '+ upcoming_doc_element.innerHTML);

        if( upcoming_doc_element && upcoming_doc_element.innerHTML !== html ) {
            upcoming_doc_element.innerHTML = html;
        }

        // Display info about the most recently completed experiment.
        html = 'N/A';
        if( last_completed_experiment_elm ){
            var job_id = 
                CROWDLOGGER.preferences.get_char_pref( 'last_ran_experiment_id',
                    'N/A' );

            //B_DEBUG
            // CROWDLOGGER.debug.log( 'Last run job_id: ' + job_id + '\n' +
            //     'Ran experiments: ' + CROWDLOGGER.preferences.get_char_pref(
            //             'ran_experiments' ) 
            //     );
            //E_DEBUG

            if( job_id === 'N/A' || job_id === '' ){
                html = 'N/A';
            } else {
                var completion_time = new Date(
                    JSON.parse( CROWDLOGGER.preferences.get_char_pref(
                        'ran_experiments' ) )[job_id] );
                var date_string = CROWDLOGGER.gui.study.pages.months_long[
                    completion_time.getMonth()] +
                    ' ' + completion_time.getDate();

                html = job_id +' on '+
                    date_string;
            }

            if( html !== last_completed_experiment_elm.innerHTML ){
                last_completed_experiment_elm.innerHTML = html;
            }
        }

        // Display the number of experiments completed.
        html = '0';
        if( number_completed_doc_element ){

            var ran_experiments_length = Object.keys( JSON.parse(
                CROWDLOGGER.preferences.get_char_pref(
                    'ran_experiments', '{}'))).length;

            var total_experiments_run = CROWDLOGGER.preferences.get_int_pref(
                    'total_experiments_run', 0 );

            var number_to_report = Math.max( ran_experiments_length, 
                total_experiments_run );

            html = number_to_report+''; 

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
                entry = jq('<span class="newMessage">').append(entry);
            } else {
                entry = jq('<span>').append(entry);
            }

            html_to_add = entry;

            var message_url = CROWDLOGGER.io.network.get_server_url(
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
 * Launches the help page in a new tab.
 */
CROWDLOGGER.gui.study.pages.launch_help_page = function(){
    // Get the url of the help page.
    var help_page = CROWDLOGGER.io.network.get_server_url(
        'help_url', '' );

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
        missing_name: doc.getElementById( 'missingName' ),
        missing_emails: doc.getElementById( 'missingEmails' ),
        success: doc.getElementById( 'success' ),
        failure: doc.getElementById( 'failure' ),
        custom_failure: doc.getElementById( 'custom_failure' ),
        not_registered_alert: doc.getElementById( 'not_registered_alert' ),
        sending: doc.getElementById( 'sending' )
    };
    var cleaned_emails_elm = doc.getElementById( 'cleaned_emails' );
    var successful_emails_elm = doc.getElementById( 'successful_emails' );

    var emails = CROWDLOGGER.util.clean_mixed_emails( form.emails.value );

    var unset_elm = function( elm ) {
        elm.style.display = 'none';
    };
    var set_elm = function( elm ) {
        elm.style.display = 'inline';
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
    reg_id = CROWDLOGGER.preferences.get_char_pref( 'registration_id', '' );
    if( reg_id === '' ){
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
            var parts = response.split('\t');
            var successful = 1, failed = 2;

            dump( JSON.stringify( parts ) + '\n\n' );

            if( parts[successful].length > 0 ){
                set_elm( elms.success );
                successful_emails_elm.innerHTML = parts[successful];
            } 

            if( parts.length > failed &&  parts[failed].length > 0 ){
                elms.custom_failure.innerHTML = 
                    'There were errors sending the following emails: ' + 
                    parts[failed];
                set_elm( elms.custom_failure );
            }
            unset_elm( elms.sending );
            
        } else {
            on_error( 'Processing issue: ' + response );
        }
    }    

    // Send the data off to the server.
    data = 'userID=' + reg_id + 
           '&sender=' + encodeURIComponent( form.sender.value ) +
           '&emails=' + encodeURIComponent( 
                CROWDLOGGER.util.clean_mixed_emails(form.emails.value ) );

    CROWDLOGGER.io.network.send_data(
        CROWDLOGGER.io.network.get_server_url( 'email_url' ),
        data,
        on_server_response,
        on_error,
        'POST' );
};


} // END CROWDLOGGER.gui.pages NAMESPACE
