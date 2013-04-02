/**
 * @fileOverview Provides functions pertaining to registration.<p> 
 * 
 * See the  CROWDLOGGER.study.registration namespace.<p>
 * 
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */


if( CROWDLOGGER.study.registration === undefined ){

/**
 * @namespace Provides functions pertaining to registration.
 */
CROWDLOGGER.study.registration = {
    // 'true' means it is required.
    required: {
        occupation:  true,
        nationality: true,
        country:     true,
        state:       true,
        concentration: false,
        age:                true,
        gender:             true,
        ir_community:       true,
        internet_usage:     true,
        web_search_usage:   true,
        education:          true,
        multiple_installs:  true,
        primary_location:   false
    }
};

/**
 * Checks that the given document's registration form can be submitted
 * (i.e., all of the required fields have been filled out). It assumes
 * that the document has a form with name "registration" and a button named
 * "rigister".
 *
 * @param {object} doc The registration document.
 * @param {object} register_buttons The buttons to toggle when the registration
 *      page has been filled out properly (this is an additional parameter
 *      due to the welcome wizard, which places the button in a different 
 *      document).
 */
CROWDLOGGER.study.registration.check_form = function( doc ){
    //B_DEBUG
    CROWDLOGGER.debug.log( 'In check_form\n' );
    //E_DEBUG

    doc.defaultView.console.log('checking form...');
    var form, something_missing, field, skip_full_check,
        jq = doc.defaultView.jQuery, responses, i;

    // Assume everything is there.
    something_missing = false;

    // Be default, do a full check.
    skip_full_check = false;

    // All of the responses.
    responses = jq('form').serializeArray();

    if( jq('[name=multiple_installs]:checked').val() === 'yes' ){
        jq('#primary').show();

        // Check if the user has selected that this is not their primary 
        // installation. If so, they don't have to complete the rest of the 
        // registration and a note should be displayed saying as much.
        if( jq('[name=primary_location]:checked').val() === 'no' ){
            jq('#not_primary_message').show();

            // Check if the 'multiple installs' question has been answered; if so,
            // we can skip the full check.
            skip_full_check = true;
            jq('#primary_location_questions').hide();
        } else {
            jq('#not_primary_message').hide();
            jq('#primary_location_questions').show();
        }
    } else {
        jq('#primary').hide();
        var primary = null;
        for(i = 0; i < responses.length; i++){
            if( responses[i].name === 'primary_location' ){
                primary = responses[i];
            }
        }
        if( !primary ){
            responses.push({name: 'primary_location', value: 'yes'});
        } else {
            primary.value = 'yes';
        }
    }

    // If the user has already registered, we don't need to worry about checking
    // any of the fields.
    if( !CROWDLOGGER.preferences.get_bool_pref( 'registered', false ) &&
                !skip_full_check ){
        //B_DEBUG
        CROWDLOGGER.debug.log( 
            '\tUser hasn\'t registered, looking at fields...\n' );
        //E_DEBUG
        for( i = 0; i < responses.length; i++ ){
            if( CROWDLOGGER.study.registration.required[responses[i].name] &&
                    (!responses[i].value || responses[i].value==="default")){
                something_missing = true;
            }
        }
    }
    //B_DEBUG
    CROWDLOGGER.debug.log( '  something missing: ' + something_missing + '\n' );
    //E_DEBUG

    if( something_missing ) {
        jq('#register-button').attr('disabled', 'disabled');
    } else {
        jq('#register-button').removeAttr('disabled');
    }

    return true;
};

/**
 * Initializes the registration dialog. This includes hiding or exposing
 * certain page elements based on whether a user has already registered.
 *
 * @param {object} doc The registration dialog document.
 * @param {array} register_buttons The buttons to toggle when the registration
 *      page has been filled out properly (this is an additional parameter
 *      due to the welcome wizard, which places the button in a different 
 *      document).
 */
CROWDLOGGER.study.registration.initialize_registration_page = function( doc,
        register_buttons ){
    var already_registered_elm, required_mark_up, jq = doc.defaultView.jQuery;

    // Set the init element so that we don't load this twice.
    jq('#init').html('no listeners');

    // If the user has already registered...
    if( CROWDLOGGER.preferences.get_bool_pref( 'registered', false ) ){
        
        // Display the note at the top about updating their registration.
        jq('#alreadyRegistered').show();

        // Get rid of the 'required' mark up (i.e., the *'s).
        jq('[name=required]').hide();

        // Enable the button.
        jq('#register-button').removeAttr('disabled');
    } else {
        // Disable the button.
        jq('#register-button').attr('disabled', 'disabled');
    }
};


/**
 * Submits the registration. If successful, the user is marked as having
 * registered.
 * 
 * @param {object} doc The registration dialog document.
 * @param {object} win [Optional.] The registration dialog window, which will
 *      be closed if the registration has been successfully submitted to 
 *      the server.
 */
CROWDLOGGER.study.registration.submit = function( doc, win ){
    // Variables.
    var data, text_boxes, radio_groups, form, jq = doc.defaultView.jQuery;

    // Functions.
    var on_registration_server_response, on_error,
        on_id_server_response, register;

    // This will hold all of the field names and values.
    data = jq('form').serialize();


    // Handles any errors in connections.
    on_error = function( error ) {
        doc.defaultView.alert( 
            'We apologize; the system encountered an error while '+
            'registering your information. Please try again later.' );
        CROWDLOGGER.io.log.write_to_error_log({data: [{
            f: 'CROWDLOGGER.study.registration.submit',
            err:  'Error submitting registration. Error : ' + error,
            t: new Date().getTime()
        }]});
    };

    // Handles the response from the registration server.
    var on_registration_server_response = function( response ) {
        //B_DEBUG
        CROWDLOGGER.debug.log( 'Response from registration server: ' + 
            response + '\n' );
        //E_DEBUG

        // Successful registrations should begin with 'c:' (for 'confirm').
        if( response.match( /^c:/ ) ) {
            response = response.replace( /^c:/, '' );
            // The response was good -- the user is now registered.
            // Updated the preferences to reflect this and the user's
            // id code.
            CROWDLOGGER.preferences.set_bool_pref(
                    'registered', true );
            CROWDLOGGER.preferences.set_char_pref(
                    'id_code', response );

            CROWDLOGGER.notifications.unset_notification('update_registration');
            CROWDLOGGER.notifications.unset_notification('register');

            // Close the window.
            if( win ){
                win.close();
            }

        } else {
            on_error( 'Bad response from server: ' + response );
        }
    };

    // Registers the user.
    register = function() {
        data = 'userID=' +
            CROWDLOGGER.preferences.get_char_pref('registration_id') +'&'+data;

        CROWDLOGGER.io.network.send_data(
            CROWDLOGGER.io.network.get_server_url( 'registration_url' ),
            data,
            on_registration_server_response, 
            on_error,
            'POST' );
    }

    // Check if the user already has a registration id. If not, get one.
    if( CROWDLOGGER.preferences.get_char_pref(
            'registration_id' ) == '' ) {
        CROWDLOGGER.study.registration.get_new_registration_id( register,
            on_error );
    } else {
        register();
    }

    return false;
};


/**
 * Gets a registration id from the server. Upon successfully retrieving an id,
 * the given callback is called.
 *
 * @param {function} callback A function to invoke once we've heard back from
 *      the registration server and have obtained an id. It takes no arguments.
 * @param {function} on_error A function that will handle any error that arises
 *      while contacting the server.
 */
CROWDLOGGER.study.registration.get_new_registration_id = function( callback,
        on_error ){

    // Handles the response from the id server.
    on_id_server_response = function( response ) {
        //B_DEBUG
        CROWDLOGGER.debug.log( 'id server response: ' + response + '\n' );
        //E_DEBUG

        if( response.match( /^id:/ ) ) {
            var id = response.replace( /^id:/, '' );
            CROWDLOGGER.preferences.set_char_pref( 'registration_id', id );

            // Invoke the callback function.
            callback();

        } else {
            on_error( 'Invalid response from getID.php: ' + response );
        }
    };

    // Request a new id from the id server.
    CROWDLOGGER.io.network.send_data(
        CROWDLOGGER.io.network.get_server_url( 'registration_id_url' ),
        null,
        on_id_server_response,
        on_error,
        'GET' );
};


} // END CROWDLOGGER.study.registration NAMESPACE
