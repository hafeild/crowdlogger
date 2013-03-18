/**
 * @fileOverview Provides functions to attach listeners to various browsing
 * behaviors and log those events.<p>
 * 
 * See CROWDLOGGER.logging.event_listeners namespace.<p>
 * 
 * %%LICENSE%%
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
CROWDLOGGER.logging.event_listeners = {
    placed_listeners: {},
    id: 0
};

CROWDLOGGER.logging.event_listeners.mk_listener_observer = function(on_unload){
    var observer = {
        id: CROWDLOGGER.logging.event_listeners.id++,
        on_unload: on_unload
    };
    CROWDLOGGER.logging.event_listeners.placed_listeners[observer.id]= observer;
    return observer; 
}

CROWDLOGGER.logging.event_listeners.initialize = function(current_window){
    if( CROWDLOGGER.version.info.is_firefox ){
        try{
            CROWDLOGGER.logging.event_listeners.initialize_for_firefox(
                current_window);
        } catch(e){
            CROWDLOGGER.debug.log('Error while initializing listener: '+ e);
        }
    } else if( CROWDLOGGER.version.info.is_chrome ){
        CROWDLOGGER.logging.event_listeners.initialize_for_chrome();
    }

};

CROWDLOGGER.logging.event_listeners.uninstall_listener = function( id ){
    if( id === undefined ){
        var x;
        for( x in CROWDLOGGER.logging.event_listeners.placed_listeners ){
            if( CROWDLOGGER.logging.event_listeners.placed_listeners[x] ){
                CROWDLOGGER.logging.event_listeners.
                    placed_listeners[x].on_unload();
            }
            delete CROWDLOGGER.logging.event_listeners.placed_listeners[x];
        }
    } else {
        var obj = CROWDLOGGER.logging.event_listeners.placed_listeners[id];
        if( obj ){ obj.on_unload(); }
        delete CROWDLOGGER.logging.event_listeners.placed_listeners[id];
    }
}

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
                tab.url, tab.title );
    
            // Inject the code.
            chrome.tabs.executeScript( tab_id, {
                // Stringify the function above and remove the 'function(..){'
                // and '}' parts.
                code: String(
                    CROWDLOGGER.logging.event_listeners.inject_page_listeners).
                        replace( /^\s*function\s*\(\s*[^)]*\s*\)\s*\{/, "" ).
                        replace( /\s*\}\s*$/, "").
                        replace( /TAB_ID/, '"'+ tab_id +'"' ).
                        replace( /IS_CHROME/, 'true').
                        replace( /IS_FOCUSED/, tab.selected.toString()),
                // We want to inject this script into all frames.
                allFrames: true
            });

            // Update the tab information and log a focus, if necessary.
            // if( tab.selected ){
            // // &&
            // // tab.url !== CROWDLOGGER.session_data.last_selected_tab.url ){

            //     // Log the focus event.
            //     // CROWDLOGGER.logging.log_page_focused(new Date().getTime(),
            //     //     tab_id, tab.url );
            //     CROWDLOGGER.logging.log_tab_selected( new Date().getTime(),
            //         tab_id, tab.url );

            //     // Update the last selected tab information.
            //     CROWDLOGGER.session_data.last_selected_tab = {
            //         tab_id: tab_id,
            //         url: tab.url
            //     };
            // }
        }
    };

    // Handles a new tab being added.
    var on_tab_added = function( tab ){
        CROWDLOGGER.logging.log_tab_added( 
            new Date().getTime(), tab.id, tab.url,
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
        CROWDLOGGER.logging.log_tab_selected( new Date().getTime(),
            tab.id, tab.url );
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
    chrome.extension.onRequest.addListener(
        CROWDLOGGER.logging.event_listeners.on_content_script_message);

};


/**
 * Initializes the listeners for Firefox.
 */
CROWDLOGGER.logging.event_listeners.initialize_for_firefox = function(
        current_window ){
    //B_DEBUG
    CROWDLOGGER.debug.log( "About to initialize tab listeners for firefox.\n" );
    //E_DEBUG

    CROWDLOGGER.logging.event_listeners.mk_listener_observer(function(){
        current_window.gBrowser.removeTabsProgressListener(
            CROWDLOGGER.logging.event_listeners.tab_listener_firefox );
    });
    current_window.gBrowser.addTabsProgressListener(
        CROWDLOGGER.logging.event_listeners.tab_listener_firefox );

    CROWDLOGGER.logging.event_listeners.tab_addition_and_removal_listener(
        current_window );
};




// /**
//  * Injects the script that attaches search and link listeners on content
//  * pages Also logs that a page has been loaded. This could be called from, 
//  * e.g., a tab updated listener.
//  *
//  * @param {int} tab_id The id of the tab where the script will be injected.
//  * @param {Object} change_info An object listing what has changed.
//  * @param {Object} tab An object describing the tab.
//  */
// CROWDLOGGER.logging.event_listeners.tab_update_listener_chrome = function(
//         tab_id, change_info, tab ){

//     // If this is a new page that is finished loading, inject the page code.
//     if( change_info.status ===  "complete" ){
//         // Log the page load.
//         CROWDLOGGER.logging.log_page_loaded( new Date().getTime(), tab_id,
//             tab.url );

//         // Inject the code.
//         // //B_DEBUG
//         // CROWDLOGGER.debug.log( "Injecting script:\n" +
//         //     String(
//         //        CROWDLOGGER.logging.event_listeners.inject_page_listeners).
//         //             replace( /^\s*function\s*\(\s*[^)]*\s*\)\s*\{/, "" ).
//         //             replace( /\s*\}\s*$/, "") );
//         // //E_DEBUG

//         chrome.tabs.executeScript( tab_id, {
//             // Stringify the function above and remove the 'function(..){'
//             // and '}' parts.
//             code: String(
//                 CROWDLOGGER.logging.event_listeners.inject_page_listeners).
//                     replace( /^\s*function\s*\(\s*[^)]*\s*\)\s*\{/, "" ).
//                     replace( /\s*\}\s*$/, "").
//                     replace( /TAB_ID/, '"'+ tab_id +'"' ).
//                     replace( /IS_CHROME/, 'true' ).
//                     replace( /TAB_SELECTED/, tab.selected.toString()),
//             // We want to inject this script into all frames.
//             allFrames: true
//         });
//     }
// };

/**
 * Extracts the tab id of a Firefox browser object. The method of doing this
 * is different between FF3 and FF4.
 * 
 * @param {Object} browser  The Firefox browser object corresponding to the
 *      tab for which the id should be extracted.
 * @return {string} The tab id associated with the given browser object.
 */
CROWDLOGGER.logging.event_listeners.extract_tab_id_ff = function(browser){
    if( !browser.uniqueID ){
        browser.uniqueID = new Date().getTime();
    }

    return browser.uniqueID;
};


/**
 * Injects the script that attaches search and link listeners on content pages.
 * Also logs that a page has been loaded.
 */
CROWDLOGGER.logging.event_listeners.add_page_load_listeners_firefox = 
        function(current_window){

    // Add a listener for new pages being loaded in tabs in this window.
    current_window.addEventListener( "load", function(){
        current_window.gBrowser.addEventListener( "load", function(e){
            if( e.originalTarget instanceof HTMLDocument ){
                var tab_id = 
                    CROWDLOGGER.logging.event_listeners.extract_tab_id_ff(
                        the_window.gBrowser.getBrowserForTab( e.target ) );
                
                CROWDLOGGER.logging.event_listeners.inject_page_listeners(
                    current_window, tab_id, false, 
                    CROWDLOGGER.session_data.last_selected_tab.tab_id===tab_id);
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
        var tabbrowser, num, i;

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
        tabbrowser = the_window.gBrowser;
        num = tabbrowser.browsers.length, i;
        for(i = 0; i < num; i++) {
            var cur_tab = tabbrowser.tabContainer.childNodes[i];
            try {
                CROWDLOGGER.debug.log('Adding current tab...');
                on_tab_added( {target: cur_tab} );
                CROWDLOGGER.debug.log('Added!');
            } catch(e) {
                Components.utils.reportError(e);
            }
        }


        var observer = CROWDLOGGER.logging.event_listeners.
            mk_listener_observer(function(){
                uninit();
            });
        
        // When the window closes, remove these listeners.
        the_window.addEventListener( "unload", function(){
            CROWDLOGGER.logging.event_listeners.uninstall_listener(observer.id);
        }, false );

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
            tab_id = CROWDLOGGER.logging.event_listeners.extract_tab_id_ff( 
                browser );
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
        tab_id = CROWDLOGGER.logging.event_listeners.extract_tab_id_ff( 
            browser );

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
        tab_id = CROWDLOGGER.logging.event_listeners.extract_tab_id_ff( 
            browser );

        // Attempt to extract a URL.
        try{
            url = browser.contentWindow.document.URL;
        } catch(e) {
            url = "NULL";
        }

        //B_DEBUG
        // CROWDLOGGER.debug.log( "Tab selected: " + tab_id + "\n" );
        //E_DEBUG

        // Store some information about the currently selected tab.
        CROWDLOGGER.session_data.last_selected_tab = {
            tab_id: tab_id,
            url: browser.contentWindow.document.URL
        };

        // Log a page focus.
        CROWDLOGGER.logging.log_tab_selected(new Date().getTime(), tab_id, url);
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

            CROWDLOGGER.logging.event_listeners.inject_page_listeners(
                web_progress.DOMWindow, tab_id, false,
                CROWDLOGGER.session_data.last_selected_tab.tab_id===tab_id);
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
        // if( tab_id === CROWDLOGGER.session_data.last_selected_tab.tab_id  &&
        //     url !== CROWDLOGGER.session_data.last_selected_tab.url ){
            
        //     //CROWDLOGGER.logging.log_tab_selected(new Date().getTime(),
        //     //    tab_id, url );

        //     CROWDLOGGER.session_data.last_selected_tab.url = url; 
        // }

        // Log a page load.
        CROWDLOGGER.logging.log_page_loaded( new Date().getTime(), tab_id, url); 

    },

    onProgressChange : function( a_browser, web_progress, request, 
        cur_self_progress, max_self_progress, cur_total_progress, 
        max_total_progress ) {},

    onSecurityChange : function( a_browser, web_progress, request, state ) {},

    onStatusChange : function( a_browser, web_progress, request, status, 
            message ) {
        // CROWDLOGGER.debug.log('tab status change: '+ status);
    },

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
CROWDLOGGER.logging.event_listeners.inject_page_listeners = function(the_win,
        TAB_ID, IS_CHROME, IS_FOCUSED){
    var crowdlogger_page_listeners = function(){
        const RANK_DATA_ATTRIBUTE = 'data-CROWDLOGGER-RES-RANK';
        const DATA_MARK_ATTRIBUTE = 'data-CROWDLOGGER-MARK';
        const ORIG_HREF_ATTRIBUTE = 'data-CROWDLOGGER-ORIG-HREF';

        var doc, is_chrome, win, tab_id, is_focused, listeners = [], title,
            mutationObservers = [], extractors, myMutationObserver;

        tab_id = TAB_ID;
        is_chrome = IS_CHROME;

        // This is used to prevent double blurring (which can occur when a
        // browser window is blurred).
        is_focused = IS_FOCUSED;

        // Is this chrome?
        if( is_chrome ){
            win = window;
            doc = document;
            myMutationObserver = WebKitMutationObserver;
        // Otherwise, must be Firefox.
        } else {
            myMutationObserver = MutationObserver;
            win = the_win;
            doc = win.document;
        }

        // A logging interface.
        var log = function( message ){
            win.console.log( message );  
        };

        // Contains information regarding this page in terms of it being
        // a search page, which it might not be.
        var search_page_info = {
            is_search_page: false,
            search_box: undefined,
            query: undefined,
            search_engine: undefined,
            results_have_been_changed: false, // Really just for Google.
            previously_submitted_query: undefined,
            result_list_elm: undefined,
            extractor: undefined,
            results_returned: undefined,
            result_starting_rank: 1,
            results: []
        };

        var get_ancestor = function(elm, tag){
            var target = elm;
            while( target && target.tagName !== tag ){
                target = target.parentNode;
            }
            return target
        };

        var store_href = function(e){
            var link = get_ancestor(e.target, 'A');
            if( link && !link.hasAttribute(ORIG_HREF_ATTRIBUTE) ){
                link.setAttribute(ORIG_HREF_ATTRIBUTE, link.href);
            }
        };

        var SearchResultHelper = function(){
            var that = this;
            this.result = {
                l: []
            };

            this.set_title_text = function(title_text){
                that.result.ttltxt = title_text;
            };

            this.set_title_url = function(title_url){
                that.result.ttlurl = title_url;
            };

            this.set_rank = function(rank){
                that.result.rnk = rank;
            };

            this.set_display_url_text = function(display_url_text){
                that.result.durl = display_url_text;
            };

            this.set_summary_html = function(summary_html){
                that.result.shtml = summary_html;
            };

            this.add_link = function(url, anchor_text){
                that.result.l.push({
                    anc: anchor_text,
                    url: url
                });
            };

            this.clear = function(){
                that.result = {
                    l: []
                };
            };
        };

        /**
         * Logs a click on a link. Includes information about the search engine
         * (which will be ignored further down the pipeline if undefined).
         *
         * @param {MouseEvent} e The DOM mouse event describing the click.
         */
        var on_click = function(e){
            log('In on_click:');

            // Traverse upwards from the target to find an A tag.
            var target = get_ancestor(e.target, 'A');
            log(target);

            if( !target ){
                return;
            }

            log('It was a link; logging click...');

            var info, clicked_url = target.getAttribute(ORIG_HREF_ATTRIBUTE) ||
                target.href;
    
            info = {
                    time: new Date().getTime(),
                    name: "click",
                    originating_page_url: doc.URL + "",
                    clicked_url: clicked_url, 
                    query: search_page_info.query,
                    button: e.button,
                    tab_id: tab_id,
                    rank: parseInt(target.getAttribute(RANK_DATA_ATTRIBUTE)),
                    anchor_text: target.innerHTML
            };
    
            // Chrome.
            if( is_chrome ) {
               chrome.extension.sendRequest( info );
            // Firefox.
            } else {
                CROWDLOGGER.logging.event_listeners.on_content_script_message(
                    info );
            }
        };

        /**
         * Logs a focus or blur event.
         *
         * @param {DOMEvent} e The DOM event associated with the blur/focus.
         */
        var log_focus_blur = function(e, force){    
            var info;

            if( win !== win.top ||
                    (!force && e.type === 'blur' && !is_focused) || 
                    (!force && e.type === 'focus' && is_focused) ){
                return;
            }
    
            info = {
                    time: new Date().getTime(),
                    name: e.type,
                    url: doc.URL + "",
                    tab_id: tab_id,
                    title: title
            };
    
            // Chrome.
            if( is_chrome ) {
               chrome.extension.sendRequest( info );
            // Firefox.
            } else {
                CROWDLOGGER.logging.event_listeners.on_content_script_message(
                    info );
            }

            is_focused = (e.type === 'focus');
        };

        /**
         * Logs a query (er...a search event). This depends heavily on the
         * information provided in the search_page_info object, including the
         * list of results.
         *
         * @param {string} query  The query to log.
         */
        var log_search = function( query ){
            var info, previous_query;

            previous_query = search_page_info.previously_submitted_query;
            // Don't continue if the query is blank.
            if( !query || query === previous_query ||
                  (search_page_info.search_engine.indexOf('yahoo') >= 0 &&
                   query === "Search") ){
                return false;
            }

            log('Logging search: '+ query);

            // An object to hold the query info.
            info = {
                time: new Date().getTime(),
                name: "search",
                query: query,
                url: doc.URL,
                tab_id: tab_id,
                search_engine: search_page_info.search_engine,
                results_returned: search_page_info.results_returned,
                rank_start: search_page_info.result_starting_rank,
                results: search_page_info.results
            };

            // Chrome.
            if( is_chrome ){
                chrome.extension.sendRequest( info );
            // Firefox.
            } else {
                CROWDLOGGER.logging.event_listeners.on_content_script_message(
                    info );
            }

            // Make a note of this being the last submitted query.
            search_page_info.previously_submitted_query = query;
        };

        /**
         * Detects if this is a search page. If so, it updates information in
         * the search_page_info object.
         */
        var detect_search_engine = function(){
            var url = doc.URL;
            var search_engine_match = url.match('http[s]{0,1}://([^/])*[^?;]*');
            var search_engine;

            if( search_engine_match && 
                    // Ignore mail urls (e.g., gmail, yahoo mail, etc.).
                    search_engine_match[1].indexOf('mail') < 0 ){
                search_page_info.search_engine = search_engine_match[0];
            } else {
                return false;
            }

            var x;
            for( x in extractors ){
                if( search_page_info.search_engine.indexOf(x) >= 0 ){
                    search_page_info.extractor = extractors[x];
                    break;
                }
            }
            if( !search_page_info.extractor ){
                log('No search engine detected.');
                return false;
            }

            search_page_info.search_box = doc.getElementsByName(
                search_page_info.extractor.search_box_name)[0];
            search_page_info.result_list_elm = doc.getElementById(
                search_page_info.extractor.result_list_id);

            var set_search_stats = function(){
                try{
                    var start = win.location.href.match('[\?&]'+ 
                        search_page_info.extractor.first_result_offset_param +
                        '=([^&]*)[$&]');
                    if( start && start[1] ){
                        search_page_info.result_starting_rank = 
                            parseInt(start[1]);
                    }

                    search_page_info.results_returned = doc.getElementById(
                        search_page_info.extractor.result_count_id).innerHTML;
                } catch(e){
                    log('Problem extracting stats: '+ e);
                }
            };

            set_search_stats();

            // If we didn't find a valid search box, then we won't
            // consider this a search engine page.
            if( search_page_info.search_box ){
                search_page_info.is_search_page = true;
            }

            log('search_page_info.result_list_elm:');
            log(search_page_info.result_list_elm);

            if( search_page_info.result_list_elm ){
                // Traverse the search results.
                search_page_info.extractor.traverse_results();
            }

            var on_result_update = function(){
                search_page_info.results_have_been_changed = true;
                set_search_stats();
                search_page_info.result_starting_rank = 1;
                search_page_info.extractor.traverse_results();
            };

            // Add DOM change listener to this elm -- only for Google.
            if( search_page_info.search_engine.match(/google/) ){
                
                add_dom_mod_listener(doc.body, function(mutations){
                    search_page_info.result_list_elm = doc.getElementById(
                        search_page_info.extractor.result_list_id);

                    if( search_page_info.result_list_elm &&
                            !search_page_info.result_list_elm.getAttribute(
                                DATA_MARK_ATTRIBUTE) ){
                        on_result_update();
                        
                        add_dom_mod_listener(search_page_info.result_list_elm,
                            on_result_update);
                    }
                });
            }
        };



        var add_dom_mod_listener = function(elm, f){
            var observer = new myMutationObserver(function(mutations){
                f(mutations);
            });
            observer.observe(elm, {childList:true, subtree:true});
            mutationObservers.push(observer);
        }

        /**
         * Walks down a Google results list, creating a summary of the result
         * set and setting the rank associated with links within each result
         * in the data-CROWDLOGGER-RES-RANK attribute.
         */
        var traverse_google_results = function(){
            var i, j, result_list_elm = search_page_info.result_list_elm,
                result_node, result, title_elm, link_elms, rank, cite_elm,
                snippet_elm, search_box_elms, helper;
            rank = search_page_info.result_starting_rank;

            helper = new SearchResultHelper();

            result_list_elm.setAttribute(DATA_MARK_ATTRIBUTE, 'true');

            search_page_info.results = [];
            // The results elm here points to an <ol> tag. We want all the <li>
            // entries.
            for( i = 0; i < result_list_elm.childNodes.length; i++ ){
                result_node =  result_list_elm.childNodes[i];
                if( result_node.tagName === 'LI' ){
                    helper.clear();
                    result = helper.result;
                    helper.set_rank(rank);

                    title_elm = null;
                    try{
                        title_elm = result_node.getElementsByTagName('H3')[0].
                            getElementsByTagName('A')[0];

                        helper.set_title_text( title_elm.innerHTML );
                        helper.set_title_url( title_elm.getAttribute('href') );
                    } catch(e) {
                        log('title_elm: '+ e);
                    }

                    cite_elm = result_node.getElementsByTagName('CITE')[0];
                    if(cite_elm){
                        helper.set_display_url_text( cite_elm.innerHTML );
                    } else {
                        log('cite: '+ cite_elm);
                    }

                    snippet_elm = result_node.getElementsByTagName('span');
                    for( j = 0; j < snippet_elm.length; j++ ){
                        if( snippet_elm[j].hasAttribute('class') &&
                                snippet_elm[j].getAttribute('class').
                                    match(/\bst\b/) ){
                            helper.set_summary_html( snippet_elm[j].innerHTML );
                            break;
                        }
                    }

                    link_elms = result_node.getElementsByTagName('A');
                    for( j = 0; j < link_elms.length; j++ ){
                        helper.add_link(
                            link_elms[j].getAttribute('href'),
                            link_elms[j].innerHTML);

                        link_elms[j].setAttribute(RANK_DATA_ATTRIBUTE, rank);
                    }
                    search_page_info.results.push(result);
                    log(result);
                    rank++;
                }
            }

            // Update the query for this search.
        
            search_page_info.query = '';
                                      //getElementById('gs_lc0')
            search_box_elms = doc.getElementById('gs_lc0');
            if( search_box_elms ){
                var inputs = search_box_elms.getElementsByTagName('INPUT');
                for( i = 0; i < inputs.length; i++ ){
                    if( inputs[i].value.length > 0 ){
                        search_page_info.query = inputs[i].value;
                    }
                }
            }
            log_search( search_page_info.query );
        };

        /**
         * Walks down a Google results list, creating a summary of the result
         * set and setting the rank associated with links within each result
         * in the data-CROWDLOGGER-RES-RANK attribute.
         */
        var traverse_bing_results = function(){
            var i, j, result_list_elm = search_page_info.result_list_elm,
                result_node, result, title_elm, link_elms, rank, cite_elm,
                snippet_elm, search_box_elm, helper;
            rank = search_page_info.result_starting_rank;

            helper = new SearchResultHelper();

            result_list_elm.setAttribute(DATA_MARK_ATTRIBUTE, 'true');

            search_page_info.results = [];
            // The results elm here points to an <div> tag. We want the <ul> and
            // all its <li> entries.
            result_list_elm = result_list_elm.getElementsByTagName('UL')[0];
            for( i = 0; i < result_list_elm.childNodes.length; i++ ){
                result_node =  result_list_elm.childNodes[i];
                if( result_node.tagName === 'LI' ){
                    helper.clear();
                    result = helper.result;
                    helper.set_rank(rank);

                    title_elm = null;
                    try{
                        title_elm = result_node.getElementsByTagName('H3')[0].
                            getElementsByTagName('A')[0];

                        helper.set_title_text( title_elm.innerHTML );
                        helper.set_title_url( title_elm.getAttribute('href') );
                    } catch(e) {
                        log('title_elm: '+ e);
                    }

                    cite_elm = result_node.getElementsByTagName('CITE')[0];
                    if(cite_elm){
                        helper.set_display_url_text( cite_elm.innerHTML );
                    } else {
                        log('cite: '+ cite_elm);
                    }

                    snippet_elm = result_node.getElementsByTagName('P')[0];
                    if( snippet_elm ){
                        helper.set_summary_html( snippet_elm.innerHTML );
                    }

                    link_elms = result_node.getElementsByTagName('A');
                    for( j = 0; j < link_elms.length; j++ ){
                        helper.add_link(
                            link_elms[j].getAttribute('href'),
                            link_elms[j].innerHTML );

                        link_elms[j].setAttribute(RANK_DATA_ATTRIBUTE, rank);
                    }
                    search_page_info.results.push(result);
                    log(result);
                    rank++;
                }
            }

            // Update the query for this search.
            search_page_info.query = '';
            search_box_elm = doc.getElementsByName('q')[0];
            if( search_box_elm ){
                search_page_info.query = search_box_elm.value;
            }
            log_search( search_page_info.query );
        };

        /**
         * Walks down a Google results list, creating a summary of the result
         * set and setting the rank associated with links within each result
         * in the data-CROWDLOGGER-RES-RANK attribute.
         */
        var traverse_yahoo_results = function(){
            var i, j, result_list_elm = search_page_info.result_list_elm,
                result_node, result, title_elm, link_elms, rank, cite_elm,
                snippet_elm, search_box_elm, span_elms, div_elmsm, helper;
            rank = search_page_info.result_starting_rank;

            helper = new SearchResultHelper();

            result_list_elm.setAttribute(DATA_MARK_ATTRIBUTE, 'true');

            search_page_info.results = [];
            // The results elm here points to an <div> tag. We want the <ul> and
            // all its <li> entries.
            result_list_elm = result_list_elm.getElementsByTagName('OL')[0];
            for( i = 0; i < result_list_elm.childNodes.length; i++ ){
                result_node =  result_list_elm.childNodes[i];
                if( result_node.tagName === 'LI' ){
                    helper.clear();
                    result = helper.result;
                    helper.set_rank(rank);

                    link_elms = result_node.getElementsByTagName('A');

                    title_elm = null;
                    for( j = 0; j < link_elms.length && !title_elm; j++ ){
                        if( link_elms[j].hasAttribute('class') &&
                                link_elms[j].getAttribute('class').match(
                                    /\byschttl\b/) ){
                            title_elm = link_elms[j];
                        }
                    }

                    if( title_elm ){
                        helper.set_title_text( title_elm.innerHTML );
                        helper.set_title_url( title_elm.getAttribute('href') );
                    } else {
                        log('title_elm: '+ title_elm);
                    }

                    span_elms = result_node.getElementsByTagName('SPAN');
                    cite_elm = null;
                    for( j = 0; j < span_elms.length; j++ ){
                        if( span_elms[j].hasAttribute('class') && 
                                span_elms[j].getAttribute('class').match(
                                    /\b(url)|(sm-url)\b/) ) {
                            cite_elm = span_elms[j];
                        }
                    }
                    if(cite_elm){
                        helper.set_display_url_text( cite_elm.innerHTML );
                    } else {
                        log('cite: '+ cite_elm);
                    }

                    div_elms = result_node.getElementsByTagName('DIV');
                    snippet_elm = null;
                    for( j = 0; j < div_elms.length; j++ ){
                        if( div_elms[j].hasAttribute('class') && 
                                div_elms[j].getAttribute('class').match(
                                    /\b(abstr)|(sm-abs)\b/) ) {
                            snippet_elm = div_elms[j];
                        }
                    }
                    if( snippet_elm ){
                        helper.set_summary_html( snippet_elm.innerHTML );
                    } else {
                        log('snippet: '+ snippet_elm);
                    }

                    result.links = [];
                    for( j = 0; j < link_elms.length; j++ ){
                        helper.add_link(
                            link_elms[j].getAttribute('href'),
                            link_elms[j].innerHTML )

                        link_elms[j].setAttribute(RANK_DATA_ATTRIBUTE, rank);
                    }
                    search_page_info.results.push(result);
                    log(result);
                    rank++;
                }
            }

            // Update the query for this search.
            search_page_info.query = '';
            search_box_elm = doc.getElementsByName('p')[0];
            if( search_box_elm ){
                search_page_info.query = search_box_elm.value;
            }
            log_search( search_page_info.query );
        };
    
        /**
         * Called when the page unloads.
         */
        var on_unload = function(){
            log_focus_blur({type: 'blur'});
            remove_listeners();
        };

        /**
         * Removes all listeners added using add_listener.
         */
        var remove_listeners = function(){
            while( listeners.length > 0 ){
                var listener = listeners[0];
                listener.elm.removeEventListener( listener.event_type, 
                    listener.callback, listener.in_capture);
                listeners.splice(0,1);
            }
            while( mutationObservers.length > 0 ){
                mutationObservers[0].disconnect();
                mutationObservers.splice(0,1);
            }
        };

        /**
         * Adds a listener to the specified element and stores this information
         * so it can be easily removed later.
         *
         * @param {object} elm  The DOM element on which to place the listener.
         * @param {string} event_type The event to listen for.
         * @param {function} callback The function to invoke when the event
         *                            triggers.
         * @param {boolean} capture Whether to trigger the callback during the
         *                          capture phase (vs. bubble phase).
         */
        var add_listener = function(elm, event_type, callback, in_capture){
            listeners.push({
                elm: elm, 
                event_type: event_type,
                callback: callback,
                in_capture: in_capture === true // So it's not 'undefined'...
            });
            elm.addEventListener(event_type, callback, in_capture===true);
        };

        /**
         * Adds the initial round of listeners. Listeners are registered via
         * <code>add_listener</code> so that they can easily be removed at
         * page unload.
         */
        var add_listeners = function(){
            add_listener(win, 'unload', on_unload);
            add_listener(win, 'focus', log_focus_blur, false);
            add_listener(win, 'blur', log_focus_blur, false);
            add_listener(doc, 'click', on_click, true);
            // These are both to combat the practice of websites (e.g., google),
            // displaying one href value prior to a user clicking and then
            // reseting it as they click it.
            add_listener(doc, 'mousedown', store_href, true);
            add_listener(doc, 'keydown', store_href, true);
        };

        /**
         * Initializes all the listeners. Also checks if this script has already
         * been injected on this page. If so, nothing is done.
         */
        var init = function(){
            if( win.CROWDLOGGER_INIT ){
                return;
            }
            win.CROWDLOGGER_INIT = true;

            //B_DEBUG
            log( "About to get things started..."); 
            //E_DEBUG

            title = doc.title;

            if(is_focused){
                log_focus_blur({type: 'focus'}, true);
            }

            // Check if this is a search page.
            detect_search_engine();

            // Adds the listeners.
            add_listeners();
        };
        
        // This is only down here so we can reference functions defined above.
        extractors = {
            google: {
                search_box_name: 'q',
                result_list_id: 'rso',
                result_count_id: 'resultStats',
                first_result_offset_param: 'start',
                traverse_results: traverse_google_results
            },
            bing: {
                search_box_name: 'q',
                result_list_id: 'results',
                result_count_id: 'count',
                first_result_offset_param: 'first',
                traverse_results: traverse_bing_results
            },
            yahoo: {
                search_box_name: 'p',
                result_list_id: 'web',
                result_count_id: 'resultCount',
                first_result_offset_param: 'b',
                traverse_results: traverse_yahoo_results
            }
        };

        // Start things!
        init();
    }();
};

/**
 * An interface for content scripts. Currently, it is used to log interactions,
 * like searches and clicks, that were tracked by content scripts.
 * 
 * @param {object} message  A map of data.
 * @param {string} sender   The sender; unused.
 */
CROWDLOGGER.logging.event_listeners.on_content_script_message = 
        function(message, sender){

    // Don't continue if we're not logging.
    if( !CROWDLOGGER.preferences.get_bool_pref( "logging_enabled", false ) ){
        return false;
    }

    CROWDLOGGER.debug.log('Received message from content script: '+
        message.name +' @ '+ (message.url || message.originating_page_url) );

    // Log a click event.
    if( message.name === 'click' ){
        CROWDLOGGER.logging.log_click( message.time, message.clicked_url, 
            message.originating_page_url, message.tab_id, 
            message.button, message.query, message.rank, message.anchor_text ); 

    // Log a search event.
    } else if( message.name === 'search' ){
        CROWDLOGGER.logging.add_search_candidate( message );

    // Log that a page was focused, and update the currently displayed tab.
    } else if( message.name === 'focus' ){
        // Update the currently displayed tab.
        CROWDLOGGER.session_data.last_selected_tab = {
            tab_id: message.tab_id,
            url: message.url
        };

        CROWDLOGGER.logging.log_page_focused( message.time,
            message.tab_id, message.url, message.title );

    // Log a page blur.
    } else if( message.name === 'blur' ){
        CROWDLOGGER.logging.log_page_blur( message.time,
            message.tab_id, message.url, message.title );
    }
};

} // END CROWDLOGGER.logging.event_listeners NAMESPACE.
