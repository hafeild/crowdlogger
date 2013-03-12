/**
 * @fileOverview Functions pertaining to logging, including log IO and 
 * interfaces to the logging buttons.<p>
 * 
 * See the CROWDLOGGER.logging namespace.<p>
 *
 * %%LICENSE%%
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
    PAGE_BLUR: "pageblur",
    PAGE_LOAD: "pageload",
    LOGGING_STATUS_CHANGE: "loggingstatuschange",
    TAB_ADD: "tabadd",
    TAB_REMOVE: "tabremove",
    TAB_SELECT: "tabselect",


    is_click: function(entry){ 
        return entry.e === CROWDLOGGER.logging.CLICK; },
    is_search: function(entry){ 
        return entry.e === CROWDLOGGER.logging.SEARCH; },
    is_page_focus: function(entry){ 
        return entry.e ===CROWDLOGGER.logging. PAGE_FOCUS; },
    is_page_blur: function(entry){ 
        return entry.e ===CROWDLOGGER.logging. PAGE_BLUR; },
    is_page_load: function(entry){ 
        return entry.e === CROWDLOGGER.logging.PAGE_LOAD; },
    is_logging_status_change: function(entry){ 
        return entry.e === CROWDLOGGER.logging.LOGGING_STATUS_CHANGE;},
    is_tab_add: function(entry){ 
        return entry.e === CROWDLOGGER.logging.TAB_ADD; },
    is_tab_remove: function(entry){ 
        return entry.e === CROWDLOGGER.logging.TAB_REMOVE; },
    is_tab_select: function(entry){ 
        return entry.e === CROWDLOGGER.logging.TAB_SELECT; }
};
 
 
/**
 * Toggles the logging mechanism.
 * @param {Object} event
 */
CROWDLOGGER.logging.toggle_logging = function( event ){
    //B_DEBUG
    // CROWDLOGGER.debug.log( 'Toggling logging.\n' );
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
 * @param {string} source_page_url The url of the page on which the link
 *      was clicked.
 * @param {string} source_tab_id The id of the tab where the click originated.
 * @param {string} button The button that was pressed.
 * @param {string} query The query (can be omitted or blank).
 * @param {int} rank The rank of the document of the click (can be null).
 * @param {string} anchor_text The anchor text of the link that was clicked.
 */
CROWDLOGGER.logging.log_click = function( time, clicked_url, 
        source_page_url, source_tab_id, button, query, rank, anchor_text ){
    var click_event, is_search_result, log_entry;

    // Make sure that logging is turned on. If not, just return.
    if( !CROWDLOGGER.enabled ||
            !CROWDLOGGER.preferences.get_bool_pref( "logging_enabled", false )){
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
        surl: CROWDLOGGER.util.cleanse_string(source_page_url),
        stid: source_tab_id+'',
        anc: anchor_text 
    };

    if( is_search_result ){
        log_entry.s = {
            q: CROWDLOGGER.util.cleanse_string(query),
            r: rank
        };
    }

    // Announce the event.
    CROWDLOGGER.messages.trigger('link-clicked', log_entry);

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
    if( !CROWDLOGGER.enabled ||
            !CROWDLOGGER.preferences.get_bool_pref( "logging_enabled", false )){
        return false;
    }

    // Create the log entry.
    var log_entry = {
        e: CROWDLOGGER.logging.TAB_ADD,
        t: time,
        ttid: tab_id+'',
        turl: CROWDLOGGER.util.cleanse_string(url),
        stid: src_tab_id+'',
        surl: CROWDLOGGER.util.cleanse_string(src_url) 
    };

    // Announce the event.
    CROWDLOGGER.messages.trigger('tab-added', log_entry);

    // Log it.
    CROWDLOGGER.io.log.write_to_activity_log( {data: [log_entry]} );
};

/**
 * Logs that a tab has been removed.
 *
 * @param {int} time The time stamp associated with the removal.
 * @param {string} tab_id The id of the tab that was removed.
 */
CROWDLOGGER.logging.log_tab_removed = function( time, tab_id ){
    // Make sure that logging is turned on. If not, just return.
    if( !CROWDLOGGER.enabled ||
            !CROWDLOGGER.preferences.get_bool_pref( "logging_enabled", false )){
        return false;
    }

    // Create the log entry.
    var log_entry = {
        e: CROWDLOGGER.logging.TAB_REMOVE,
        t: time,
        tid: tab_id+''
    };

    // Announce the event.
    CROWDLOGGER.messages.trigger('tab-removed', log_entry);

    // Log it.
    CROWDLOGGER.io.log.write_to_activity_log( {data: [log_entry]} );
};

/**
 * Logs that a tab has been selected.
 *
 * @param {int} time The time stamp associated with the selection.
 * @param {string} tab_id The id of the tab that was selected.
 */
CROWDLOGGER.logging.log_tab_selected = function( time, tab_id, url ){
    // Make sure that logging is turned on. If not, just return.
    if( !CROWDLOGGER.enabled ||
            !CROWDLOGGER.preferences.get_bool_pref( "logging_enabled", false )){
        return false;
    }

    // Create the log entry.
    var log_entry = {
        e: CROWDLOGGER.logging.TAB_SELECT,
        t: time,
        tid: tab_id+'',
        url: url
    };

    // Announce the event.
    CROWDLOGGER.messages.trigger('tab-select', log_entry);

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
    if( !CROWDLOGGER.enabled ||
            !CROWDLOGGER.preferences.get_bool_pref( "logging_enabled", false )){
        return false;
    }

    // Create the log entry.
    var log_entry = {
        e: CROWDLOGGER.logging.PAGE_LOAD,
        t: time,
        tid: tab_id+'',
        url: CROWDLOGGER.util.cleanse_string(url)
    };
    // Announce the event.
    CROWDLOGGER.messages.trigger('page-loaded', log_entry);

    // Log it.
    CROWDLOGGER.io.log.write_to_activity_log( {data: [log_entry]} );
};

/**
 * Logs that a page has come into focus.
 *
 * @param {int} time The time stamp associated with the event.
 * @param {string} tab_id The id of the tab that contains the page.
 * @param {string} url The url of the page.
 */
CROWDLOGGER.logging.log_page_focused = function( time, tab_id, url, title ){
    // Make sure that logging is turned on. If not, just return.
    if( !CROWDLOGGER.enabled ||
            !CROWDLOGGER.preferences.get_bool_pref( "logging_enabled", false )){
        return false;
    }

    // Create the log entry.
    var log_entry = {
        e: CROWDLOGGER.logging.PAGE_FOCUS,
        t: time,
        tid: tab_id+'',
        url: CROWDLOGGER.util.cleanse_string(url),
        ttl: title
    };

    // Announce the event.
    CROWDLOGGER.messages.trigger('page-focused', log_entry);

    // Log it.
    CROWDLOGGER.io.log.write_to_activity_log( {data: [log_entry]} );
};

/**
 * Logs that a page has left focus.
 *
 * @param {int} time The time stamp associated with the event.
 * @param {string} tab_id The id of the tab containing the page.
 * @param {string} url The url of the page in the tab.
 */
CROWDLOGGER.logging.log_page_blur = function( time, tab_id, url, title ){
    // Make sure that logging is turned on. If not, just return.
    if( !CROWDLOGGER.enabled ||
            !CROWDLOGGER.preferences.get_bool_pref( "logging_enabled", false )){
        return false;
    }

    // Create the log entry.
    var log_entry = {
        e: CROWDLOGGER.logging.PAGE_BLUR,
        t: time,
        tid: tab_id+'',
        url: CROWDLOGGER.util.cleanse_string(url),
        ttl: title
    };

    // Announce the event.
    CROWDLOGGER.messages.trigger('page-blurred', log_entry);

    // Log it.
    CROWDLOGGER.io.log.write_to_activity_log( {data: [log_entry]} );
};

/**
 * Logs a search event.
 *
 * @param {int} time The time stamp associated with the search.
 * @param {string} tab_id The id of the tab in which the query was entered.
 * @param {string} query The query entered.
 * @param {string} search_engine The search engine to which the query was posed.
 * @param {string} url The url of the search results page.

 */
CROWDLOGGER.logging.log_search = function( search ){
    // Make sure that logging is turned on. Also check how long the query is --
    // if it's too long, we're not going to log it. 
    if( !CROWDLOGGER.enabled ||
            !CROWDLOGGER.preferences.get_bool_pref( "logging_enabled", false )){

        return false;
    }
    var clean = CROWDLOGGER.util.cleanse_string;

    CROWDLOGGER.debug.log('Logging search: '+ search.query);


    // Create the log entry.
    var log_entry = JSON.parse(clean(JSON.stringify({
        e: CROWDLOGGER.logging.SEARCH,
        t: search.time,
        tid: search.tab_id+'',
        q: search.query.slice(0, CROWDLOGGER.logging.MAX_QUERY_LENGTH),
        se: search.search_engine,
        url: search.url,
        res: search.results,
        rcnt: search.results_returned, 
        srnk: search.rank_start
    })));


    // Announce the event.
    CROWDLOGGER.messages.trigger('query-entered', log_entry);

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
    sufficient_delta = 1000; // A full second.

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
    add_search_candidate = function( search_data, is_dummy ){
        is_dummy = is_dummy || false;

        var current_search = CROWDLOGGER.util.copy_obj(search_data);
        current_search.is_dummy = is_dummy;

        // Buffer an undefined search to flush out the current search,
        // but only if that's not what the previous search is. This
        // should prevent duplicate queries from being logged.
        if( previous_search === undefined ){
            previous_search = current_search;
            if( !is_dummy ){
                setTimeout( function(){ 
                    CROWDLOGGER.logging.add_search_candidate(search_data, true);
                }, sufficient_delta );
            }
            return false;
        }

        // Logs the previous query.
        /** @ignore */
        var log_previous = function(){
            if( !previous_search.is_dummy){
                CROWDLOGGER.logging.log_search( 
                    search_data
                );
            }
        };
   
        // Checks if the current and previous searches are identical, ignoring
        // the timestamp.
        /** @ignore */
        var searches_are_identical = 
              current_search.query === previous_search.query &&
              current_search.search_engine === previous_search.search_engine &&
              current_search.url === previous_search.url;

        // Are the times sufficiently different and the queries different?
        // Their search engines?
        // Their search urls?
        // Is the prevous search not a prefix of the current query?
        // If this is a dummy query corresponding to the previous query,
        // log the previous query.
        if( (!searches_are_identical && 
              current_search.time - previous_search.time >= sufficient_delta ) ||
             (current_search.search_engine !== previous_search.search_engine)||
             (current_search.url !== previous_search.url) ||
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
                current_search.time += sufficient_delta;
                CROWDLOGGER.logging.add_search_candidate(current_search, true);
            }, sufficient_delta );
        }
    };

    // This will make sure we're not stepping on anyone's toes and that
    // callers are processed first-come-first-serve (as opposed to only having
    // a binary lock, which might result in things being processed out of order
    // because of time delays.
    /** @ignore */
    lock_buffer = function( search_data, is_dummy, ticket_number ){
        // If we don't have a ticket number, get one.
        ticket_number = 
            (ticket_number === undefined) ? get_ticket_number() : ticket_number;

        // See if it's our turn.
        if( ticket_number === serving_ticket_number ){
            try{
                add_search_candidate( search_data, is_dummy );
            } catch (e) {
                CROWDLOGGER.debug.log('Error in lock_buffer: '+ e);
            }
            // Important: this gets set _after_ we've processed the current
            // search.
            serving_ticket_number = (ticket_number + 1) % max_ticket_number;
        } else {
            setTimeout( function(){ 
                lock_buffer( search_data, is_dummy, ticket_number);
            }, 3 );
        }
    };

    CROWDLOGGER.logging.add_search_candidate = lock_buffer;
};


} // END CROWDLOGGER.logging NAMESPACE
