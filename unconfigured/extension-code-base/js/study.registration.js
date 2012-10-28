/**
 * @fileOverview Provides functions pertaining to registration.<p> 
 * 
 * See the  CROWDLOGGER.study.registration namespace.<p>
 * 
 * %%VERSION%%
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
    text_boxes: {
        occupation:  true,
        nationality: true,
        country:     true,
        state:       true,
        referrer:    false,
        concentration: false
    },
    radio_groups: {
        age:                true,
        gender:             true,
        ir_community:       true,
        internet_usage:     true,
        web_search_usage:   true,
        education:          true,
        multiple_installs:  true,
        primary_location:   true
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
CROWDLOGGER.study.registration.check_form = function( doc, register_buttons ){
    //B_DEBUG
    CROWDLOGGER.debug.log( "In check_form\n" );
    //E_DEBUG

    var form, something_missing, text_boxes, radio_groups, skip_full_check;


    // Assume everything is there.
    something_missing = false;
    // Be default, do a full check.
    skip_full_check = false;

    // Get the form and button. If either does not exist, just return.
    form = doc.forms.registration;
    if( !form ){
        return false;
    }
    
    //B_DEBUG
    CROWDLOGGER.debug.log( "\tFound form...\n" );
    //E_DEBUG

    // Check if the user has selected that this is not their primary 
    // installation. If so, they don't have to complete the rest of the 
    // registration and a note should be displayed saying as much.
    var primary_questions_elm = 
        doc.getElementById( "primary_location_questions" );
    var not_primary_note_elm = 
        doc.getElementById( "not_primary_message" );
    var is_primary_note_elm =
        doc.getElementById( "is_primary_message" );

    if( CROWDLOGGER.util.get_selected_radio_button( form["primary_location"] ) ===
            "no" ) {
        if( primary_questions_elm ){
            // Hide the rest of the registration.
            primary_questions_elm.style.display = "none";
            // Show the note about why the rest of the registration is being
            // hidden.
            not_primary_note_elm.style.display = "inline";
        } 

        // Check if the 'multiple installs' question has been answered; if so,
        // we can skip the full check.
        if( CROWDLOGGER.util.get_selected_radio_button( 
                form["multiple_installs"] ) !== "default" ){
            skip_full_check = true;
        }

    } else {
        if( primary_questions_elm ){
            // Show the rest of the registration.
            primary_questions_elm.style.display = "";
            // Hide the message.
            not_primary_note_elm.style.display = "none";
        }

    }

    // Check if the "this is my primary install" option is selected; if so,
    // show the message next to it.
    if( CROWDLOGGER.util.get_selected_radio_button( 
           form["primary_location"] ) === "yes" ) {
        is_primary_note_elm.style.display = "inline";
    } else {
        is_primary_note_elm.style.display = "none";
    }



    text_boxes = CROWDLOGGER.study.registration.text_boxes;
    radio_groups =CROWDLOGGER.study.registration.radio_groups;

    // If the user has already registered, we don't need to worry about checking
    // any of the fields.
    if( !CROWDLOGGER.preferences.get_bool_pref( "registered", false ) &&
                !skip_full_check ){
        //B_DEBUG
        CROWDLOGGER.debug.log( "\tUser hasn't registered, looking at fields...\n" );
        //E_DEBUG
        
        // Loop through each of the set of mandatory things and check that
        // the corresponding fields have been filled out. If one is not, we'll
        // set the something missing flag to true.
        for( var name in text_boxes ){
            var textbox = form[name];
            //B_DEBUG
            CROWDLOGGER.debug.log( "\texamining " + textbox.name + "\n" );   
            //E_DEBUG

            if( text_boxes[name] && textbox !== null && textbox.value === "" ){
                something_missing = true;
                break;
            }
        }
 
        if( !something_missing ){ 
            var get_selected_value = 
                CROWDLOGGER.util.get_selected_radio_button;
            for( var name in radio_groups ){
                var group = form[name];

                //B_DEBUG
                CROWDLOGGER.debug.log( "\texamining " + group[0].name + ": " +
                            get_selected_value( group ) +";\n" ); 
                CROWDLOGGER.debug.log( 
                    "  radio_groups[name]:  " + radio_groups[name] + "\n" +
                    "  group !== null:       " + (group !== null ) + "\n" +
                    "  selectedval==default: " + 
                        (get_selected_value(group) === "default") + "\n" ); 
                //E_DEBUG

                if( radio_groups[name] && group !== null && 
                        get_selected_value(group) === "default" ){
                    something_missing = true;
                    break;
                }
        
            }
        }

    }

    

    //B_DEBUG
    CROWDLOGGER.debug.log( "  something missing: " + something_missing + "\n" );
    //E_DEBUG
    
    // Check if we should re-enable the button.
    if( register_buttons === undefined ){

        register_buttons = [doc.getElementById("register_button_enabled"), 
                            doc.getElementById("register_button_disabled")];
    }

    //B_DEBUG
    CROWDLOGGER.debug.log( "Got register buttons.\n" );
    //E_DEBUG

    if( something_missing ) {
        CROWDLOGGER.util.disable_button( register_buttons );
    } else {
        CROWDLOGGER.util.enable_button( register_buttons );
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
    var already_registered_elm, required_mark_up;

    // Set the init element so that we don't load this twice.
    var init_elm = doc.getElementById( "init" );
    if( init_elm ){
        init_elm.innerHTML = "no listeners";
    }

    // Check if we should re-enable the button.
    if( register_buttons === undefined ){
        register_buttons = [doc.getElementById("register_button_enabled"), 
                            doc.getElementById("register_button_disabled")];
    }

    // If the user has already registered...
    if( CROWDLOGGER.preferences.get_bool_pref( "registered", false ) ){
        
        // Display the note at the top about updating their registration.
        already_registered_elm = doc.getElementById( "alreadyRegistered" );
        if( already_registered_elm ){
            already_registered_elm.style.display = "inline";
        }

        // Get rid of the "required" mark up (i.e., the *'s).
        required_mark_up = doc.getElementsByName( "required" );
        for( var i = 0; i < required_mark_up.length; i++ ){
            var elm = required_mark_up[i];
            if( elm.style !== undefined ){
                elm.style.display = "none";
            }
        }
        
        // Enable the button.
        CROWDLOGGER.util.enable_button( register_buttons );
    } else {
        // Disable the button.
        CROWDLOGGER.util.disable_button( register_buttons );
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
    var data, text_boxes, radio_groups, form;

    // Functions.
    var on_registration_server_response, on_error,
        on_id_server_response, register;

    // This will hold all of the field names and values.
    data = "";

    // Get the form. If it isn't present, just return false.
    form = doc.forms.registration;
    if( form === null ){
        return false;
    }

    // Go through all of the fields, adding their values to the data string.
    radio_groups = CROWDLOGGER.study.registration.radio_groups;
    text_boxes = CROWDLOGGER.study.registration.text_boxes;

    // Extract text box info.
    for( var name in text_boxes ){
        data += "&" + name + "=" + form[name].value;
    }

    // Extract radio group info.
    for( var name in radio_groups ){
        if( form[name] ){
            try{
            data += "&" + name + "=" + 
                CROWDLOGGER.util.get_selected_radio_button(
                    form[name]);
            } catch (e){
                CROWDLOGGER.debug.log( "Problem with" + name + ": " + e + "\n" );
                return false;
            }
        } else {
            CROWDLOGGER.debug.log( "Hmm, " + name + " not found...strange.\n" );
        }
    }

    // Add the check box at the end.
    if( form.optOut ){
        data += "&optOutPayment=" + form.optOut.checked;
    }

    // Handles any errors in connections.
    on_error = function( error ) {
        alert( "We apologize; the system encountered an error while "+
            "registering your information. Please try again later." );
        CROWDLOGGER.io.log.write_to_error_log(
            "Error during registration. Error : " + error );
    };

    // Handles the response from the registration server.
    var on_registration_server_response = function( response ) {
        //B_DEBUG
        CROWDLOGGER.debug.log( "Response from registration server: " + 
            response + "\n" );
        //E_DEBUG

        // Successful registrations should begin with 'c:'.
        if( response.match( /^c:/ ) ) {
            response = response.replace( /^c:/, "" );
            // The response was good -- the user is now registered.
            // Updated the preferences to reflect this and the user's
            // id code.
            CROWDLOGGER.preferences.set_bool_pref(
                    "registered", true );
            CROWDLOGGER.preferences.set_char_pref(
                    "id_code", response );

            CROWDLOGGER.notifications.unset_notification('update_registration');
            CROWDLOGGER.notifications.unset_notification('register');

            // Launch the refer a friend dialog, and make sure the
            // post_registration element on that page is displayed.
            //CROWDLOGGER.study.launch_refer_a_friend_dialog( true );

            // Close the window.
            if( win ){
                win.close();
            }

        } else {
            on_error( "Bad response from server: " + response );
        }
    };

    // Registers the user.
    register = function() {
        data = "userID=" +
            CROWDLOGGER.preferences.get_char_pref( "registration_id" ) + data;

        CROWDLOGGER.io.network.send_data(
            CROWDLOGGER.preferences.get_char_pref( "registration_url" ),
            data,
            on_registration_server_response, 
            on_error,
            "POST" );
    }

    // Check if the user already has a registration id. If not, get one.
    if( CROWDLOGGER.preferences.get_char_pref(
            "registration_id" ) == "" ) {
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
        CROWDLOGGER.debug.log( "id server response: " + response + "\n" );
        //E_DEBUG

        if( response.match( /^id:/ ) ) {
            var id = response.replace( /^id:/, "" );
            CROWDLOGGER.preferences.set_char_pref( "registration_id", id );

            // Invoke the callback function.
            callback();

        } else {
            on_error( "Invalid response from getID.php: " + response );
        }
    };

    // Request a new id from the id server.
    CROWDLOGGER.io.network.send_data(
        CROWDLOGGER.preferences.get_char_pref(
            "registration_id_url" ),
        null,
        on_id_server_response,
        on_error,
        "GET" );
};


} // END CROWDLOGGER.study.registration NAMESPACE
