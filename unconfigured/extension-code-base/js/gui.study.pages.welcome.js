/**
 * @fileOverview Provides functions for modifying pages shown in the
 * welcome wizard.<p>
 * 
 * See the CROWDLOGGER.gui.study.pages.welcome namespace.<p>
 * 
 * %%LICENSE%%
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
    var win = welcome_doc.defaultView;
    var jq = win.jQuery;
    var startwin = starter_doc.defaultView;
    var startjq = startwin.jQuery;

    // Change the next/skip buttons on the wizard.
    var next_button = jq( '#welcome_wizzard_next_button' );
    var skip_button = jq( '#welcome_wizzard_skip_button' );

    jq('#welcome_wizard_button_panel').show();

    next_button.html('Continue');
    next_button.unbind('click').click(win.next);

    skip_button.hide();

    // Is this a new install or an update?
    var new_install_elm = startjq( '#new_install' );
    var update_elm = startjq( '#update' );
    if( CROWDLOGGER.version.info.first_start_after_install ){
        new_install_elm.show();
        update_elm.hide();
        CROWDLOGGER.preferences.set_bool_pref( 'first_load', false )
    } else {
        new_install_elm.hide();
        update_elm.show();
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
    var win = welcome_doc.defaultView;
    var jq = win.jQuery;
    var closewin = closer_doc.defaultView;
    var closejq = closewin.jQuery;

    // Change the welcome wizard so that there is a 'show status'
    // and 'exit' button.
    var show_status_page = jq( '#welcome_wizzard_next_button' );
    var finish_button = jq( '#welcome_wizzard_skip_button' );

    show_status_page.html('Show the status page');
    show_status_page.unbind('click').click( 
        CROWDLOGGER.gui.study.pages.launch_status_page);
    show_status_page.show();
    show_status_page.removeAttr('disabled');


    finish_button.html('Finished');
    finish_button.unbind('click').click(function(){ 
        win.open('', '_self', ''); 
        win.close();
    });
    finish_button.show();
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
    var win = welcome_doc.defaultView;
    var jq = win.jQuery;
    var regwin = registration_doc.defaultView;
    var regjq = regwin.jQuery;

    var register_button = jq('#welcome_wizzard_next_button');
    
    // If we can't get this button, pretty much everything is lost, so just
    // exit.
    if(register_button.length === 0){
        return;
    }

    // Change the button text.
    register_button.html('Register and continue');
    jq(register_button).unbind('click').click( function(){ 
        CROWDLOGGER.study.registration.submit(
            welcome_doc.defaultView.frame.contentDocument); 
        win.next();
    });

    // Make sure the wizard button panel is displayed. 
    jq('#welcome_wizard_button_panel').show();
    register_button.show();

    // Change the skip button.
    var skip_button = jq('#welcome_wizzard_skip_button');
    if( skip_button ){
        register_button.removeAttr('disabled');
        skip_button.html('Skip this step');
        jq(skip_button).unbind('click').click( win.next );
        skip_button.show();
    }

    // Remove the subtitle.
    regjq( '#subtitle' ).hide();

    // Populate the page.
    CROWDLOGGER.study.registration.initialize_registration_page( 
        registration_doc );

    // Get the original registration button.
    var orig_register_button = regjq('#register-button');

    // Listen for the original button to be enabled or disabled (the page
    // loads a script that checks whether the form is ready to submit, and that
    // changes the original button).
    var myMutationObserver = 
        regwin.WebKitMutationObserver || regwin.MutationObserver;
   
    var observer = new myMutationObserver(function(mutations){
        if(orig_register_button.attr('disabled')){
            register_button.attr('disabled', 'disabled');
        } else {
            register_button.removeAttr('disabled');
        }
    });
    observer.observe(orig_register_button[0], {attributes:true});

    
    // Get rid of the register button on the registration page.
    orig_register_button.hide();
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
    var win = welcome_doc.defaultView;
    var jq = win.jQuery;
    var prefwin = preferences_doc.defaultView;
    var prefjq = prefwin.jQuery;

    var save_button = jq( '#welcome_wizzard_next_button' );
    var skip_button = jq( '#welcome_wizzard_skip_button' );

    // If we can't get this button, pretty much everything is lost, so just
    // exit.
    if(save_button.length === 0){
        return;
    }

    // Make sure the wizard button panel is displayed. 
    jq('#welcome_wizard_button_panel' ).show();

    // Change the button text.
    save_button.html('Save and continue');
    jq(save_button).unbind('click').click(function(){
        if( CROWDLOGGER.gui.preferences.submit_preferences(preferences_doc) ){ 
            win.next(); 
        }
    });

    // Make sure the buttons are enabled.
    save_button.show();
    save_button.removeAttr('disabled');

    // Take care of the skip button.
    if( skip_button ){
        skip_button.html('Skip this step');
        jq(skip_button).unbind('click').click( win.next );
        skip_button.show();
    }

    // Hides the save button panel on the preferences page.
    prefjq('#save_button_panel').hide();

    // Populate the preferences page.
    CROWDLOGGER.gui.preferences.refresh_preference_page( preferences_doc );
};

/**
 * Reconfigures the welcome wizard buttons when the CLRM Library page is
 * displayed.
 *
 * @param {object} welcome_doc The document for the welcome page.
 * @param {object} clrm_library_doc The document for the CLRM Library page.
 */
CROWDLOGGER.gui.study.pages.welcome.modify_clrm_library_page = function(
        welcome_doc, clrm_library_doc ){

    var jq = welcome_doc.defaultView.jQuery;

    var next_button = jq('#welcome_wizzard_next_button');
    var skip_button = jq('#welcome_wizzard_skip_button');

    // Change the button text.
    next_button.html('Continue');
    next_button.unbind('click').click(welcome_doc.defaultView.next);


    // Make sure the correct buttons are enabled.
    next_button.show();
    next_button.removeAttr('disabled');
    skip_button.hide();
};

} // END CROWDLOGGER.gui.study.pages.welcome NAMESPACE
