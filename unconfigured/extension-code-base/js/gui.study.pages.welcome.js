/**
 * @fileOverview Provides functions for modifying pages shown in the
 * welcome wizard.<p>
 * 
 * See the CROWDLOGGER.gui.study.pages.welcome namespace.<p>
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */


if( CROWDLOGGER.gui.study.pages.welcome === undefined ){

/**
 * @namespace Provides functions for modifying pages shown in the
 * welcome wizard.
 */
CROWDLOGGER.gui.study.pages.welcome = {};

/**
 * Populates the first welcome page and modifies it for the welcome wizard.
 *
 * @param {object} welcome_doc The document for the welcome page.
 * @param {object} starter_doc The document for the starter page.
 */
CROWDLOGGER.gui.study.pages.welcome.modify_start_page = function(  welcome_doc,
        starter_doc ){
    var jq = welcome_doc.defaultView.jQuery;
    
    // Change the next/skip buttons on the wizard.
    var register_button_enabled =
        welcome_doc.getElementById( "welcome_wizzard_next_button" );
    var register_button_disabled =
        welcome_doc.getElementById( "welcome_wizzard_next_button_disabled" );
    var skip_button =
        welcome_doc.getElementById( "welcome_wizzard_skip_button" );


    if( register_button_enabled && register_button_disabled ){
        register_button_enabled.innerHTML = "Continue";
        jq(register_button_enabled).unbind('click').click(
            welcome_doc.defaultView.next);

        CROWDLOGGER.util.enable_button( [register_button_enabled, 
            register_button_disabled] );
    }
    if( skip_button ){
        skip_button.style.display = "none";
    }

    // Is this a new install or an update?
    var new_install_elm = starter_doc.getElementById( "new_install" );
    var update_elm = starter_doc.getElementById( "update" );
    if( CROWDLOGGER.preferences.get_bool_pref( "first_load", true ) ){
        new_install_elm.style.display = "block";
        update_elm.style.display = "none";
        CROWDLOGGER.preferences.set_bool_pref( "first_load", false )
    } else {
        new_install_elm.style.display = "none";
        update_elm.style.display = "block";
    }
        
};

/**
 * Makes necessary modifications to the final page of the welcome wizard.
 *
 * @param {object} welcome_doc The document for the welcome page.
 * @param {object} closer_doc The document for the closing page.
 */
CROWDLOGGER.gui.study.pages.welcome.modify_last_page = function(
        welcome_doc, closer_doc ){
    var jq = welcome_doc.defaultView.jQuery;

    // Change the welcome wizard so that there is a "show status"
    // and "exit" button.
    var register_button_enabled =
        welcome_doc.getElementById( "welcome_wizzard_next_button" );
    var register_button_disabled =
        welcome_doc.getElementById( "welcome_wizzard_next_button_disabled" );
    var skip_button =
        welcome_doc.getElementById( "welcome_wizzard_skip_button" );


    if( register_button_enabled && register_button_disabled ){
        register_button_enabled.innerHTML = "Show the status page";
        jq(register_button_enabled).unbind('click').click( 
            CROWDLOGGER.gui.study.pages.launch_status_page);

        CROWDLOGGER.util.enable_button( [register_button_enabled,
            register_button_disabled] );
    }
    if( skip_button ){
        skip_button.innerHTML = "Finished";
        jq(skip_button).unbind('click').click(function(){ 
            welcome_doc.defaultView.open('', '_self', ''); 
            welcome_doc.defaultView.close();
        });
        skip_button.style.display = "";
    }
};

/**
 * Determines if the consent form page should be shown in the welcome wizard.
 * Right now, it is only shown if the user has not consented to the most recent 
 * version.
 */
CROWDLOGGER.gui.study.pages.welcome.should_consent_form_be_shown = function(){
    if( CROWDLOGGER.preferences.get_bool_pref( "consent_required", true ) ){
        CROWDLOGGER.debug.log( "Consent required.\n" );
        return true;
    } else {
        CROWDLOGGER.debug.log( "Consent is not required.\n" );
        return false;
    }
};


/**
 * Populates the consent page and modifies it for the welcome wizard.
 *
 * @param {object} welcome_doc The document for the welcome page.
 * @param {object} consent_doc The document for the consent page.
 */
CROWDLOGGER.gui.study.pages.welcome.modify_consent_form = function( welcome_doc,
        consent_doc ){
    var jq = welcome_doc.defaultView.jQuery;

    // Populate the consent page.
    CROWDLOGGER.gui.study.pages.refresh_consent_page( consent_doc );

    // Modify it's structure a bit -- remove the subtitles and change the 
    // action of the accept button.
    var subtitle_elm = consent_doc.getElementById( "subtitle" );
    if( subtitle_elm ){
        subtitle_elm.style.display = "none";
    }
    // Change the directions.
    var normal_description_elm = 
        consent_doc.getElementById( "normal_description" );
    if( normal_description_elm ){
        normal_description_elm.style.display = "none";
    }
    var welcome_wizard_description_elm = 
        consent_doc.getElementById( "welcome_wizard_description" );
    if( welcome_wizard_description_elm ){
        welcome_wizard_description_elm.style.display = "";
    }

    // Get rid of the default button panel that is on the original consent page.
/*    var button_panel_elm = consent_doc.getElementById( "button_panel" );
    if( button_panel_elm ){
        button_panel_elm.style.display = "none";
    }
*/
    // Re-assign the action associated with the "I agree" and "I do not agree"
    // buttons.
    // Accept button:
    var on_accept = 
        "CROWDLOGGER.study.user_accepted_consent_form(); parent.next();";
    var next_button = consent_doc.getElementById( "agree_button" );
    if( next_button ){
        jq(next_button).unbind('click').click( welcome_doc.defaultView.on_accept ); 
        next_button.innerHTML = "Accept and continue";
    }
    // Decline button:
    var decline_button = consent_doc.getElementById( "decline_button" );
    if( decline_button ){
        jq(decline_button).unbind('click').click( function(){
            welcome_doc.defaultView.parent.open('', '_self', ''); 
            welcome_doc.defaultView.parent.close();
        });            
        decline_button.innerHTML = "Decline and exit";
    }

    // Remove the welcome wizard button panel.
    var welcome_wizard_button_panel = welcome_doc.getElementById(
        "welcome_wizard_button_panel" );
    if( welcome_wizard_button_panel ) {
        welcome_wizard_button_panel.style.display = "none";
    }
/*

    // Change the next button for the wizard.
    var welcome_wizzard_next_button = 
        welcome_doc.getElementById( "welcome_wizzard_next_button" );
    if( welcome_wizzard_next_button ) {
        welcome_wizzard_next_button.setAttribute( "onclick", "" );
        welcome_wizzard_next_button.innerHTML = "Accept and continue";
        // This is disabled until the user has clicked the link at the
        // bottom of the consent form.
        welcome_wizzard_next_button.setAttribute( "class",
            welcome_wizzard_next_button.getAttribute( "class" ) + " disabled" );
    }
    var welcome_wizzard_next_button_disabled = 
        welcome_doc.getElementById( "welcome_wizzard_next_button_disabled" );

    // Enable the next button.
    CROWDLOGGER.util.enable_button( [welcome_wizzard_next_button,
                                   welcome_wizzard_next_button_disabled] );

    // Change the skip button.
    var skip_button = 
        welcome_doc.getElementById( "welcome_wizzard_skip_button" );
    if( skip_button ){
        skip_button.innerHTML = "Decline and exit";
        skip_button.setAttribute( "onclick",  
            "window.open('', '_self', ''); window.close();" );
        skip_button.style.display = "";
    }
*/

};


/**
 * Determines if the registration page should be shown. Right now, we will
 * always show it. 
 */
CROWDLOGGER.gui.study.pages.welcome.should_registration_page_be_shown=function()
{
    return true;
};


/**
 * Populates the registration page and modifies it for the welcome wizard.
 *
 * @param {object} welcome_doc The document for the welcome page.
 * @param {object} registration_doc The document for the registration page.
 */
CROWDLOGGER.gui.study.pages.welcome.modify_registration_page = function(
        welcome_doc, registration_doc ){
    var jq = welcome_doc.defaultView.jQuery;

    var register_button_enabled = 
        welcome_doc.getElementById( "welcome_wizzard_next_button" );
    var register_button_disabled =
        welcome_doc.getElementById( "welcome_wizzard_next_button_disabled" );
    

    // If we can't get this button, pretty much everything is lost, so just
    // exit.
    if(!register_button_enabled){
        return;
    }

    // Change the button text.
    register_button_enabled.innerHTML = "Register and continue";
    register_button_disabled.innerHTML = "Register and continue";
    jq(register_button_enabled).unbind('click').click( function(){ 
        CROWDLOGGER.study.registration.submit(
            welcome_doc.defaultView.frame.contentDocument); 
        next();
    });

    // Make sure the wizard button panel is displayed. 
    var welcome_wizard_button_panel = welcome_doc.getElementById(
        "welcome_wizard_button_panel" );
    if( welcome_wizard_button_panel ) {
        welcome_wizard_button_panel.style.display = "block";
    }


    // Change the skip button.
    var skip_button =
        welcome_doc.getElementById( "welcome_wizzard_skip_button" );
    if( skip_button ){
        skip_button.innerHTML = "Skip this step";
        jq(skip_button).unbind('click').click( welcome_doc.defaultView.next );
        skip_button.style.display = "";
    }

    // Remove the subtitle.
    var subtitle_elm = registration_doc.getElementById( "subtitle" );
    if( subtitle_elm ){
        subtitle_elm.style.display = "none";
    }

    // Make a button pair and enable it (this shows the enabled one and 
    // hides the disabled one).
    var button_pair = [register_button_enabled, register_button_disabled];
    //CROWDLOGGER.util.disable_button( button_pair );

    // Populate the page.
    CROWDLOGGER.study.registration.initialize_registration_page( 
        registration_doc, button_pair );

    // Add all of the event listeners to keep an eye on when changes are made
    // to the registration page.
    registration_doc.forms.registration.addEventListener( "change", function(){
        CROWDLOGGER.study.registration.check_form( registration_doc, 
            button_pair );
    }, false );
    registration_doc.forms.registration.addEventListener( "command", function(){
        CROWDLOGGER.study.registration.check_form( registration_doc,
            button_pair );
    }, false );
    registration_doc.forms.registration.addEventListener( "click", function(){
        CROWDLOGGER.study.registration.check_form( registration_doc,
            button_pair );
    }, false );

    // Get rid of the register button on the registration page.
    var old_register_button_panel = 
        registration_doc.getElementById( "register_button_panel" );
    if( old_register_button_panel ){
        old_register_button_panel.style.display = "none";
    }

};


/**
 * Determines if the refer-a-friend page should be shown.
 */
CROWDLOGGER.gui.study.pages.welcome.should_refer_a_friend_page_be_shown = 
        function(){
    return true;
};

/**
 * Populates the refer_a_friend page and modifies it for the welcome wizard.
 *
 * @param {object} welcome_doc The document for the welcome page.
 * @param {object} refer_a_friend_doc The document for the refer_a_friend page.
 */
CROWDLOGGER.gui.study.pages.welcome.modify_refer_a_friend_page = function(
        welcome_doc, refer_a_friend_doc ){

    var jq = welcome_doc.defaultView.jQuery;

    var register_button_enabled =
        welcome_doc.getElementById( "welcome_wizzard_next_button" );
    var register_button_disabled =
        welcome_doc.getElementById( "welcome_wizzard_next_button_disabled" );
    var skip_button = 
        welcome_doc.getElementById( "welcome_wizzard_skip_button" );

    // If we can't get this button, pretty much everything is lost, so just
    // exit.
    if(!register_button_enabled){
        return;
    }

    // Change the button text.
    register_button_enabled.innerHTML = "Continue";
    jq(register_button_enabled).unbind('click').click( welcome_doc.defaultView.next );


    // Make sure the correct button are enabled.
    CROWDLOGGER.util.enable_button( [register_button_enabled, 
        register_button_disabled] );
    skip_button.style.display = "none";

    // Remove the subtitle.
    var subtitle_elm = refer_a_friend_doc.getElementById( "subtitle" );
    if( subtitle_elm ){
        subtitle_elm.style.display = "none";
    }

    // Populate the page.
    CROWDLOGGER.study.refresh_refer_a_friend_page( refer_a_friend_doc, false );
};


/**
 * Determines if the preference page should be shown in the welcome wizard.
 */
CROWDLOGGER.gui.study.pages.welcome.should_preference_page_be_shown=function(){
    return true;
};


/**
 * Populates the preferences page and modifies it for the welcome wizard.
 *
 * @param {object} welcome_doc The document for the welcome page.
 * @param {object} preferences_doc The document for the preferences page.
 */
CROWDLOGGER.gui.study.pages.welcome.modify_preferences_page = function(
        welcome_doc, preferences_doc ){
    var jq = welcome_doc.defaultView.jQuery;

    var register_button_enabled =
        welcome_doc.getElementById( "welcome_wizzard_next_button" );
    var register_button_disabled =
        welcome_doc.getElementById( "welcome_wizzard_next_button_disabled" );
    var skip_button =
        welcome_doc.getElementById( "welcome_wizzard_skip_button" );


    // If we can't get this button, pretty much everything is lost, so just
    // exit.
    if(!register_button_enabled){
        return;
    }

    // Make sure the wizard button panel is displayed. 
    var welcome_wizard_button_panel = welcome_doc.getElementById(
        "welcome_wizard_button_panel" );
    if( welcome_wizard_button_panel ) {
        welcome_wizard_button_panel.style.display = "block";
    }

    // Change the button text.
    register_button_enabled.innerHTML = "Save and continue";
    jq(register_button_enabled).unbind('click').click(function(){
        if( CROWDLOGGER.gui.preferences.submit_preferences( 
                welcome_doc.defaultView.frame.contentDocument) ){ 
            next(); 
        }
    });

    // Make sure the buttons are enabled.
    CROWDLOGGER.util.enable_button( [register_button_enabled,
        register_button_disabled] );
    
    // Take care of the skip button.
    if( skip_button ){
        skip_button.innerHTML = "Skip this step";
        jq(skip_button).unbind('click').click( welcome_doc.defaultView.next );
        skip_button.style.display = "";
    }

    // Hides the save button panel on the preferences page.
    var save_button_panel = 
        preferences_doc.getElementById( "save_button_panel" );
    if( save_button_panel ){
        save_button_panel.style.display = "none";
    }

    // Remove the subtitle.
    var subtitle_elm = preferences_doc.getElementById( "subtitle" );
    if( subtitle_elm ){
        subtitle_elm.style.display = "none";
    }

    // Populate the preferences page.
    CROWDLOGGER.gui.preferences.refresh_preference_page( preferences_doc );
};

} // END CROWDLOGGER.gui.study.pages.welcome NAMESPACE
