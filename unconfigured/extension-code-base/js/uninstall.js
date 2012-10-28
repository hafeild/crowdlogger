/**
 * @fileOverview Provides functions that handle removing files when
 * the user uninstalls this extension.<p>
 * 
 * See CROWDLOGGER.uninstall namespace.<p>
 *
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

if( CROWDLOGGER.uninstall === undefined ){

/**
 * @namespace Contains functions for cleaning up when a user uninstalls
 * this extension.
 */
CROWDLOGGER.uninstall = {
    // Flags indicating 1) if the user has uninstalled the addon and 2) if the user would like
    // to remove their logs.
    uninstall : false,
    user_wants_logs_removed : true
};


CROWDLOGGER.uninstall.init = function(){

/**
 * Initializes the uninstall observers. If the user uninstalls the extension,
 * the observers will trigger a prompt that asks the user if the log files
 * should be removed. If yes, then they are removed when the browser is 
 * shutdown. Currently only works for Firefox 3.5--3.6.
 * @function
 */
CROWDLOGGER.uninstall.init_observers_ff3 = function(){
    var uninstall_selected = null; // The uninstall observer instance.
    var quit_listener = null;      // The quit observer instance.
    
    
    // Listens for the user to click on "uninstall".
    function uninstall_selected_observer() {
      this.register();
    }
      
    // Adds functionality to the uninstall observer.
    uninstall_selected_observer.prototype = {
      last_action: "",
      /** @ignore */
      observe: function(subject, topic, data) {
         if( data === "item-uninstalled" )
         {
            // Prompt the user if they would like to delete their log.

            // Launch the dialog.
            CROWDLOGGER.uninstall.launch_uninstall_dialog();

            CROWDLOGGER.uninstall.uninstall = true;

         } else if( data === "item-cancel-action" && 
                    last_action === "item-uninstalled" ) {
            CROWDLOGGER.uninstall.uninstall = false;
            CROWDLOGGER.debug.log( "Setting quit.uninstall to false\n" );
            
         } 
         
         last_action = data; 
             
      },
      /** @ignore */
      register: function() {
        var observer_service = 
            Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService);
        observer_service.addObserver(this, "em-action-requested", false);
      },
      /** @ignore */
      unregister: function() {
        var observer_service = 
            Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService);
        observer_service.removeObserver(this, "em-action-requested");
      }
    }
    

    // Listens for the user to quit or restart the browser.
    /**
     * @ignore
     */
    function uninstall_observer()
    {
      this.register();
    }
    
    // Add additional functionality to the observer.
    uninstall_observer.prototype = {
      /** @ignore */
      remove_logs: function(){
        CROWDLOGGER.logging.remove_logs();
        CROWDLOGGER.debug.log(".Done!\n");
      },
      /** @ignore */
      observe: function(subject, topic, data) {
        CROWDLOGGER.debug.log( "Browser is shutting down\n" );
        CROWDLOGGER.debug.log( "uninstall: " + CROWDLOGGER.uninstall.uninstall + "\n");
        CROWDLOGGER.debug.log( "user_wants_logs_removed: " + 
            CROWDLOGGER.uninstall.user_wants_logs_removed+"\n" );
        
        // Check if the user has uninstalled and if so, if they selected to 
        // remove their log.
        if( CROWDLOGGER.uninstall.uninstall && CROWDLOGGER.uninstall.user_wants_logs_removed ) {
           CROWDLOGGER.debug.log( "Removing logs!\n" );
           // Remove the log.
           CROWDLOGGER.logging.remove_logs();
           //this.remove_logs();       
        }
      },
      /** @ignore */
      register: function() {
        var observer_service = 
            Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService);
        observer_service.addObserver(this, "quit-application-granted", false);
      },
      /** @ignore */
      unregister: function() {
        var observer_service = 
            Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService);
        observer_service.removeObserver(this, "quit-application-granted");
      }
    }
    
    // Create a function that will create new instances of the observers we
    // defined up above.
    return function(){
        uninstall_selected = 
              new uninstall_selected_observer();
        quit_listener = new uninstall_observer();
        
        CROWDLOGGER.uninstall.quit_listener = quit_listener;

        CROWDLOGGER.debug.log( "Uninstall observers registered.\n" );
    };
        
}();


/**
 * Initializes the uninstall observers. If the user uninstalls the extension,
 * the observers will trigger a prompt that asks the user if the log files
 * should be removed. If yes, then they are removed when the browser is 
 * shutdown. This is targeted at Firefox 4.0*.
 * @function
 */
CROWDLOGGER.uninstall.init_observers_ff4 = function(){
    // TODO Implement this. 
    // See: https://developer.mozilla.org/en/Addons/Add-on_Manager/AddonManager#addAddonListener%28%29
    var uninstall_selected = null; // The uninstall observer instance.
    var quit_listener = null;      // The quit observer instance.



    // The uninstall listener.
    var uninstall_listener = {
      onUninstalling: function(addon) {
        if (addon.id === CROWDLOGGER.extension_name) {
            CROWDLOGGER.uninstall.uninstall = true;
    
            // Prompt the user if they would like to delete their log.
            CROWDLOGGER.uninstall.launch_uninstall_dialog();
        }
      },
      onOperationCancelled: function(addon) {
        if (addon.id === CROWDLOGGER.extension_name) {
            CROWDLOGGER.uninstall.uninstall = 
                (addon.pendingOperations & AddonManager.PENDING_UNINSTALL) != 0;
            CROWDLOGGER.debug.log( "Setting quit.uninstall to false\n" );

        }
      }
    }
    
    try {
      Components.utils.import("resource://gre/modules/AddonManager.jsm");
      AddonManager.addAddonListener(uninstall_listener);
    } catch (ex) {}



    // Listens for the user to quit or restart the browser.
    /**
     * @ignore
     */
    function uninstall_observer()
    {
      this.register();
    }

    // Add additional functionality to the observer.
    uninstall_observer.prototype = {
      /** @ignore */
      remove_logs: function(){
        CROWDLOGGER.logging.remove_logs();
        CROWDLOGGER.debug.log(".Done!\n");
      },
      /** @ignore */
      observe: function(subject, topic, data) {
        //B_DEBUG
        CROWDLOGGER.debug.log( "Browser is shutting down\n" );
        CROWDLOGGER.debug.log( "uninstall: " + CROWDLOGGER.uninstall.uninstall + "\n");
        CROWDLOGGER.debug.log( "user_wants_logs_removed: " + 
            CROWDLOGGER.uninstall.user_wants_logs_removed+"\n" );
        //E_DBUG

        // Check if the user has uninstalled and if so, if they selected to 
        // remove their log.
        if( CROWDLOGGER.uninstall.uninstall && CROWDLOGGER.uninstall.user_wants_logs_removed ) {
            CROWDLOGGER.debug.log( "Removing logs!\n" );
            // Remove the log.
            CROWDLOGGER.logging.remove_logs();
        //   this.remove_logs();
        }
      },
      /** @ignore */
      register: function() {
        var observer_service =
            Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService);
        observer_service.addObserver(this, "quit-application-granted", false);
      },
      /** @ignore */
      unregister: function() {
        var observer_service =
            Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService);
        observer_service.removeObserver(this, "quit-application-granted");
      }
    }


    
    return function(){

        quit_listener = new uninstall_observer();

        CROWDLOGGER.uninstall.quit_listener = quit_listener;

        CROWDLOGGER.debug.log( "Uninstall observers registered.\n" );

    };
}();


/**
 * Initializes the uninstall observers. If the user uninstalls the extension,
 * the observers will trigger a prompt that asks the user if the log files
 * should be removed. If yes, then they are removed when the browser is 
 * shutdown. This is targeted at Chrome.
 * @function
 */
CROWDLOGGER.uninstall.init_observers_chrome = function(){
    // TODO Implement this. 
    return function(){
        CROWDLOGGER.debug.log( "Should be initializing chrome uninstall observers..." );
    };
}();


/**
 * Initializes the uninstall observers. If the user uninstalls the extension,
 * the observers will trigger a prompt that asks the user if the log files
 * should be removed. If yes, then they are removed when the browser is 
 * shutdown. Currently only Firefox 3.5--3.6 is supported. FF4 and Chrome
 * will be supported in the future.
 * @function
 */
CROWDLOGGER.uninstall.init_observers = function(){
    var browser_name = CROWDLOGGER.version.info.get_browser_name();
    var init_observer;
    
    // Figure out which observer initialization function to call.
    // Firefox 3.5--3.6.
    if( browser_name === "ff3" ) {
        init_observer = CROWDLOGGER.uninstall.init_observers_ff3;
        
    // Firefox 4.0.*
    } else if( browser_name === "ff4" ) {
        init_observer = CROWDLOGGER.uninstall.init_observers_ff4;
       
    // Google Chrome.
    } else if( browser_name === "chrome" ) {
        init_observer = CROWDLOGGER.uninstall.init_observers_chrome;
       
    // Something else?
    } else {
        /** @ignore */
        init_observer = function() { 
            CROWDLOGGER.debug.log( "This browser is not supported: " + browser_name); 
        };
    }
    
    // Invoke the appropriate observer initializer.
    return function(){
        init_observer();  
    };

}();


/**
 * Saves the user's response to the uninstallation dialog. 
 *
 * @param {object} doc The uninstall web page document.
 * @param {object} win The uninstall web page window.
 */
CROWDLOGGER.uninstall.user_response = function( doc, win ){
    var group = doc.forms.uninstall.remove_logs;
    var response = CROWDLOGGER.util.get_selected_radio_button( group );

    if( response === "false" ){
        CROWDLOGGER.uninstall.user_wants_logs_removed = false;
    } else {
        CROWDLOGGER.uninstall.user_wants_logs_removed = true;
    }

    win.close();
};


/**
 * Launches the uninstall dialog.
 */
CROWDLOGGER.uninstall.launch_uninstall_dialog = function() {
    // Get the url of the uninstall page.
    var uninstall_page = CROWDLOGGER.preferences.get_char_pref(
        "uninstall_dialog_url", "not_found.html" );

    // The prefix for the extension's html files.
    var extension_prefix = CROWDLOGGER.version.info.get_extension_html_prefix();

    var url = extension_prefix + uninstall_page;

    CROWDLOGGER.gui.windows.open_dialog( url, "%%FULL_PROJECT_NAME%% Uninstall", function(){},
        "width=460,height=350" );
};

}
} // END CROWDLOGGER.uninstall NAMESPACE
