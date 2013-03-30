/**
 * @fileOverview Provides functions for the interface between the user and
 * preferences.<p> 
 * 
 * See the CROWDLOGGER.gui.preferences namespace.<p>
 * 
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%% 
 */


if( CROWDLOGGER.gui.preferences === undefined ){

/**
 * @namespace Provides functions for the interface between the user and
 * preferences.
 */
CROWDLOGGER.gui.preferences = {
    required:   {
        pass_phrase: true
    }
};

/**
 * Launches the preferences page. Note: right now, only char and bool 
 * preferences are supported. 
 */
CROWDLOGGER.gui.preferences.launch_preference_dialog = function(){
    // The page to load.
    var preference_page = CROWDLOGGER.preferences.get_char_pref(
        "preference_dialog_url", "not_found.html" );

    // The prefix for the extension's html files.
    var extension_prefix = CROWDLOGGER.version.info.get_extension_html_prefix();

    // The full url.
    var url = extension_prefix + preference_page;

    // When the page loads.
    var on_page_load = function( doc ){
        // For now, just refresh the page.
        CROWDLOGGER.gui.preferences.refresh_preference_page( doc );
    };

    // Open the window and call the handler when the page loads.
    CROWDLOGGER.gui.windows.open_dialog( url, "preferences",
        on_page_load );
};

/**
 * Populates the preference form in the given document.
 *
 * @param {object} doc The document containing the preference form.
 */
CROWDLOGGER.gui.preferences.refresh_preference_page = function( doc ) {

    var form, preference_cache;

    // Set the init element so that we don't load this twice.
    var init_elm         = doc.getElementById( "init" );
    if( init_elm ){
        init_elm.innerHTML = "true";
    }    

    // A cache for preferences. This is due to the nature of radio button
    // groups.
    preference_cache = {};

    // Get the form and make sure it's valid.
    form = doc.forms.settings;
    if( !form ){
        // Hmm...
    }

    // Loop through each of the fields in the form. Figure out what their
    // type is and how to extract the value.
    for( var i = 0; i < form.length; i++ ){
        var field = form[i];
        var value;
        var is_bool;

        if( field.type === "radio" ){
            is_bool = true;
        }

        // Check if the currently stored value is cached. If not, cache it. 
        if( preference_cache[field.name] === undefined ){
            if( is_bool ){
                preference_cache[field.name] =
                    CROWDLOGGER.preferences.get_bool_pref(field.name, false);
            } else {
                preference_cache[field.name] =
                    CROWDLOGGER.preferences.get_char_pref(field.name, "");
            }    
        }

        // Get the value.
        value = preference_cache[field.name];

        // If this is a radio group (boolean), we need to check if the
        // current radio button has the correct value, at which point we
        // will check it.
        if( is_bool ){
            if( field.value === ""+value ){
                field.checked = true;
            }
        // If this is a text box, we can set the value initially. 
        } else {
            field.value = value;
        }
    } 
};


/**
 * Saves the preferences on the given preference page. If everything has
 * been entered that needs to be (e.g., the pass phrase), then the preferences
 * will be saved and either the window will be closed or ... TODO
 *
 * @param {object} doc The document of the preference page.
 * @param {object} win [Optional.] The window of the preference page. If given,
 *      the window will be closed when the preferences are successfully saved.
 *
 * @return Whether or not the preferences were saved successfully.
 */
CROWDLOGGER.gui.preferences.submit_preferences = function( doc, win ){

    var form, is_missing_required_field, processed_preferences;

    // A flag that will tell us whether something is missing.
    is_missing_required_field = false;

    // Holds all of the saved preferences. We use this because of the way
    // radio groups are stored in the forms array.
    processed_preferences = {};

    // Get the form and make sure it's valid.
    form = doc.forms.settings;
    if( !form ){
        alert( "There was an error saving your preferences." );
    }

    // Loop through each of the fields in the form. Figure out what their
    // type is and how to extract the value.
    for( var i = 0; i < form.length; i++ ){
        var field = form[i];
        var value;

        if( processed_preferences[field.name] || !field.name ){
            continue;
        }

        // Extract the value.
        if( field.type === "radio" ){
            value = CROWDLOGGER.util.get_selected_radio_button(form[field.name]);
            value = (value === "true" )
        } else {
            value = field.value;
        }

        //B_DEBUG
        CROWDLOGGER.debug.log( "Saving preference; name: " + field.name +
            " value: " + value + "\n" ); 
        //E_DEBUG

        // Check if it's mandatory and missing.
        if( value === "" ){
            CROWDLOGGER.debug.log( "value is empty\n" );
            if( CROWDLOGGER.gui.preferences.required[field.name] ){
                CROWDLOGGER.debug.log( "\t...and it's a required field\n" );
                
                is_missing_required_field = true;
            }
        }

        processed_preferences[field.name] = value;
    }

    // Hide or show the "missing field" alert at the top of the page.
    var missing_fields_alert_elm = doc.getElementById( "missing_fields_alert" );
    if( missing_fields_alert_elm ){
       if( is_missing_required_field ){
            CROWDLOGGER.debug.log( "trying to display alert\n" );

            // Display the alert at the top of the page.
            missing_fields_alert_elm.style.display = "inline";

            // Go to the top of the page.
            doc.location.href.hash = "";
    
            return false;
        } else {
            missing_fields_alert_elm.style.display = "none";

            // Save the preferences.
            for( var pref in processed_preferences ){
                CROWDLOGGER.debug.log( "Saving " + pref + "\n" );
                if( (typeof processed_preferences[pref]) === "boolean" ){
                    CROWDLOGGER.preferences.set_bool_pref( pref, 
                        processed_preferences[pref] );
                } else {
                    CROWDLOGGER.preferences.set_char_pref( pref,
                        processed_preferences[pref] );
                }
            }
           
            // Since the pass phrase is required, if we've made it to this
            // point, the pass phrase must have been set and we can remove
            // any notifications for it. 
            CROWDLOGGER.notifications.unset_notification( "set_passphrase" );
        
            if( win !== undefined ){
                win.close();
            } else {
                doc.defaultView.jQuery('#saved').show().fadeOut(1000);
            }
            return true;
        }
    
    } else {
        alert( "There was an unexpected error and your settings were not " +
            "saved. Please try again." );
        return false;
    }

};


} // END CROWDLOGGER.gui.pages NAMESPACE
