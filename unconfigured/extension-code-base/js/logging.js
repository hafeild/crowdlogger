/**
 * @fileOverview Functions pertaining to logging, including log IO and 
 * interfaces to the logging buttons.<p>
 * 
 * See the CROWDLOGGER.logging namespace.<p>
 *
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

if( CROWDLOGGER.logging === undefined ){

/**
 * @namespace Contains functions for logging events and interfacing with the
 * logging mechanism.
 */
CROWDLOGGER.logging = {
    activity_log_file: "",
    serp_log_file: "",
    query_filter_file: "",
    MAX_QUERY_LENGTH: 200,

    CLICK: "click",
    SEARCH: "search",
    PAGE_FOCUS: "pagefocus",
    PAGE_LOAD: "pageload",
    LOGGING_STATUS_CHANGE: "loggingstatuschange",
    TAB_ADD: "tabadd",
    TAB_REMOVE: "tabremove",


    is_click: function(entry){ 
        return entry.e === CROWDLOGGER.logging.CLICK; },
    is_search: function(entry){ 
        return entry.e === CROWDLOGGER.logging.SEARCH; },
    is_page_focus: function(entry){ 
        return entry.e ===CROWDLOGGER.logging. PAGE_FOCUS; },
    is_page_load: function(entry){ 
        return entry.e === CROWDLOGGER.logging.PAGE_LOAD; },
    is_logging_status_change: function(entry){ 
        return entry.e === CROWDLOGGER.logging.LOGGING_STATUS_CHANGE;},
    is_tab_add: function(entry){ 
        return entry.e === CROWDLOGGER.logging.TAB_ADD; },
    is_tab_remove: function(entry){ 
        return entry.e === CROWDLOGGER.logging.TAB_REMOVE; }
};
 
 
/**
 * Toggles the logging mechanism.
 * @param {Object} event
 */
CROWDLOGGER.logging.toggle_logging = function( event ){
    //B_DEBUG
    CROWDLOGGER.debug.log( 'Toggling logging.\n' );
    //E_DEBUG
  
    if( CROWDLOGGER.preferences.get_bool_pref( 'consent_required', true ) ){
        alert( 'Please agree to the Informed Consent (see the status page) ' +
               'before attempting to turn logging on. Thanks!' );
        return false;
    }
 
    var enable_logging = !CROWDLOGGER.preferences.get_bool_pref(
            'logging_enabled', false );

    CROWDLOGGER.logging.set_logging( enable_logging );
};


/**
 * Turns logging on or off based on the value of logging_enabled.
 *
 * @param {boolean} enable_logging Set to <tt>true</tt> if logging should be
 *      turned on; <tt>false</tt> if logging should be turned off.
 */
CROWDLOGGER.logging.set_logging = function( enable_logging ){

    var time = new Date().getTime();

    // Check if we're in private browsing mode. If not, go ahead and switch.
    if( CROWDLOGGER.session_data.get( 'in_private_browsing_mode', false ) ||
        CROWDLOGGER.preferences.get_bool_pref( 'consent_required', true ) ) {
        enable_logging = false;
    } else {
        CROWDLOGGER.preferences.set_bool_pref( 'logging_enabled_pre_consent',
            enable_logging );
    }

    // Log the change in status.
    CROWDLOGGER.io.log.write_to_activity_log( {
        data: [{
            e: CROWDLOGGER.logging.LOGGING_STATUS_CHANGE,
            le: enable_logging,
            t: time
        }]
    });


    CROWDLOGGER.preferences.set_bool_pref( 'logging_enabled',
        enable_logging );

    // Update the buttons.
    CROWDLOGGER.gui.buttons.update_logging_buttons( enable_logging );

};

/**
 * Removes all of the logs. These include the:
 * <ul>
 *      <li>activity log</li>
 *      <li>error log</li>
 * </ul>
 *
 * To delete specific logs, see <code>CROWDLOGGER.io.logs</code>.
 */
CROWDLOGGER.logging.remove_logs = function(){
    //B_DEBUG
    CROWDLOGGER.debug.log( "Removing logs...\n" );
    //E_DEBUG

    CROWDLOGGER.io.log.clear_activity_log();
    CROWDLOGGER.io.log.clear_error_log(); 
};


/**
 * Logs a click.
 *
 * @param {int} time The time stamp associated with the click.
 * @param {string} clicked_url The url that was clicked.
 * @param {string} originating_page_url The url of the page on which the link
 *      was clicked.
 * @param {string} button The button that was pressed.
 * @param {string} query The query (can be omitted or blank).
 */
CROWDLOGGER.logging.log_click = function( time, clicked_url, 
        originating_page_url, button, query ){
    var click_event, is_search_result, log_entry;

    // Make sure that logging is turned on. If not, just return.
    if( !CROWDLOGGER.preferences.get_bool_pref( "logging_enabled", false ) ){
        return false;
    }

    // If the query is undefined, we need to set it to an empty string.
    query = (query === undefined) ? "" : query;

    // Is this a search result?
    is_search_result = (query === "") ? false : true;
    

    // Create the log entry:
    log_entry = {
        e: CROWDLOGGER.logging.CLICK,
        t: time,
        turl: CROWDLOGGER.util.cleanse_string(clicked_url),
        surl: CROWDLOGGER.util.cleanse_string(originating_page_url),
        sr: is_search_result,
        q: CROWDLOGGER.util.cleanse_string(query)  
    };

    // Write the entry to the log.
    CROWDLOGGER.io.log.write_to_activity_log( {data: [log_entry]} );
};



/**
 * Logs that a tab has been added.
 *
 * @param {int} time The time stamp associated with the click.
 * @param {string} tab_id The id of the tab that was opened.
 * @param {string} url The url being loaded into the new tab.
 * @param {string} src_tab_id The id of the tab from which the new tab was
 *      created.
 * @param {string} src_url The url that sparked the new tab to be created.
 */
CROWDLOGGER.logging.log_tab_added = function( time, tab_id, url, src_tab_id, 
        src_url ){
    // Make sure that logging is turned on. If not, just return.
    if( !CROWDLOGGER.preferences.get_bool_pref( "logging_enabled", false ) ){
        return false;
    }

    // Create the log entry.
    var log_entry = {
        e: CROWDLOGGER.logging.TAB_ADD,
        t: time,
        ttid: tab_id,
        turl: CROWDLOGGER.util.cleanse_string(url),
        stid: src_tab_id,
        surl: CROWDLOGGER.util.cleanse_string(src_url) 
    };
    // Log it.
    CROWDLOGGER.io.log.write_to_activity_log( {data: [log_entry]} );
};

/**
 * Logs that a tab has been removed.
 *
 * @param {int} time The time stamp associated with the click.
 * @param {string} tab_id The id of the tab that was opened.
 */
CROWDLOGGER.logging.log_tab_removed = function( time, tab_id ){
    // Make sure that logging is turned on. If not, just return.
    if( !CROWDLOGGER.preferences.get_bool_pref( "logging_enabled", false ) ){
        return false;
    }

    // Create the log entry.
    var log_entry = {
        e: CROWDLOGGER.logging.TAB_REMOVE,
        t: time,
        tid: tab_id
    };

    // Log it.
    CROWDLOGGER.io.log.write_to_activity_log( {data: [log_entry]} );
};

/**
 * Logs that a page has loaded.
 *
 * @param {int} time The time stamp associated with the click.
 * @param {string} tab_id The id of the tab that was opened.
 * @param {string} url The url of the page that was loaded.
 */
CROWDLOGGER.logging.log_page_loaded = function( time, tab_id, url ){
    // Make sure that logging is turned on. If not, just return.
    if( !CROWDLOGGER.preferences.get_bool_pref( "logging_enabled", false ) ){
        return false;
    }

    // Create the log entry.
    var log_entry = {
        e: CROWDLOGGER.logging.PAGE_LOAD,
        t: time,
        tid: tab_id,
        url: CROWDLOGGER.util.cleanse_string(url)
    };

    // Log it.
    CROWDLOGGER.io.log.write_to_activity_log( {data: [log_entry]} );
};


/**
 * Logs that a page has come into focus.
 *
 * @param {int} time The time stamp associated with the click.
 * @param {string} tab_id The id of the tab that was opened.
 * @param {string} url The url of the page in the tab.
 */
CROWDLOGGER.logging.log_page_focused = function( time, tab_id, url ){
    // Make sure that logging is turned on. If not, just return.
    if( !CROWDLOGGER.preferences.get_bool_pref( "logging_enabled", false ) ){
        return false;
    }

    // Create the log entry.
    var log_entry = {
        e: CROWDLOGGER.logging.PAGE_FOCUS,
        t: time,
        tid: tab_id,
        url: CROWDLOGGER.util.cleanse_string(url)
    };

    // Log it.
    CROWDLOGGER.io.log.write_to_activity_log( {data: [log_entry]} );
};

/**
 * Logs a search event.
 *
 * @param {int} time The time stamp associated with the search.
 * @param {string} query The query entered.
 * @param {string} search_engine The search engine to which the query was posed.
 * @param {string} url The url of the search results page.

 */
CROWDLOGGER.logging.log_search = function( time, query, search_engine, url ){
    // Make sure that logging is turned on. Also check how long the query is --
    // if it's too long, we're not going to log it. 
    if( !CROWDLOGGER.preferences.get_bool_pref( "logging_enabled", false ) ||
        query.length > CROWDLOGGER.logging.MAX_QUERY_LENGTH ){
        return false;
    }

    // Create the log entry.
    var log_entry = {
        e: CROWDLOGGER.logging.SEARCH,
        t: time,
        q: CROWDLOGGER.util.cleanse_string( query ),
        se: search_engine,
        url: CROWDLOGGER.util.cleanse_string(url)
    };

    // Log it.
    CROWDLOGGER.io.log.write_to_activity_log( {data: [log_entry]} );
};


/**
 * Decides whether to log a candidate query. The basic rules are:
 * 1. log if the current query is not the same as the previous query AND
 *    the time delta between the two is sufficient
 * 2. log if the previous query is not a prefix of the current query, regardless
 *    of the time deta.
 * 3. log if the search engines or results urls are different.
 * @name CROWDLOGGER.logging.add_search_candidate
 * @function
 *
 * @param {int} time The time stamp associated with the search.
 * @param {string} query The query entered.
 * @param {string} search_engine The search engine to which the query was posed.
 * @param {string} search_results_url The url of the search results page.
 * @param {string} is_dummy (Optional) <tt>true</tt> if the search event is
 *      a dummy event used to flush out a previous search.
 */
CROWDLOGGER.logging.init = function(){
    // Local state variables.
    var add_search_candidate;
    var current_ticket_out;
    var get_ticket_number;
    var lock_buffer;
    var max_ticket_number; 
    var previous_search;
    var serving_ticket_number;
    var sufficient_delta;

    // The maximum ticket number (after which, it will wrap back around).
    max_ticket_number = 100;
    // Milliseconds 
    sufficient_delta = 50; // A half second.

    // The ticket defaults.
    current_ticket_out = -1;
    serving_ticket_number = current_ticket_out + 1;

    // This will hold the information about the previous search.
    previous_search = undefined;

    // Gets the next available ticket.
    /** @ignore */
    get_ticket_number = function(){
        current_ticket_out = (current_ticket_out+1)%max_ticket_number;
        return current_ticket_out;
    };

    // This actually does the work.
    /** @ignore */
    add_search_candidate = function( time, query, search_engine, 
            search_results_url, is_dummy ){

        is_dummy = (is_dummy === undefined) ? false : is_dummy;

        // Create an object for this search candidate.
        var current_search = { 
            time: time, 
            query: query, 
            search_engine: search_engine, 
            search_results_url: search_results_url,
            is_dummy: is_dummy
        };

        /*//B_DEBUG
        CROWDLOGGER.debug.log( "current search: " + 
            JSON.stringify( current_search ) + "\n" );
        CROWDLOGGER.debug.log( "prev search: " + 
            JSON.stringify( previous_search ) + "\n" );
        //E_DEBUG*/

        // Buffer an undefined search to flush out the current search,
        // but only if that's not what the previous search is. This
        // should prevent duplicate queries from being logged.
        if( previous_search === undefined ){
            previous_search = current_search;
            if( !is_dummy ){
                setTimeout( function(){ 
                    CROWDLOGGER.logging.add_search_candidate( 
                        time+sufficient_delta, query,
                        search_engine, search_results_url, true)
                }, sufficient_delta );
            }
            return false;
        }

        // First, determine if these are even in the right order.
        if( previous_search !== undefined &&
                current_search.time < previous_search.time ){
            CROWDLOGGER.io.log.write_to_error_log( {data: [{
                f: "CROWDLOGGER.logging.init",
                err: "Searches out of order! prev: [" + 
                        previous_search.query + ", " + previous_search.time + 
                        "] cur:[ " + current_search.query + ", " + 
                        current_search.time + "]",
                t: new Date().getTime()
            }]} );
        }

        // Logs the previous query.
        /** @ignore */
        var log_previous = function(){
            if( !previous_search.is_dummy){
                CROWDLOGGER.logging.log_search( 
                    previous_search.time,
                    previous_search.query,
                    previous_search.search_engine,
                    previous_search.search_results_url
                );
            }
        };
   
        // Checks if the current and previous searches are identical, ignoring
        // the timestamp.
        /** @ignore */
        var searches_are_identical = 
              current_search.query === previous_search.query &&
              current_search.search_engine === previous_search.search_engine &&
              current_search.search_results_url ===
                previous_search.search_results_url;
   
        /*//B_DEBUG
        CROWDLOGGER.debug.log( "searches_are_identical: " + 
            searches_are_identical + "\n" );
        //E_DEBUG*/

        // Are the times sufficiently different and the queries different?
        // Their search engines?
        // Their search urls?
        // Is the prevous search not a prefix of the current query?
        // If this is a dummy query corresponding to the previous query,
        // log the previous query.
        if( (!searches_are_identical && 
              current_search.time - previous_search.time >= sufficient_delta ) ||
             (current_search.search_engine !== previous_search.search_engine)||
             (current_search.search_results_url !== 
                previous_search.search_results_url) ||
             (current_search.query.indexOf( previous_search.query ) !== 0) ||
             (searches_are_identical && current_search.is_dummy) ) {

            // Log the previous search.
            log_previous();

            // If the current search is a dummy, but for a search other than
            // the previous one, don't set the previous search to the dummy.
            if( (!searches_are_identical && 
                    !(current_search.is_dummy && !previous_search.is_dummy)) ||
                    searches_are_identical ){
                previous_search = current_search;
            }
        }

        // Buffer an undefined search to flush out the current search,
        // but only if that's not what the previous search is. This
        // should prevent duplicate queries from being logged.
        if( !current_search.is_dummy ){
            setTimeout( function(){
                CROWDLOGGER.logging.add_search_candidate( 
                    time+sufficient_delta, query,
                    search_engine, search_results_url, true);
            }, sufficient_delta );
        }

    };

    // This will make sure we're not stepping on anyone's toes and that
    // callers are processed first-come-first-serve (as opposed to only having
    // a binary lock, which might result in things being processed out of order
    // because of time delays.
    /** @ignore */
    lock_buffer = function( time, query, search_engine, 
            search_results_url, is_dummy, ticket_number ){

        // Not sure if it makes sense to have this here, or if we should
        // just leave the catch at the 'log search' function.
        /*
        // Make sure that logging is turned on. If not, just return.
        if( !CROWDLOGGER.preferences.get_bool_pref( "logging_enabled", false ) ){
            return false;
        }
        */

        // If we don't have a ticket number, get one.
        ticket_number = 
            (ticket_number === undefined) ? get_ticket_number() : ticket_number;

        /*//B_DEBUG
        CROWDLOGGER.debug.log( "In lock_buffer.\n\t" +
            "QUERY:  " + query + "\n\t" +
            "SE:     " + search_engine + "\n\t" +
            "TICKET: " + ticket_number + "\n\t" +
            "NEXT:   " + serving_ticket_number + "\n" );
        //E_DEBUG*/

        // See if it's our turn.
        if( ticket_number === serving_ticket_number ){
            try{
                add_search_candidate( time, query, search_engine, 
                search_results_url, is_dummy );
            } catch (e) {
                CROWDLOGGER.io.log.write_to_error_log( {data: [{
                    f: "CROWDLOGGER.logging.add_seach_candidate",
                    err: "Failed on: query="+ query + 
                        "; search_engine="+ search_engine + 
                        "; search_results_url="+ search_results_url + 
                        "; is_dummy: "+ is_dummy +"; for ticket number: "+ 
                        ticket_number +"; ERROR: "+ e,
                    t: new Date().getTime()
                }]});
            }
            // Important: this gets set _after_ we've processed the current
            // search.
            serving_ticket_number = (ticket_number + 1) % max_ticket_number;
        } else {
            setTimeout( function(){ lock_buffer(
              time, query, search_engine, search_results_url, is_dummy,
              ticket_number);},
               3 );
        }

    };


    CROWDLOGGER.logging.add_search_candidate = lock_buffer;
};


} // END CROWDLOGGER.logging NAMESPACE
