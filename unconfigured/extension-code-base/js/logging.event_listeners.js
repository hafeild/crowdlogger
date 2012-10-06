/**
 * @fileOverview Provides functions to attach listeners to various browsing
 * behaviors and log those events.<p>
 * 
 * See CROWDLOGGER.logging.event_listeners namespace.<p>
 * 
 * %%VERSION_WEB%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */



if( CROWDLOGGER.logging.event_listeners === undefined ){

/**
 * @namespace Provides functions to attach listeners to various browsing
 * behaviors and log those events. 
 * <!--For each event, there exists the following
 * methods:
 * <ul>
 *  <li>addListener (adds the listener)</li>
 *  <li>hasListener (returns <tt>true</tt> if the listener exists)</li>
 *  <li>removeListener (removes the listener)</li>
 * </ul>
 * -->
 *
 * @param {Object} current_window For FF -- this should refer to the window to 
 *      which listeners should be attached.
 */
CROWDLOGGER.logging.event_listeners = {};

CROWDLOGGER.logging.event_listeners.initialize = function(current_window){
    if( CROWDLOGGER.version.info.get_browser_name().match( /^ff/ ) !== null ){
        CROWDLOGGER.logging.event_listeners.initialize_for_firefox(
            current_window);
    } else if( CROWDLOGGER.version.info.get_browser_name() === "chrome" ){
        CROWDLOGGER.logging.event_listeners.initialize_for_chrome();
    }

};


/**
 * Initializes the listeners for Google Chrome.
 */
CROWDLOGGER.logging.event_listeners.initialize_for_chrome = function(){

    // Handles a tab being updated. This is where page loads are logged.
    var on_tab_updated = function(tab_id, change_info, tab ){
    
        // If this is a new page that is finished loading, inject the page code.
        if( change_info.status ===  "complete" ){
            // Log the page load.
            CROWDLOGGER.logging.log_page_loaded( new Date().getTime(), tab_id,
                tab.url );
    
            //B_DEBUG
            //CROWDLOGGER.debug.log( "Injecting script\n" );
            //E_DEBUG
    
            // Inject the code.
            chrome.tabs.executeScript( tab_id, {
                // Stringify the function above and remove the 'function(..){'
                // and '}' parts.
                code: String(
                    CROWDLOGGER.logging.event_listeners.inject_page_listeners).
                        replace( /^\s*function\s*\(\s*[^)]*\s*\)\s*\{/, "" ).
                        replace( /\s*\}\s*$/, ""),
                // We want to inject this script into all frames.
                allFrames: true
            });


            // Update the tab information and log a focus, if necessary.
            if( tab.selected &&
                   tab.url !== CROWDLOGGER.session_data.last_selected_tab.url ){

                // Log the focus event.
                CROWDLOGGER.logging.log_page_focused( new Date().getTime(),
                    tab_id, tab.url );

                // Update the last selected tab information.
                CROWDLOGGER.session_data.last_selected_tab = {
                    tab_id: tab_id,
                    url: tab.url
                };

            }
        }
    };

    // Handles a new tab being added.
    var on_tab_added = function( tab ){
        CROWDLOGGER.logging.log_tab_added( new Date().getTime(), tab.id, tab.url,
            CROWDLOGGER.session_data.last_selected_tab.tab_id,
            CROWDLOGGER.session_data.last_selected_tab.url );
    };

    // Handles a tab being removed.
    var on_tab_removed = function( tab_id, revmove_info ){
        CROWDLOGGER.logging.log_tab_removed(new Date().getTime(), tab_id);
    };

    var on_tab_selected = function( tab ){
        CROWDLOGGER.session_data.last_selected_tab = {
            tab_id: tab.id,
            url: tab.url
        };
    };

    // Handles a tab being selected.
    var on_tab_selected_listener = function( tab_id, select_info ){
        chrome.tabs.get( tab_id, on_tab_selected );
    };

    // Initializes all of the handlers.
    var init = function(){
        // Place a listener any time a tab is updated.
        chrome.tabs.onUpdated.addListener( on_tab_updated );       
        chrome.tabs.onCreated.addListener( on_tab_added );       
        chrome.tabs.onSelectionChanged.addListener( on_tab_selected );       
        chrome.tabs.onRemoved.addListener( on_tab_removed );       

 
        CROWDLOGGER.session_data.last_selected_tab = {
            tab_id: "START",
            url: "START"
        };

        // Add all the tabs in the window.

        // Get the currently selected tab.
        chrome.tabs.getSelected( undefined, on_tab_selected );

    };

    init();

    // This will listen to any messages sent via the sendRequest method to
    // this extension. We're only using it to process certain events on
    // our only content page script. We are expecting 'message' to contain
    // a 'name' field. This will tell us how to log the rest of the data.
    chrome.extension.onRequest.addListener( function( message, sender ) {
        // Log a click event.
        if( message.name === "click" ){
            CROWDLOGGER.logging.log_click( message.time, message.clicked_url, 
                message.originating_page_url, message.button, message.query ); 
        // Log a search event.
        } else if( message.name === "search" ){
            CROWDLOGGER.logging.add_search_candidate( message.time, message.query, 
                message.search_engine, message.url );
        }
        //B_DEBUG
        //CROWDLOGGER.debug.log( message );
        //E_DEBUG
    }
);

};

/**
 * Initializes the listeners for Firefox.
 */
CROWDLOGGER.logging.event_listeners.initialize_for_firefox = function(
        current_window ){
    // The page listener -- this is what will take care of logging searches
    // (on search pages) and clicks.
//    CROWDLOGGER.logging.event_listeners.add_page_load_listeners_firefox(
//        current_window );
    //B_DEBUG
    CROWDLOGGER.debug.log( "About to initialize tab listeners for firefox.\n" );
    //E_DEBUG

    current_window.gBrowser.addTabsProgressListener(
        CROWDLOGGER.logging.event_listeners.tab_listener_firefox );

    CROWDLOGGER.logging.event_listeners.tab_addition_and_removal_listener(
        current_window );
};




/**
 * Injects the script that attaches search and link listeners on content pages.
 * Also logs that a page has been loaded. This could be called from, for example,
 * a tab updated listener.
 *
 * @param {int} tab_id The id of the tab in which the script will be injected.
 * @param {Object} change_info An object listing the things that have changed.
 * @param {Object} tab An object describing the tab.
 */
CROWDLOGGER.logging.event_listeners.tab_update_listener_chrome = function(
        tab_id, change_info, tab ){

    // If this is a new page that is finished loading, inject the page code.
    if( change_info.status ===  "complete" ){
        // Log the page load.
        CROWDLOGGER.logging.log_page_loaded( new Date().getTime(), tab_id,
            tab.url );

        // Inject the code.
        //B_DEBUG
        CROWDLOGGER.debug.log( "Injecting script:\n" +
            String(
                CROWDLOGGER.logging.event_listeners.inject_page_listeners).
                    replace( /^\s*function\s*\(\s*[^)]*\s*\)\s*\{/, "" ).
                    replace( /\s*\}\s*$/, "") );
        //E_DEBUG


        chrome.tabs.executeScript( tab_id, {
            // Stringify the function above and remove the 'function(..){' and
            // '}' parts.
            code: String(
                CROWDLOGGER.logging.event_listeners.inject_page_listeners).
                    replace( /^\s*function\s*\(\s*[^)]*\s*\)\s*\{/, "" ).
                    replace( /\s*\}\s*$/, ""),
            // We want to inject this script into all frames.
            allFrames: true
        });
    }

};

/**
 * Extracts the tab id of a Firefox browser object. The method of doing this
 * is different between FF3 and FF4.
 * 
 * @param {Object} browser  The Firefox browser object corresponding to the
 *      tab for which the id should be extracted.
 * @return {string} The tab id associated with the given browser object.
 */
CROWDLOGGER.logging.event_listeners.extract_tab_id_ff = function(browser){
    // Firefox 3
    if( CROWDLOGGER.version.info.get_browser_name() === "ff3" ){
        return browser.parentNode.id;
    // Firefox 4
    } else {
        return browser.parentNode.parentNode.id;
    }
}


/**
 * Injects the script that attaches search and link listeners on content pages.
 * Also logs that a page has been loaded.
 */
CROWDLOGGER.logging.event_listeners.add_page_load_listeners_firefox = function(current_window){

    // Add a listener for new pages being loaded in tabs in this window.
    current_window.addEventListener( "load", function(){
        current_window.gBrowser.addEventListener( "load", function(e){
            if( e.originalTarget instanceof HTMLDocument ){
                // TODO This might need to be updated for FF4.
                var tab_id = e.target.parentNode.id;
                //B_DEBUG
                //CROWDLOGGER.debug.log( "Tab id of loaded page? "+tab_id+"\n" );
                //E_DEBUG

                CROWDLOGGER.logging.event_listeners.inject_page_listeners(e);
            }
        }, true );
    }, false);

};


CROWDLOGGER.logging.event_listeners.tab_addition_and_removal_listener = 
        function(the_window){

    var container;

    // The tab container for the current window.
    container = the_window.gBrowser.tabContainer;

        // Initializes the listeners and logs all of the currently open tabs.
    var init = function(){
            // Add the tab listeners.
            container.addEventListener("TabOpen", on_tab_added,false );
            container.addEventListener("TabSelect", on_tab_selected,false);
            container.addEventListener("TabClose", on_tab_removed,false);

            // Check if the last selected tab object (in the shared session
            // data area) is defined. If not, stick some dummy information
            // in there.
            if( CROWDLOGGER.session_data.last_selected_tab === undefined ){
                CROWDLOGGER.session_data.last_selected_tab = {
                    tab_id: "START",
                    url: "START"
                };
            }

            // Enumerate through each of the open tabs and log them as
            // having been added.
            var num = the_window.gBrowser.tabContainer.length;
            for (var i = 0; i < num; i++) {
                var cur_tab = container.length;
                try {
                    on_tab_added( {target: cur_tab} );
                } catch(e) {
                    Components.utils.reportError(e);
                }
            }

            // When the window closes, remove these listeners.
            the_window.addEventListener( "unload", uninit, false );

            // Log the currently selected tab as the current tab.
            select_current_tab();
        };

        // Log the currently selected tab as the current tab.
        var select_current_tab = function(){
            // Get the currently selected tab:
            var wm = Components.classes[
                   "@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
            var main_window = wm.getMostRecentWindow("navigator:browser");
            on_tab_selected( {target: main_window.gBrowser.selectedTab} );

        };

        // Removes all of the listeners.
        var uninit = function(){
            //B_DEBUG
            CROWDLOGGER.debug.log( "Removing listeners...\n" );
            //E_DEBUG

            container.removeEventListener("TabOpen",   on_tab_added, 
                false );
            container.removeEventListener("TabSelect", on_tab_selected,
                false);
            container.removeEventListener("TabClose",  on_tab_removed, 
                false );

            var num = the_window.gBrowser.tabContainer.length;
            for (var i = 0; i < num; i++) {
                var cur_tab = container.length;
                try {
                    on_tab_removed( {target: cur_tab} );
                } catch(e) {
                    Components.utils.reportError(e);
                }
            }

            // Log the currently selected tab as the current tab.
            select_current_tab();
        };

        // Logs that a tab was added.
        var on_tab_added = function(e){
            var browser, tab_id;

            // Get the browser and tab id.
            browser = the_window.gBrowser.getBrowserForTab( e.target );

            try{
                tab_id = CROWDLOGGER.logging.event_listeners.extract_tab_id_ff( browser );
            } catch( e ){
                dump ( "ERROR! " + e + "\n" );
            }

            //B_DEBUG
            CROWDLOGGER.debug.log( "Tab added: " + tab_id + "\n" );
            //E_DEBUG

            CROWDLOGGER.logging.log_tab_added( new Date().getTime(), tab_id,
                browser.contentWindow.document.URL, 
                CROWDLOGGER.session_data.last_selected_tab.tab_id, 
                CROWDLOGGER.session_data.last_selected_tab.url );
        };

        // Logs that a tab was removed.
        var on_tab_removed = function(e){
            var browser, tab_id;
            
            // Get the browser and tab id.
            browser = the_window.gBrowser.getBrowserForTab( e.target );
            tab_id = CROWDLOGGER.logging.event_listeners.extract_tab_id_ff( browser );

            //B_DEBUG
            CROWDLOGGER.debug.log( "Tab removed: " + tab_id + "\n" );
            //E_DEBUG

            // Log the removal.
            CROWDLOGGER.logging.log_tab_removed(new Date().getTime(), tab_id); 
        };

        // Logs that a tab was selected.
        var on_tab_selected = function(e){
            var browser, url, tab_id;

            // Get the browser and tab id.
            browser = the_window.gBrowser.getBrowserForTab( e.target );
            tab_id = CROWDLOGGER.logging.event_listeners.extract_tab_id_ff( browser );

            // Attempt to extract a URL.
            try{
                url = browser.contentWindow.document.URL;
            } catch(e) {
                url = "NULL";
            }
 
            //B_DEBUG
            CROWDLOGGER.debug.log( "Tab selected: " + tab_id + "\n" );
            //E_DEBUG

            // Store some information about the currently selected tab.
            CROWDLOGGER.session_data.last_selected_tab = {
                tab_id: tab_id,
                url: browser.contentWindow.document.URL
            };
    
            // Log a page focus.
            CROWDLOGGER.logging.log_page_focused(new Date().getTime(), 
                tab_id, url)
 
        };
        // TODO Might want to add a page or window blur event handler. 

        init();
};

/**
 * This is a progress listener object. A reference to this object can be passed
 * to the gBrowser.addTabsListener function. It contains functions that will
 * be called for different tab events involving page loads. It does not handle
 * when a new tab is created or an existing tab is removed.
 */
CROWDLOGGER.logging.event_listeners.tab_listener_firefox = {

    // Called when the state of a tab changes. The body of this function is
    // set up to only handle pages that have completed loading.
    onStateChange : function( browser, web_progress, 
                              request, state_flags, the_status ) {
        var tab_id = CROWDLOGGER.logging.event_listeners.extract_tab_id_ff(
            browser );

        /*//B_DEBUG
        CROWDLOGGER.debug.log(
            "State of tab " + tab_id + " has changed: " + the_status + "\n");
        //E_DEBUG*/

        // Check if the event refers to a page having finished loading.
        if ( ( state_flags & Components.interfaces.
                nsIWebProgressListener.STATE_STOP ) &&
             ( state_flags & Components.interfaces.
                nsIWebProgressListener.STATE_IS_WINDOW ) ) {
            /*//B_DEBUG
            CROWDLOGGER.debug.log(
                "Tab " + tab_id + " Injecting event listeners into " + web_progress.DOMWindow.document.URL + "\n" );
            //E_DEBUG*/

            CROWDLOGGER.logging.event_listeners.inject_page_listeners(
                web_progress.DOMWindow ); //browser.contentWindow );


        }

    },

    // This handles the event that the location bar changes, i.e., focuses.
    onLocationChange : function( browser, web_progress, request, the_location ){
        var tab_id = CROWDLOGGER.logging.event_listeners.extract_tab_id_ff(
            browser );
        var url = the_location.spec;
       
        /*//B_DEBUG 
        dump( "Location change!\n\turl: " + url + "\n\tlast url: " + 
            CROWDLOGGER.session_data.last_selected_tab.url + "\n\ttab_id: " + 
            tab_id + "\n\tlast tab: " + 
            CROWDLOGGER.session_data.last_selected_tab.tab_id + "\n" );
        //E_DEBUG*/

        // Are we still on the same tab that we last selected? If so,
        // we must have just updated the url we're looking at. Log a
        // focus event and update the last_selected_tab info.
        if( tab_id === CROWDLOGGER.session_data.last_selected_tab.tab_id &&
                url !== CROWDLOGGER.session_data.last_selected_tab.url ){
            
            CROWDLOGGER.logging.log_page_focused(new Date().getTime(),
                tab_id, url );

            CROWDLOGGER.session_data.last_selected_tab.url = url; 
        }

        // Log a page load.
        CROWDLOGGER.logging.log_page_loaded( new Date().getTime(), tab_id,
            url );

    },

    onProgressChange : function( a_browser, web_progress, request, 
        cur_self_progress, max_self_progress, cur_total_progress, 
        max_total_progress ) {},

    onSecurityChange : function( a_browser, web_progress, request, state ) {},

    onStatusChange : function( a_browser, web_progress, request, status, 
        message ) {},

    onRefreshAttempted : function( a_browser, web_progress, refresh_uri, millis,
        same_uri ) { return true; },

    onLinkIconAvailable : function( a_browser ) {}
}




/**
 * This is a function that will attach the necessary listeners on a page,
 * including search box and link listeners. It is meant to be stringified
 * and passed to a page or a page loader. E.g., the 'document' variable
 * should refer to the page's document, which can only happen if this code
 * is run internal to the page.
 */
CROWDLOGGER.logging.event_listeners.inject_page_listeners = function(the_win){
    var pp_search_page_listener_functions = function(){
        // this is how we'll refer to the window and document (they're different
        // between Firefox and Chrome).
        var doc, is_chrome, win;


        try{
            if( CROWDLOGGER ){}
            is_chrome = false;
        } catch( e ) {
            is_chrome = true;
        }

        // Is this chrome?
        if( is_chrome ){
            win = window;
            doc = document;
        // Otherwise, must be Firefox.
        } else {
            /*
            win = e.originalTarget.defaultView;
            // This takes care of frames. See:
            // https://developer.mozilla.org/en/Code_snippets/Tabbed_browser
            if( win.frameElement ){ 
                win = win.top;
            }
            */
            win = the_win;
            doc = win.document;
        }


        // A logging interface.
        var log = function( message ){
            if( is_chrome ) {
                console.log( message );    
            } else {
                dump( message + "\n" );
            }
        };

        // Contains information regarding this page in terms of it being
        // a search page, which it might not be.
        var search_page_info = {
            is_search_page: false,
            search_box: undefined,
            query: undefined,
            search_engine: undefined,
            results_have_been_changed: false, // Really just for Google.
            previously_submitted_query: undefined
        };

        // Logs a click on a link.
        function on_click(e, clicked_url){    
            var info; //, clicked_url;

            // Extract the query from the search box so we get the most
            // recent value of the query.
            if( search_page_info.is_search_page ){
                search_page_info.query = search_page_info.search_box.value;
            }


            /*//B_DEBUG
            log( "In Click\n\ttagName: " + e.target.tagName + 
                "\n\tclicked_url: " + clicked_url +
                "\n\thref: " + e.target.href + 
                "\n\thref_orig: " + e.target.href_orig );
            //E_DEBUG*/
    
            info = {
                    time: new Date().getTime(),
                    name: "click",
                    originating_page_url: doc.URL + "",
                    clicked_url: clicked_url, 
                    query: search_page_info.query,
                    button: e.button
            };
    
            // Chrome.
            if( is_chrome ) {
               chrome.extension.sendRequest( info );
            // Firefox.
            } else {
                CROWDLOGGER.logging.log_click( info.time, info.clicked_url,
                    info.originating_page_url, info.button, info.query ); 
            }
        };

        // Logs a query.
        var log_query = function( query ){
            var info, previous_query;

            /*//B_DEBUG
            log( "log_query invoked with query: " + query );
            //E_DEBUG*/


            previous_query = search_page_info.previously_submitted_query;
            // Don't continue if the query is blank.
            if( query === "" || query === null || query === undefined ||
                  ( previous_query !== undefined && query === previous_query)){
                /*//B_DEBUG
                log( "Query is undefined..." );
                //E_DEBUG*/
                return false;
            }

            // An object to hold the query info.
            info = {
                    time: new Date().getTime(),
                    name: "search",
                    query: query,
                    url: doc.URL,
                    search_engine: search_page_info.search_engine
            };

            // Chrome.
            if( is_chrome ){
                chrome.extension.sendRequest( info );
                /*//E_DEBUG
                log( "info.query: " + info.query );
                //E_DEBUG*/
            // Firefox.
            } else {
                //B_DEUBG
                //log( "QUERY: " + JSON.stringify( info ) );
                //E_DEBUG
                CROWDLOGGER.logging.add_search_candidate( info.time, info.query,
                    info.search_engine, info.url );
 
            }
            // Make a note of this being the last submitted query.
            search_page_info.previously_submitted_query = query;
        }

        // Detects if this is a search page. If so, it updates information in
        // the search_page_info object.
        var detect_search_engine = function(){
            var url = doc.URL;
            var search_engine_match = url.match(/http[s]{0,1}:\/\/[^\/]*\//);
            var search_engine;

            if( search_engine_match ){
                search_page_info.search_engine = search_engine_match[0];
                
            } else {
                search_page_info.is_search_page = false;
                //B_DEBUG
                //log( "This is NOT a search engine." );
                //E_DEBUG
                return false;
            }

            //B_DEBUG
            //log( "Setting search_engine to: " + search_engine );
            //E_DEBUG

            if( search_page_info.search_engine.match( 
                    /(google)|(bing)/ ) !== null ){
                if( doc.getElementsByName("q") !== null ){
                    search_page_info.search_box = 
                        doc.getElementsByName("q")[0];
                }

            } else if( search_page_info.
                        search_engine.match( /(yahoo)/ ) !== null ){
                if( doc.getElementsByName("p") !== null ){
                    search_page_info.search_box = 
                        doc.getElementsByName("p")[0];
                }
            }

            // If we didn't find a valid search box, then we won't
            // consider this a search engine page.
            if( search_page_info.search_box === undefined ||
                search_page_info.search_box === null ){
                search_page_info.is_search_page = false;
                //B_DEBUG
                //log( "This is NOT a search engine." );
                //E_DEBUG
            } else {
                search_page_info.is_search_page = true;
                //B_DEBUG
                //log( "This IS a search engine." );
                //E_DEBUG
            }
        };
        
        // Get's called when the search box is updated. It needs to
        // figure out if the new query is worth logging. For example,
        // on Google instant, we want to log any minute change in the query
        // provided it changes the results shown on the screen. If the query is
        // worth logging, it gets logged.
        var query_watcher = function(e){
            var new_query;

            if( e === undefined  && search_page_info.is_search_page !== undefined){
                new_query = search_page_info.search_box.value;
            } else {
                new_query = e.target.value;
            }

            //B_DEBUG
            //log( "query_watcher invoked...query: " + search_page_info.search_box );
            //E_DEBUG
        

            // Check if the current query is different from the one that was
            // previously updated.
            if( new_query !== search_page_info.query ){
                /*//B_DEBUG
                log( "\tdifferent from previous query (" + 
                    search_page_info.query + ")" );
                //E_DEBUG*/

                search_page_info.query = new_query;

                /*//B_DEBUG
                log("\tresults_have_been_changed: " + 
                    search_page_info.results_have_been_changed );
                //E_DEBUG*/

                // So it's a different query...but have the results 
                // changed -- we don't want to log the search unless they have.
                if( search_page_info.results_have_been_changed ){
                    search_page_info.results_have_been_changed = false;
                    //log_query( e.target.value + "__QUERY_WATCHER" );
                    log_query( new_query );
                }
            }
        };


        // This is a kind of hack to get around Google's use of dynamic updaing
        // of search pages. For example, when a spelling correction is selected,
        // the usual query box is not used, but another one. Same with search
        // suggestions. Very misleading :). Anyway, this code will look to see
        // if there are multiple input boxes named "q". It always uses the 
        // last one found. This is a limitedly tested heuristic.
        var check_query_status = function(){
            var new_query, prev_query, query_inputs;

            if( search_page_info.is_search_page === undefined ) {
                return false;
            }

            query_inputs = doc.getElementsByName( "q" );
            if( query_inputs.length > 0 ){
                new_query = query_inputs[query_inputs.length-1].value;
            } else {
                return false;
            }

            prev_query =  search_page_info.previously_submitted_query;

            //B_DEBUG
            //log( "Cur query: " + new_query +"\tPrev query: " + prev_query );
            //E_DEBUG

            if( prev_query === undefined || prev_query !== new_query ){
                log_query( new_query );
            }
        };
    
        // Adds a click listener to a link and adds a field to hold the original
        // url.
        var add_listener_to_link = function( link, count ) {
            if( link.tagName !== "A" ){
                return false;
            }

            if( link.my_listener ){
                return false;
            }

            //remove_listener_from_link( link );

            if( link.href_orig === undefined ){
                link.href_orig = link.href;
            }
 
            //B_DEBUG
            //log( "Just added " + link.href_orig + " to link." );
            //E_DEBUG
            var click = function(e){ on_click( e, link.href_orig ); };

            link.addEventListener( 'click', click, true );
            // This is a work-around for Google instant: when enabled,
            // the page will reload, causing this script to be re-attached
            // to the page (that's okay). However, all the old links are 
            // still there and they point to the _old_ on_click function,
            // meaning we cannot remove the listeners. So here we are placing
            // a hitchhiker on the link element pointing to whatever listener
            // _we_ last attached. Then when we remove the listener (see below),
            // we can just reference this attribute of the link.
            link.my_listener = click;
        };
    
        // Removes the click listener from the given link.
        var remove_listener_from_link = function( link ) {
            if( link.my_listener === undefined ){
                link.removeEventListener( 'click', on_click, false );
            } else {
                link.removeEventListener( 'click', link.my_listener, false );
                link.my_listener = undefined;
            }
        };

        // Checks if the given node is a link; if so, it removes the
        // click listener from it.
        var check_removed_node = function( e ) {
            var elm = e.target;
            //log( "Something removed: " + elm.tagName );
            if( elm.tagName === "A" ){
                //log( "\tLink removed...." );
                remove_listener_from_link( elm );
                if( search_page_info.search_engine.match(/google/) !== null) {
                        search_page_info.results_have_been_changed = true;
                }
            } 
        };

        // Checks if the given node is a link; if so, it adds a click
        // listener to it.
        var check_inserted_node = function( e ) {
            var elm = e.target;
            //B_DEBUG
            //log( "Something added: " + elm.tagName );
            //E_DEBUG
            if( elm.tagName === "A" ){
                //B_DEBUG
                //log( "\tLink added...." );
                //E_DEBUG
                add_listener_to_link( elm );
                if( search_page_info.search_engine.match(/google/) !== null) {
                    search_page_info.results_have_been_changed = true;
                }
            }
        };

        // Checks if the given node is a link; if so, it removes the click
        // listener from it.
        var check_removed_node_alt = function( e ) {
            var elm = e.target;
            var sublinks;

            //B_DEBUG
            //log( "Something added: " + elm.tagName );
            //E_DEBUG

            // Check if this element or any of its descendants are links.
            if( elm.tagName === "A" ){
                sublinks = [elm];
            } else if( elm.getElementsByTagName !== undefined ){
                sublinks = elm.getElementsByTagName( "A" );
            }

            // If there are links being added, place listeners on them.
            if( sublinks !== undefined && sublinks.length > 0 ){
                if( search_page_info.search_engine.match(/google/) !== null) {
                    check_query_status();

                }
                //B_DEBUG
                //log( "\t" + sublinks.length + " links removed" );
                //E_DEBUG
                for( var i = 0; i < sublinks.length; i++ ){
                    //B_DEBUG
                    //log( "\tLink added...." );
                    //E_DEBUG
                    remove_listener_from_link( sublinks[i] );
                }
            }
        };


        // Checks if the given node is a link; if so, it adds a click
        // listener to it.
        var check_inserted_node_alt = function( e ) {

            var elm = e.target;
            var sublinks;

            //B_DEBUG
            //log( "Something added: " + elm.tagName );
            //E_DEBUG

            // Check if this element or any of its descendants are links.
            if( elm.tagName === "A" ){
                sublinks = [elm];
            } else if( elm.getElementsByTagName !== undefined ) {
                sublinks = elm.getElementsByTagName( "A" );
            }
            
            // If there are links being added, place listeners on them.
            if( sublinks !== undefined && sublinks.length > 0 ){
                if( search_page_info.search_engine.match(/google/) !== null) {


                    check_query_status();

                }
                //B_DEBUG
                //log( "\t" + sublinks.length + " links added" );
                //E_DEBUG
                for( var i = 0; i < sublinks.length; i++ ){
                    //B_DEBUG
                    //log( "\tLink added...." );
                    //E_DEBUG
                    add_listener_to_link( sublinks[i] );
                }
            }
        };

        // Adds the initial round of listeners. Changes
        var add_listeners = function(){
            //B_DEBUG
            //log( "Adding listeners now" );
            //E_DEBUG

            var links = doc.links;
            for( var i = 0; i < links.length; i++ ){
                add_listener_to_link( links[i] );
            }

            // In Chrome.
            if( is_chrome ){
                // Any time a new DOM element is inserted, check it out. If
                // it's a link, add a listener to it.
                //doc.addEventListener( 'DOMNodeInsertedIntoDocument',
                //    check_inserted_node, true );
                doc.addEventListener( 'DOMNodeInserted',
                    check_inserted_node_alt, false );
    
                // Any time a DOM element is removed, check if it's a link, and
                // if so, remove the click listener from it.
                //doc.addEventListener( 'DOMNodeRemovedFromDocument', 
                //    check_removed_node, true );
                doc.addEventListener( 'DOMNodeRemoved', 
                    check_removed_node_alt, false );
            // In Firefox.
            } else {

                // Any time a new DOM element is inserted, check it out. If
                // it's a link, add a listener to it.
                doc.addEventListener( 'DOMNodeInserted',
                    check_inserted_node_alt, false );
 
                // Any time a DOM element is removed, check if it's a link, and
                // if so, remove the click listener from it.
                doc.addEventListener( 'DOMNodeRemoved',   
                    check_removed_node_alt, false );
            }

            // Add a bunch of change listeners to the search box.
            if( search_page_info.is_search_page ){
                //search_page_info.search_box.addEventListener( 
                //    'textInput', query_watcher, true );
                search_page_info.search_box.addEventListener( 
                    'mousedown', query_watcher, true );
                search_page_info.search_box.addEventListener( 
                    'keyup', query_watcher, true );
                search_page_info.search_box.addEventListener( 
                    'textInput', query_watcher, true );
                // On unload, remove these listeners.
                win.addEventListener( 'unload', 
                    function(){
                        //B_DEBUG
                        //log( "Unloading window" );
                        //E_DEBUG
                        search_page_info.search_box.removeEventListener(
                            'mousedown', query_watcher, true );
                        search_page_info.search_box.removeEventListener(
                            'keyup', query_watcher, true );
                        search_page_info.search_box.removeEventListener(
                            'textInput', query_watcher, true );
                    }, true );
           }

            // If there's already a search on this page, log it.
            if(search_page_info.search_box !== null && 
                    search_page_info.search_box !== undefined ){
                search_page_info.query = search_page_info.search_box.value;
                log_query( search_page_info.query );
            }
            //B_DEBUG
            //log( "\tfinished adding listeners." );
            //E_DEBUG
        };

        //B_DEBUG
        log( "About to get things started..."); 
        //E_DEBUG
    
        var init = function(){
            //log( "I'm in init." );
            // Check if this is a search page.
            detect_search_engine();

            // Adds the listeners.
            add_listeners();
        };
        
        //if( win.loaded ) {
        init();
        //} else {
        //    win.addEventListener( "load", init, false );
        //}
    
    }();
};

/** 
 * Initializes the listeners and removers.
 */
/*
CROWDLOGGER.logging.event_listeners.initialize = function(){
    // TODO Implement
};


CROWDLOGGER.logging.event_listeners.init_link_listeners = function(doc){
    // TODO Implement
};


CROWDLOGGER.logging.event_listeners.init__listeners = function(){
    // TODO Implement
};


CROWDLOGGER.logging.event_listeners.init_link_listeners = function(){
    // TODO Implement
};
*/

} // END CROWDLOGGER.logging.event_listeners NAMESPACE.
