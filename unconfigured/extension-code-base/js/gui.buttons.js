/**
 * @fileOverview Provides functions to assist with controlling GUI button
 * components.<p>
 * 
 * See CROWDLOGGER.gui.buttons namespace.<p>
 *
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

// Check if we've already defined a gui namespace.
if( CROWDLOGGER.gui === undefined ){
    
    /**
     * @namespace For GUI related components.
     */
    CROWDLOGGER.gui = {};
}

if( CROWDLOGGER.gui.buttons === undefined ) { 
/**
 * @namespace Contains the GUI button elements used for the experiments, 
 * logging, and menus. 
 */
CROWDLOGGER.gui.buttons = {};
 
CROWDLOGGER.gui.buttons.defaults = {
    logging_on_class: 'crowdlogger-logging-on-icon',
    menu_logging_on_class: 'crowdlogger-logging-on-button',
    logging_on_hover_text: 
        'Logging is currently turned on for %%FULL_PROJECT_NAME%%. '+
        'Click to pause logging.',
    logging_off_class: 'crowdlogger-logging-off-icon',
    menu_logging_off_class: 'crowdlogger-logging-off-button',
    logging_off_hover_text: 
        'Logging is currently turned off for %%FULL_PROJECT_NAME%%. '+
        'Click to start logging.',
    status_page_class: ''
        
};

CROWDLOGGER.gui.buttons.current = {
    logging_on_class: CROWDLOGGER.gui.buttons.defaults.logging_on_class,
    menu_logging_on_class: 
        CROWDLOGGER.gui.buttons.defaults.menu_logging_on_class,
    logging_on_hover_text: 
        CROWDLOGGER.gui.buttons.defaults.logging_on_hover_text,
    logging_off_class: CROWDLOGGER.gui.buttons.defaults.logging_off_class,
    menu_logging_off_class: 
        CROWDLOGGER.gui.buttons.defaults.menu_logging_off_class,
    logging_off_hover_text: 
        CROWDLOGGER.gui.buttons.defaults.logging_off_hover_text,
    status_page_class: 
        CROWDLOGGER.gui.buttons.defaults.status_page_class
};
 
/**
 * Displays the 'experiments ready' button on the toolbar.
 */
CROWDLOGGER.gui.buttons.display_experiments_ready_button = function(){
     // TODO: Implement.
};

/**
 * Checks if the 'experiments ready' button needs to be displayed in the 
 * current window. This should be called when a new (Firefox) window is opened.
 * In that case, this function checks if the button is displayed in existing
 * windows; if so, it gets added to this window, too.
 */
CROWDLOGGER.gui.buttons.check_if_experiments_button_should_be_shown_ff = 
        function(){
    if( CROWDLOGGER.session_data.get( 'showing_run_experiments_button',
            'false' ) === 'true' ){
        // Get the toolbar button element by id.
        var toolbar_button = document.getElementById( 
            'crowdlogger-mine-job-toolbar-button');

        // Make it visible.
        toolbar_button.setAttribute( 'hidden', false );
    }
};

/**
 * Changes the logging buttons (the play/pause buttons) on the navigation
 * bar and menu to reflect the given state of logging.
 *
 * @param {boolean} turn_logging_on A flag that says whether logging should
 * be turned on or off. If missing, the function will default to the current
 * state of logging.
 */
CROWDLOGGER.gui.buttons.update_logging_buttons = function( turn_logging_on ) {
    // The browser.
    var browser_name = CROWDLOGGER.version.info.get_browser_name();    

    // Check if the turn_logging_on parameter was set; if not, find out
    // what the current state of logging is.
    if( turn_logging_on === undefined || typeof turn_logging_on !== 'boolean') {
        turn_logging_on = CROWDLOGGER.preferences.get_bool_pref( 
            'logging_enabled' );
    }

    // The logging on/off css class names; we're going to need these
    // in a few places, so this will help us from mistyping them.
    var logging_on_data = {
        class_name: CROWDLOGGER.gui.buttons.current.logging_on_class,
        hover_text: CROWDLOGGER.gui.buttons.current.logging_on_hover_text,
        menu_class_name: CROWDLOGGER.gui.buttons.defaults.menu_logging_on_class,
        menu_hover_text: 
            CROWDLOGGER.gui.buttons.defaults.logging_on_hover_text, 
        menu_label: '[Logging: on] Click to pause logging',
        status_page_class:
            CROWDLOGGER.gui.buttons.current.status_page_class
    };
    var logging_off_data = {
        class_name: CROWDLOGGER.gui.buttons.current.logging_off_class,
        hover_text: 
            CROWDLOGGER.gui.buttons.current.logging_off_hover_text,
        menu_class_name: 
            CROWDLOGGER.gui.buttons.defaults.menu_logging_off_class,
        menu_hover_text: 
            CROWDLOGGER.gui.buttons.defaults.logging_off_hover_text,
        menu_label: '[Logging: paused] Click to start logging',
        status_page_class: 
            CROWDLOGGER.gui.buttons.current.status_page_class
    };

    var display_data = logging_off_data;
    if( turn_logging_on ){
        display_data = logging_on_data;
    }

    // Removes 'crowdlogger-logging-[^-]*-button' from the given string.
    var clean_class = function( class_str ) {
        return class_str.replace( 
            / {0,1}crowdlogger-logging-[^-]*-[^ ]*/, '');
    }

    // Removes any style class name that matches crowdlogger-dynamic-[^ ]*-end.
    // This is really for removing dynamic* style classes from menu items.
    // *i.e., styles that were not specified in the original html/xul. 
    // A good example is highlighting the Status Page menu button when
    // a notification is available.
    var clean_dynamic_class = function( class_str ) {
        return class_str.replace( / {0,1}crowdlogger-dynamic-[^ ]*-end/, '' );
    };
    
    // If this is firefox.
    if( CROWDLOGGER.version.info.is_firefox ) {
        var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                       .getService(Components.interfaces.nsIWindowMediator);
        var enumerator = wm.getEnumerator('navigator:browser');
    
        // Loop through each of the open windows and update the buttons.
        while(enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            
            try{
                // This is the button that is located on the toolbar (or in the 
                // palette)
                var toolbar_button = win.document.getElementById(
                    'crowdlogger-start-button' );

                // Update the class of the toolbar button.
                toolbar_button.setAttribute( 'class', 
                    clean_class( toolbar_button.getAttribute( 'class' ) ) +
                    ' ' + display_data.class_name );
            
                // Update the tooltip text for the toolbar button.
                toolbar_button.setAttribute( 'tooltiptext', 
                    display_data.hover_text );
            }catch (ex) {
                CROWDLOGGER.debug.log('Error updating buttons: '+ ex);
            }
        }
    // If this is Chrome.
    } else {
        //B_DEBUG       
        CROWDLOGGER.debug.log( 'Updating images for Chrome.\n' );
        //E_DEBUG

        // Set the button on the navigation bar.
        chrome.browserAction.setIcon( {
            path: CROWDLOGGER.version.info.get_extension_img_prefix()  +
                CROWDLOGGER.preferences.get_char_pref(
                     display_data.class_name )
        });         

        // Set the tooltiptext for the navigation bar.
        chrome.browserAction.setTitle( {
            title: display_data.hover_text
        } );
    }
}; 


} // END CROWDLOGGER.gui.buttons NAMESPACE
