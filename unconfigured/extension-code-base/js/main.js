/**
 * @fileOverview This JavaScript file creates a new namespace called CROWDLOGGER
 * and initializes the object. <p>
 * 
 * See the CROWDLOGGER namespace.<p>
 * 
 * %%VERSION%% 
 *
 * @author hfeild
 * @version %%VERSION%% 
 */



if( CROWDLOGGER === undefined ) {
/* 
    // Says: true if this is the first window or the opener doesn't have this
    // namespace.
    (!window.opener || window.opener.CROWDLOGGER === undefined ) &&
    (window.parent === undefined || window.parent === window ) ){

dump( "window === window.parent? : " + ( window === window.parent ) + "\n" );

var util = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils);  
var windowID = util.outerWindowID;
dump( "window.id: " +  windowID + "\n" );
*/

/**
 * A new object to create the CrowdLogger namespace.
 *
 * @namespace The CrowdLogger namespace. This will
 * contain all of the methods and properties necessary for the browser
 * extension to function.
 */
var CROWDLOGGER = {
    extension_name: "crowdlogger@crowdlogger.org",
    initialization_in_progress:  false,
    initialized: false,
    window: window,
    jq: jQuery,
    messages: null
};


CROWDLOGGER.check_if_new_instance = function() {

    
    //B_DEBUG
    //dump( "Checking if CROWDLOGGER exists...\n" );    
    //E_DEBUG
    var wm, enumerator;

    // A catch for Chrome (the rest of this function is for FF).
    try {
        wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                           .getService(Components.interfaces.nsIWindowMediator);
        enumerator = wm.getEnumerator("navigator:browser");
    } catch (err) {
        CROWDLOGGER.initialize();
        return;
    }

    var min_id = -1;
    var min_window = window;
    var this_window_id = -1;

    var add_listeners = function() {
        if( CROWDLOGGER.initialized ) { 
            //B_DEBUG
            CROWDLOGGER.debug.log( "Adding listeners for new window.\n" );
            //E_DEBUG
            window.addEventListener( "load", function(){
                CROWDLOGGER.logging.event_listeners.initialize(window);
            }, false );
        } else {
            setTimeout( add_listeners, 200 );
        }
    }


    // Loop through each of the open windows and see if any of them have
    // already initialized CROWDLOGGER. If so, replace this window's instance
    // with that window's CROWDLOGGER. Otherwise, keep track of who has the
    // lowest window id -- that'll be the one that will end up initializing.
    while(enumerator.hasMoreElements()) {
        var win = enumerator.getNext();

        var util = win.QueryInterface(Components.interfaces.nsIInterfaceRequestor).
                getInterface(Components.interfaces.nsIDOMWindowUtils); 
        var window_id = util.outerWindowID;
        
        //B_DEBUG
        //dump( "Looking at window: " + window_id + "\n" );
        //E_DEBUG


        if( win.CROWDLOGGER !== undefined && win.CROWDLOGGER.initialization_in_progress ) {
            window.CROWDLOGGER = win.CROWDLOGGER;
            add_listeners();
            //B_DEBUG
            //dump( "Found a window that has CROWDLOGGER (window " + window_id +
            //    ")\n" );    
            //E_DEBUG
            return;
        } else if( min_id === -1 || window_id < min_id ) {
            min_id = window_id;
            min_window = win;
            //B_DEBUG
            //dump( "Setting min id to: " + window_id + "\n" );    
            //E_DEBUG
        }

        if( win === window ) {
            this_window_id = window_id;
        }
    }

    // If this is the smallest window, initalize things.
    if( window === min_window ) {
        //B_DEBUG
        //dump( "This window (" + this_window_id + ") is being initialized.\n" );
        //E_DEBUG
        CROWDLOGGER.initialize();
    } else {
    // Otherwise, set this instance's CROWDLOGGER to the smallest window's 
    // CROWDLOGGER.
        //B_DEBUG
        //dump( "This window (" + this_window_id + ") is waiting for window " +
        //        min_id + ".\n" );
        //E_DEBUG
        CROWDLOGGER = min_window.CROWDLOGGER;
        add_listeners();
    }
}

/**
 * An initialization function for the extension.
 *
 * @function
 */
CROWDLOGGER.initialize = function(){
    CROWDLOGGER.window = window;

    CROWDLOGGER.jq(document).ready(function(){
        CROWDLOGGER.messages = jQuery("#messages");
    });

    // A reference to the CROWDLOGGER object.
    var that = this;
    var browser_name, extension_version;
    
    // Gets and reports the browser name and extension version number.
    var report_version_info = function(){
        browser_name = CROWDLOGGER.version.info.get_browser_name();
        extension_version = CROWDLOGGER.version.info.get_extension_version();
        
        // Report the browser name and version number of the extension.
        CROWDLOGGER.debug.log( "Browser name: " + 
            browser_name + "\n" );
        CROWDLOGGER.debug.log( "Extension version: " + 
            extension_version + "\n" );
    };
    
    // Initializes everything that needs initializing.
    var init = function(){
        //B_DEBUG
        //dump( "\n\n===> Intializing current window <===\n\n" );
        //E_DEBUG


        //B_DEBUG
        //CROWDLOGGER.debug.log( "Initializing all of the components...\n" );
        //E_DEBUG

        dump("Initializing CROWDLOGGER.debug.log....");
        CROWDLOGGER.debug.init();
        dump("done!\n");
        CROWDLOGGER.preferences.init();
        CROWDLOGGER.preferences.defaults.set_defaults();
        CROWDLOGGER.debug.reinit();
        //CROWDLOGGER.io.file.init();
        //CROWDLOGGER.io.web_sql.init();
        CROWDLOGGER.io.log.init();
        CROWDLOGGER.gui.notifications.init();
        CROWDLOGGER.notifications.launch_notification_init();
        CROWDLOGGER.logging.init();
        CROWDLOGGER.uninstall.init();
        CROWDLOGGER.version.util.init();

        // Print out version info.
        report_version_info();

        //B_DEBUG
        CROWDLOGGER.debug.log( "Setting unintall observers...\n" );
        //E_DEBUG

        // Initialize the un-install and quit observers.
        CROWDLOGGER.uninstall.init_observers();

        //B_DEBUG
        CROWDLOGGER.debug.log( "Initializes checks...\n" );
        //E_DEBUG

        // Initializes all of the perpetual checks, e.g., checking for 
        // experiments, messages, etc.
        CROWDLOGGER.study.init_checks();        

        //B_DEBUG
        CROWDLOGGER.debug.log( "Initializing buttons...\n" );
        //E_DEBUG

        // Initialize any buttons that need to be attached to the browser.
        init_buttons();

        // Set a flag saying that things have been initialized.
        CROWDLOGGER.session_data.initialization_performed = true;

        // Initialize the logging listeners.
        CROWDLOGGER.logging.event_listeners.initialize(window);

        // Initialize the study page events.
        CROWDLOGGER.gui.study.pages.add_listeners(window);

        // Does the user have a registration id? If not, get one.
        if( CROWDLOGGER.preferences.get_char_pref( "registration_id", "" ) ===
                "" ){
            CROWDLOGGER.study.registration.get_new_registration_id(
                function(){}, function(){} );
        }

        // Check consent status.
        if( CROWDLOGGER.preferences.get_bool_pref( "consent_required", true ) ){
            CROWDLOGGER.study.notify_of_new_consent_form();
            CROWDLOGGER.logging.set_logging( false );
        }

        CROWDLOGGER.initialized = true;
    };

    // Initializes any buttons that need to be attached to the browser.
    function init_buttons(){
        // These are things that need to be done for Firefox.

        if( browser_name === "ff3" || browser_name === "ff4" ){
            //B_DEBUG
            CROWDLOGGER.debug.log( "This is firefox. Checking if buttons have been added.\n" );
            //E_DEBUG

            // Initialize the logger button if necessary.
            CROWDLOGGER.gui.buttons.init_logging_nav_bar_button_ff();
    
            // Check if this window needs a "Experiments ready to run" button.
            CROWDLOGGER.gui.buttons.check_if_experiments_button_should_be_shown_ff();
        }

        // Updates all of the logging buttons.
        CROWDLOGGER.gui.buttons.update_logging_buttons();
    };

    
    // Initialize everything.
    var start = function(){ 
        if( CROWDLOGGER.version === undefined ) {
            setTimeout( start, 100 );
            return;
        }
         
        // Report data about the version.
        CROWDLOGGER.version.info.init();

        // Really just for FF4, which uses an asynchronous call to determine
        // the extension version...we need to wait until that call goes through.
        var init_wrapper = function(){
            // If the extension version has not yet been defined, wait until
            // it has.

            if( CROWDLOGGER.version.info.get_extension_version()=== undefined
                || CROWDLOGGER.version.info.get_browser_name()===undefined  ){
                setTimeout( function(){ init_wrapper() }, 10 );
                return false;
            }
 
            // The version has been set, so we can commence.
            

            // Firefox.
            if( CROWDLOGGER.version.info.get_browser_name().match( /^ff/ ) !== null){

                var init_called = false;

                window.addEventListener( "load", function(){ 
                    if( !init_called ){
                        init_called = true;
                        setTimeout( init, 1000 ); 
                    }
                }, false );

                setTimeout( function(){ 
                    if( !init_called ){
                        init_called = true;
                        init();
                    }
                }, 1000 );
                
            // Chrome.
            } else {
                setTimeout( init, 500 );
            }
        }

        init_wrapper();
    };

    if( !CROWDLOGGER.initialization_in_progress ) {
        CROWDLOGGER.initialization_in_progress = true;
        start();
    }
};


// First thing to get called.
CROWDLOGGER.check_if_new_instance();

}


/*
 else if( (window.opener !== null && window.opener.CROWDLOGGER !== undefined) || (opener !== null && opener.CROWDLOGGER !== undefined) || window.parent !== window ) {

    var init_child_window = function( opener ) {
        var CROWDLOGGER = opener.CROWDLOGGER; 
        // Initialize the listeners for the new window.
        //B_DEBUG
        CROWDLOGGER.debug.log( "Adding listeners for new window." );
        //E_DEBUG
        window.addEventListener( "load", function(){
            CROWDLOGGER.logging.event_listeners.initialize(window);
        }, false );
    }
 
    if( window.parent.CROWDLOGGER !== undefined ) {
        init_child_window( window.parent );
    } else if( window.opener.CROWDLOGGER !== undefinded ) {
        init_child_window( window.opener );
    } else {
        setTimeout( function(){init_child_window(window.parent);}, 200 );
    }

}
*/
