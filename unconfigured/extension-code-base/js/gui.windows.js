/**
 * @fileOverview Provides functions to assist with controlling GUI window
 * components, such as opening tabs and dialogs.<p>
 * 
 * See CROWDLOGGER.gui.windows namespace.<p>
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */


// Check if we've already defined a gui namespace.
if( CROWDLOGGER.gui === undefined ){
    // This namespace is documented in gui.buttons.js.
    CROWDLOGGER.gui = {};
}


if( CROWDLOGGER.gui.windows === undefined ) {
/**
 * @namespace Contains window functionalities, such as opening tabs,
 * windows, and dialogs.
 */
CROWDLOGGER.gui.windows = {};

/**
 * Opens the given url in a dialog. In Firefox, the window.openDialog method
 * is invoked. On Google Chrome, a new tab is opened.
 *
 * @param {string} url The url to open in the new window.
 * @param {string} name The name to give the new dialog.
 * @param {function} callback A reference to the function to call when
 *      the page loads. It should take one parameter: the loaded tab document.
 * @param {string} options [Optional] A list of options to give to the
 *      the window.openDialog call. It should contain at least the
 *      width and height.
 */
CROWDLOGGER.gui.windows.open_dialog = function( url, name, callback, options ){
    var browser_name = CROWDLOGGER.version.info.get_browser_name();

    if( browser_name.match( /^ff/ ) !== null ){
/*        
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                       .getService(Components.interfaces.nsIWindowMediator);
        var main_window = wm.getMostRecentWindow("navigator:browser");
        main_window.gBrowser.selectedTab = main_window.gBrowser.addTab(url);
        var newTabBrowser = gBrowser.getBrowserForTab(gBrowser.selectedTab);
        

//        var dlg = window.openDialog( url, name, "all", CROWDLOGGER );
        
        newTabBrowser.addEventListener( "load", function(){
            var doc = newTabBrowser.contentDocument;
            callback( doc );
        }, true);

*/

        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                       .getService(Components.interfaces.nsIWindowMediator);
        var main_window = wm.getMostRecentWindow("navigator:browser");

        // Check if the invoker provided any options. If not, use the defaults.
        if( options === undefined ) {
            options = "width=1000,height=700,resizable";
        }

        var dlg = window.openDialog( url, name, options, "dialog" );
        //main_window.gBrowser.moveTabTo( dlg.gBrowser.selectedTab, 0 );
        
        dlg.addEventListener( "load", function(){
            var doc = dlg.document;
            if( callback ){
                callback( doc, dlg );
            }
        }, true);



    } else if( browser_name === "chrome" ) {
        var created_tab_id;

        // This function will be called every time a tab is changed.
        // It checks if the updated tab is the one we created and if it
        // has completed loading. If so, it finds the document object
        // of that tab's page and passes it to the user's callback function.
        var change_listener = function( tab_id, change_info, tab_info){
            if( created_tab_id === tab_id &&
                    change_info.status === "complete" ){ 
                var doc;
                var views = chrome.extension.getViews();

                // Search through this extension's windows to find the
                // tab we just created.
                for( var i = 0; i < views.length; i++ ){
                    if( views[i].document.URL === url ){
                        doc = views[i].document;
                    }
                }

                // Verify that we've found a document.
                if( doc !== undefined ){
                    // Remove the tab.
                    chrome.tabs.onUpdated.removeListener( change_listener );
            
                    // Invoke the caller's callback function with the
                    // document object.
                    callback( doc );
                }
            }
        };

        // Attach a listener on any tab updates.
        chrome.tabs.onUpdated.addListener( change_listener );

        // Create the tab and store the tab id.
        chrome.tabs.create( {url: url}, function(tab){ 
            created_tab_id = tab.id; } ); 
    }
};

/**
 * Opens the given url in a new tab in the most recent window. If a callback
 * is provided, then it will be called when the document opens.
 *
 * @param {string} url The url to load in the new tab.
 * @param {function} callback A function to invoke when the page has loaded. It
 *      should take a document as its parameter.
 */
CROWDLOGGER.gui.windows.open_tab = function( url, callback ){

    // Firefox.
    if( CROWDLOGGER.version.info.get_browser_name().match( /^ff/ ) !== null ){
        // Get the most recent window.
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                       .getService(Components.interfaces.nsIWindowMediator);
        var main_window = wm.getMostRecentWindow("navigator:browser");
    
        // Add a tab.
        main_window.gBrowser.selectedTab = main_window.gBrowser.addTab(url);
    
        // Make the new tab the selected one (this will bring it into focus).
        var newTabBrowser = gBrowser.getBrowserForTab(gBrowser.selectedTab);
        main_window.focus();
    
        // Invoke the callback when the page loads, if one was given.
        if( callback !== undefined ){
            newTabBrowser.addEventListener( "load", function(){
                var doc = newTabBrowser.contentDocument;
                callback( doc );
            }, true);
        }
    // Chrome.
    } else {
        CROWDLOGGER.gui.windows.open_dialog( url, callback );
    }
    
};


/**
 * Opens a small popup window that points to the given url.
 *
 * @param {string} url The url to open in the popup.
 * @param {string} name The name to give to the popup window.
 */
CROWDLOGGER.gui.windows.open_popup = function( url, name ) {
    var popup = window.open( url, name, 'height=400,width=875,resizable' );
    popup.focus();
};

} // END CROWDLOGGER.gui.windows NAMESPACE
