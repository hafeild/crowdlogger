/**
 * @fileOverview Provides functions to assist with controlling GUI button
 * components.<p>
 * 
 * See CROWDLOGGER.gui.buttons namespace.<p>
 *
 * %%VERSION%%
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
    logging_on_class: 'crowdlogger-logging-on-button',
    logging_on_hover_text: 
        'Logging is currently turned on for %%FULL_PROJECT_NAME%%. '+
        'Click to pause logging.',
    logging_off_class: 'crowdlogger-logging-off-button',
    logging_off_hover_text: 
        'Logging is currently turned off for %%FULL_PROJECT_NAME%%. '+
        'Click to start logging.',
    status_page_class: ''
        
};

CROWDLOGGER.gui.buttons.current = {
    logging_on_class: CROWDLOGGER.gui.buttons.defaults.logging_on_class,
    logging_on_hover_text: 
        CROWDLOGGER.gui.buttons.defaults.logging_on_hover_text,
    logging_off_class: CROWDLOGGER.gui.buttons.defaults.logging_off_class,
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
 * Adds a button to the navigation bar in Firefox if it hasn't been
 * removed.
 *
 * @param id {string} The element id of the button to add.
 */
CROWDLOGGER.gui.buttons.add_button_to_nav_bar_ff = function( id ){
    try {
       var firefoxnav = document.getElementById('nav-bar');
       var curSet = firefoxnav.currentSet;

        if(  !document.getElementById(id) && curSet.indexOf(id) == -1)  {
         var set;

         // Place the button before the urlbar
         set = curSet + ','+id;
         firefoxnav.setAttribute('currentset', set);
         firefoxnav.currentSet = set;
         document.persist('nav-bar', 'currentset');
         // If you don't do the following call, funny things happen
         try {
           BrowserToolboxCustomizeDone(true);
         }
         catch (e) { }
       }
    }
    catch(e) { }
};



/**
 * Attempts to add the logging button to the navigation bar. This is tailored to
 * initialization, so it first checks if the user has even been added before; if
 * so, this function will do nothing. Otherwise, it tries adding the button 
 * twice. After the second time, it checks if it was successful, and if so, 
 * updates the flag that says it has been added.
 */
CROWDLOGGER.gui.buttons.init_logging_nav_bar_button_ff = function(){
    // The preference that keeps track of whether the button has been added
    // or not.
    var button_added_pref = 'added_logging_button_to_nav_bar';

    // The id of the button.
    var button_id = 'crowdlogger-start-button';

    /**
     * @name check_if_toggle_button_added
     * @member CROWDLOGGER.gui.buttons
     * @function
     * @private
     * A callback function that checks if the toggle button was successfully
     * added to the toolbar.
     */
    var check_if_toggle_button_added = function(){
//B_DEBUG
        CROWDLOGGER.debug.log( 'We\'re in check_if_toggle_button_added()\n' );
//E_DEBUG
        var toolbar = document.getElementById( 'nav' );

        // If the id is there, set a preference saying it has been added.
        if( toolbar && toolbar.currentSet.indexOf( button_id ) >= 0 ) {
            CROWDLOGGER.preferences.set_bool_pref( button_added_pref, false );
        }
    };

    // Get the pref that tells us whether or not we've every added this
    // button before.
    var already_added_to_toolbar = CROWDLOGGER.preferences.get_bool_pref(
            button_added_pref, false );

    // If it's not added, try adding it.
    if( !already_added_to_toolbar ) {
        setTimeout( function(){
            CROWDLOGGER.gui.buttons.add_button_to_nav_bar_ff(button_id );
        }, 800 );

        // In a few seconds, try adding the logging button again (in case the
        // first call was too soon).
        setTimeout( function(){
            CROWDLOGGER.gui.buttons.add_button_to_nav_bar_ff( button_id );
        }, 3000 );

        // Check if we were successful.
        setTimeout( check_if_toggle_button_added, 3500 );
    }
};


/**
 * Checks if the 'experiments ready' button needs to be displayed in the 
 * current window. This should be called when a new (Firefox) window is opened.
 * In that case, this function checks if the button is displayed in existing
 * windows; if so, it gets added to this window, too.
 */
CROWDLOGGER.gui.buttons.check_if_experiments_button_should_be_shown_ff = function(){
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

    CROWDLOGGER.debug.log( 'Updating the buttons [loggingEnabled = ' +
        turn_logging_on + ']\n' );

    // The logging on/off css class names; we're going to need these
    // in a few places, so this will help us from mistyping them.
    var logging_on_data = {
        class_name: CROWDLOGGER.gui.buttons.current.logging_on_class,
        hover_text: CROWDLOGGER.gui.buttons.current.logging_on_hover_text,
        menu_class_name: CROWDLOGGER.gui.buttons.defaults.logging_on_class,
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
        menu_class_name: CROWDLOGGER.gui.buttons.defaults.logging_off_class,
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
        return class_str.replace( / {0,1}crowdlogger-logging-[^-]*-button/, '');
    }

    // Removes any style class name that matches crowdlogger-dynamic-[^ ]*-end.
    // This is really for removing dynamic* style classes from menu items.
    // *i.e., styles that were not specified in the original html/xul. 
    // A good example is highlighting the Status Page menu button when
    // a notification is available.
    var clean_dynamic_class = function( class_str ) {
        return class_str.replace( / {0,1}crowdlogger-dynamic-[^ ]*-end/, '' );
    };

    var set_buttons_ff = function( 
            toolbar_button, menu_button, status_page_button ) {
        try {
            // Update the class of the toolbar button.
            toolbar_button.setAttribute( 'class', 
                clean_class( toolbar_button.getAttribute( 'class' ) ) +
                ' ' + display_data.class_name );
        
            // Update the tooltip text for the toolbar button.
            toolbar_button.setAttribute( 'tooltiptext', 
                display_data.hover_text );
        
            // Update the class of the menu button.
            menu_button.setAttribute( 'class',
                clean_class( menu_button.getAttribute( 'class' ) ) +
                ' ' + display_data.menu_class_name );

            // Update the label and tooltip text for the menu button.
            menu_button.label = display_data.menu_label;
            menu_button.setAttribute( 'tooltiptext',  
                    display_data.menu_hover_text );

            // Update the status page button style.
            status_page_button.setAttribute( 'class',
                clean_dynamic_class(status_page_button.getAttribute('class')) +
                ' ' + display_data.status_page_class );
        
            //B_DEBUG
            CROWDLOGGER.debug.log( '\t\ttoolbar button class: ' + 
                toolbar_button.getAttribute( 'class' ) + '\n' );
            //E_DEBUG
        } catch (ex) {
            CROWDLOGGER.io.log.write_to_error_log( {data: [{
                f: 
                'CROWDLOGGER.gui.buttons.update_logging_buttons.set_buttons_ff',
                err: 'Error updating buttons: '+ ex,
                t: new Date().getTime()
            }]});
        }
    }  
    
    // If this is firefox.
    if( browser_name.match( /^ff/ ) !== null ) {
        dump('Updating ff buttons...\n');

        var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                       .getService(Components.interfaces.nsIWindowMediator);
        var enumerator = wm.getEnumerator('navigator:browser');
    
        //B_DEBUG
        CROWDLOGGER.debug.log( 
            'Iterating through windows to update toggle button.\n' );
        //E_DEBUG
        // Loop through each of the open windows and update the buttons.
        while(enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            
            dump('Updating buttons for a window...\n');

            //B_DEBUG
            CROWDLOGGER.debug.log( '\tWindow '+ win +': '+ win.parent +'\n' );
            //E_DEBUG
    
    
            // This is the button that is located on the toolbar (or in the 
            // palette)
            var toolbar_button = win.document.getElementById(
                'crowdlogger-start-button' );
    
            // This is the button that is located in the menu.
            var menu_button = win.document.getElementById(
                'crowdlogger-logging-button' );

            // This is the status page button in the menu.
            var status_page_button = win.document.getElementById(
                'crowdlogger-show-status-page-button' );


            set_buttons_ff( toolbar_button, menu_button, status_page_button );
        }
    // If this is Chrome.
    } else if( browser_name === 'chrome' ) {

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
 

        // A function that will change icons on a given page. This is only
        // for the pop ups (i.e., the %%PROJECT_NAME%% menu).
        var change_icons_on_page = function( doc ){
            var logging_button = 
                doc.getElementById( 'crowdlogger-logging-button' );
            var status_page_button = 
                doc.getElementById( 'crowdlogger-show-status-page-button' );

            // Change the title (i.e., tooltiptext).
            logging_button.title = display_data.menu_hover_text;

            // Change the class.
            logging_button.setAttribute( 'class', 
                clean_class(logging_button.getAttribute('class')) 
                + ' ' + display_data.menu_class_name );

            // Change the label text.
            logging_button.innerHTML = display_data.menu_label;

            // Update the status page button style.
            status_page_button.setAttribute( 'class',
                clean_dynamic_class(status_page_button.getAttribute('class')) +
                ' '+ display_data.status_page_class );
  
        };

        // Iterate through each of the popup windows.
        var tabs = chrome.extension.getViews( {type: 'popup'} );
        //B_DEBUG
        CROWDLOGGER.debug.log( 'Iterating through ' + tabs.length + 
            ' popup windows.\n' );
        //E_DEBUG
        for( var i = 0; i < tabs.length; i++ ){
            change_icons_on_page( tabs[i].document );
        }
        
    }
}; 


} // END CROWDLOGGER.gui.buttons NAMESPACE
