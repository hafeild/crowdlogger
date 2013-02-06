/**
 * @fileOverview Provides search log operations to which user-defined functions
 * can be applied (e.g., specify a function to be performed on every pair
 * of query terms extracted from the log).<p>
 * 
 * See the  CROWDLOGGER.log.operations namespace.<p>
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */


if( CROWDLOGGER.log === undefined ){
    CROWDLOGGER.log = {};
}

if( CROWDLOGGER.log.operations === undefined ){

/**
 * @namespace Provides a number of functionalities for extracting information
 *      from search logs.
 */
CROWDLOGGER.log.operations = {};

/**
 * @namespace Provides a number of mechanisms for filtering the data in logs,
 *      for example, removing Google instant queries. All filters should take
 *      an options parameter (which can be undefined) and should return an
 *      inner function that will actually filter input. The inner function
 *      should take a log entry object and return the value returned by
 *      the next function (if there is one, provided in the options object)
 *      when the end-of-stream (EOS) is reached, denoted by a EOS object:
 *      {last: true}. Another special object is a 'skip': {skip: true}. This
 *      signals the filter to reset any state variables it has. The use case
 *      for this is when constraining qurey pairs, for instance, to a session.
 *      See CROWDLOGGER.log.operations.filter.instant_queries
 *      as an example.
 */
CROWDLOGGER.log.operations.filter = {};

/**
 * @namespace Provides a number of mechanisms for accumulating information
 *      over a search log, for example, queries or query pairs. These can
 *      be used in conjunction with filters. All accumulators should take
 *      an options parameter (which can be undefined) and should return an
 *      inner function that will actually filter input. The inner function
 *      should take a log entry object and return the value returned by
 *      the next function (if there is one, provided in the options object)
 *      when the end-of-stream (EOS) is reached, denoted by a EOS object:
 *      {last: true}. See CROWDLOGGER.log.operations.accumulator.queries
 *      as an example.
 */
CROWDLOGGER.log.operations.accumulator = {};


/**
 * A generic iterator. Iterates over the log, one line at a time. Converts
 * each entry to an object, and passes it to the accumulator. Finally, once 
 * the log has been iterated over, returns the whatever the accumulator 
 * returns on an end-of-stream (EOS) object (i.e., {last: true}).
 *
 * @param {function} accumulator A function that takes an entry object as
 *      a parameter and returns something when given an EOS object. This
 *      return value doesn't actually have to be anything, but it's what this
 *      function will end up returning. Note that this can be a chain of
 *      filters followed eventually by an accumulator.
 * @param {function} on_complete The function to call when the accumulation
 *      is finished. Should expect as a parameter whatever is returned by the 
 *      specified accumulator.
 * @param {array} entries An array of entiry objects, or undefined to read the 
 *      activity log in automatically.
 *
 * @return Whatever is returned by the accumulator function on an EOS object.
 */
CROWDLOGGER.log.operations.accumulate_over = function( accumulator, 
            on_complete, entries ){

    // Iterates over the log, converts each entry to an object, and passes it
    // to the accumulator. Finally, once the log has been iterated over,
    // returns the whatever the accumulator returns on a 'last' object
    // (a 'last' object is the following: {last: true}).
    var iterate = function( entries, next ){
        var i;
        for( i in entries ){
            accumulator( entries[i] );
        }

        setTimeout(next, 2);
    };    

    if( entries === undefined ){
        //CROWDLOGGER.io.log.read_activity_log( iterate );
        CROWDLOGGER.io.log.read_activity_log({
            on_chunk: iterate, 
            chunk_size:1000,
            on_success: function(){ on_complete( accumulator( {last: true} ) );}
        });
    } else {
        iterate( entries );
    }
};

/**
 * A helper function that adds to the options object any values not 
 * specified but present in defaults.
 *
 * @param {object} options  A list of options.
 * @param {object} defaults A list of default options.
 * @return{object}  A pointer to options, with the defaults added in.
 */
CROWDLOGGER.log.operations.set_options = function( options, defaults ){
    if( options === undefined ) {
        options = defaults;
    } else {
        for( x in defaults ){
            if( options[x] === undefined ){
                options[x] = defaults[x];
            }
        }
    }
    return options;
};

/**
 * Removes queries that occur too close to each other.
 *
 * @param {object} options  Two fields can be specified:
 *      apply: the next function to call, which should take an
 *                   entry.
 *      time_diff:   The minimum time difference in milliseconds between two
 *                   valid queries.
 * @return On end-of-stream (EOS), returns either the last query seen or
 *      the result of options.apply, if a function was supplied.
 */ 
CROWDLOGGER.log.operations.filter.instant_queries = function( options ) {
    var defaults = {
        apply: function(x){ return x; },
        time_diff: 2000
    };    
    var last_query = undefined;
    
    options = CROWDLOGGER.log.operations.set_options(options, defaults);

    return function( entry ){
        if( last_query !== undefined && ( entry.last || entry.skip ||
                (CROWDLOGGER.logging.is_search(entry) && 
                Math.abs(entry.t-last_query.t) >= options.time_diff ))){
            options.apply( last_query );    
        }

        if( CROWDLOGGER.logging.is_search(entry) ){
            last_query = entry;
        }

        // The last entry.
        if( entry.last ){
            return options.apply( entry );  
        } else if( entry.skip ) {
            last_query = undefined;
            options.apply( entry );
        }

        return;
    };
};

/**
 * Groups actions into sessions, then passes on each session to the next
 * function. It knows where sessions are based on receiving skip objects.
 *
 * @param {object} options  Two fields can be specified:
 *      apply:     the next function to call, which should take an
 *                       entry.
 * @return On end-of-stream (EOS), returns either the last session seen or
 *      the result of options.apply, if a function was supplied.
 */
CROWDLOGGER.log.operations.filter.session_items = function( options ) {
    var defaults = {
        apply: function(x){ return x; },
    };
    var session = undefined;

    options = CROWDLOGGER.log.operations.set_options(options, defaults);

    return function( entry ){
        if( session === undefined ){
            session = [];
        } else if ( entry.last || entry.skip ) {
            options.apply( {value: session} );
            session = [];
        } 
        session.push( entry );

        // The last entry.
        if( entry.last ){
            return options.apply( entry );
        } else if( entry.skip ) {
            session = [];
        }

        return;
    };
};

/**
 * Passes on all entries and adds skip entries when a new session is detected
 * (based on the session_cutoff spcified in the options parameter).
 *
 * @param {object} options  Two fields can be specified:
 *      apply:     the next function to call, which should take an
 *                       entry.
 *      session_cuttoff: the maximium time difference in milliseconds between
 *                       two actions that can be considered part of the same 
 *                       session.
 * @return On end-of-stream (EOS), returns either the last session seen or
 *      the result of options.apply, if a function was supplied.
 */
CROWDLOGGER.log.operations.filter.session_boundaries = function( options ) {
    var defaults = {
        apply: function(x){ return x; },
        session_cutoff: 26*60*1000 // 26 minutes, as per Lucchese et al.
    };
    var prev_time = -1;

    options = CROWDLOGGER.log.operations.set_options(options, defaults);

    return function( entry ){
        if ( prev_time !== -1 && !entry.last &&
                Math.abs(entry.t-prev_time) > options.session_cutoff ) {
            options.apply( {skip: true} );
        } 
        prev_time = entry.t;
        options.apply( entry );

        // The last entry.
        if( entry.last ){
            return options.apply( entry );
        } else if( entry.skip ) {
            prev_time = -1;
            options.apply( entry );
        }

        return;
    };
};


/**
 * Passes on only the search entries. 
 *
 * @param {object} options  One field can be specified:
 *      apply:     the next function to call, which should take an
 *                       entry.
 * @return On end-of-stream (EOS), returns either the last session seen or
 *      the result of options.apply, if a function was supplied.
 */
CROWDLOGGER.log.operations.filter.searches = function( options ) {
    var defaults = {
        apply: function(x){ return x; },
    };

    options = CROWDLOGGER.log.operations.set_options(options, defaults);

    return function( entry ){
        if( CROWDLOGGER.logging.is_search(entry) ){
            options.apply( entry );
        }

        // The last entry.
        if( entry.last ){
            return options.apply( entry );
        } else if( entry.skip ) {
            options.apply( entry );
        }

        return;
    };
};


/**
 * Applies a function to incoming queries. 
 *
 * @param {object} options  Two fields can be specified:
 *      apply: the next function to call, which should take an
 *                   entry.
 *      cleaner:     a function that cleans a query.
 * @return On end-of-stream (EOS), returns either the last query seen or
 *      the result of options.apply, if a function was supplied.
 */
CROWDLOGGER.log.operations.filter.clean_queries = function( options ) {
    var defaults = {
        apply: function(x){ return x; },
        cleaner: function(q){ return q.toLowerCase().replace(/\s+/, " "); }
    };

    options = CROWDLOGGER.log.operations.set_options(options, defaults);

    return function( entry ){
        if( CROWDLOGGER.logging.is_search(entry) || 
            (CROWDLOGGER.logging.is_click(entry) && entry.sr) ) { 
            entry.q = options.cleaner( entry.q );
        }

        if( !entry.last ) {
            options.apply( entry );
        }

        // The last entry.
        if( entry.last ){
            return options.apply( entry );
        }
        return;
    };
};

/**
 * Cleans a query and then alphabetically orders the terms. For use with
 * the CROWDLOGGER.log.operations.filter.clean_queries function.
 *
 * @param {string} query The query to term-order normalize.
 * @return The query, term-order normalized.
 */
CROWDLOGGER.log.operations.term_order_normalize = function( query ){
    return query.toLowerCase().replace( /\s+/, " " ).
        split( /\s/ ).sort().join(" ");
};


/**
 * Filters queries; emits items: { value: [query] }
 *
 * @param {object} options Options that can contain the following field:
 *      apply:  the function to apply to each item. 
 * @return {function} A pointer to the accumulator function, which takes a
 *      log entry as its only parameter and passes on items; if
 *      no next function is given, returns the last item seen on EOS.
 */
CROWDLOGGER.log.operations.filter.query_items = function( options ){
    var defaults = {
        apply: function(x){ return x; }
    };
    options = CROWDLOGGER.log.operations.set_options(options, defaults);

    return function( entry ){
        if( CROWDLOGGER.logging.is_search(entry) ){
            options.apply( {value: [entry.q]} );
        }

        if( entry.last ){
            return options.apply( entry );
        } else if( entry.skip ) {
            options.apply( entry );
        }

    };
};



/**
 * Filters query rewrite pairs; emits items: { value: [query1, query2] }
 *
 * @param {object} options Options that can contain the following field:
 *      apply:  the function to apply to each item. 
 * @return {function} A pointer to the accumulator function, which takes a
 *      log entry as its only parameter and passes on items; if
 *      no next function is given, returns the last item seen on EOS.
 */
CROWDLOGGER.log.operations.filter.query_pair_items = function( options ){
    var defaults = {
        apply: function(x){ return x; }
    };
    var last_query = undefined;

    options = CROWDLOGGER.log.operations.set_options(options, defaults);

    return function( entry ){
        if( CROWDLOGGER.logging.is_search(entry) ){
            if( last_query !== undefined ) {
                options.apply( {value: [last_query, entry.q]} );
            }
            last_query = entry.q;
        }

        if( entry.last ){
            return options.apply( entry );
        } else if( entry.skip ) {
            last_query = undefined;
            options.apply( entry );
        }

    };
};


/**
 * Filters query-click pairs; emits items: { value: [query, url] }
 * Only clicks on SERP results are emitted.
 *
 * @param {object} options Options that can contain the following field:
 *      apply:  the function to apply to each item. 
 * @return {function} A pointer to the accumulator function, which takes a
 *      log entry as its only parameter and passes on items; if
 *      no next function is given, returns the last item seen on EOS.
 */
CROWDLOGGER.log.operations.filter.query_click_pair_items = function( options ){
    var defaults = {
        apply: function(x){ return x; }
    };
    options = CROWDLOGGER.log.operations.set_options(options, defaults);

    return function( entry ){
        if( CROWDLOGGER.logging.is_click(entry) && entry.sr ){
            options.apply( {value: [entry.q, entry.turl]} );
        }

        if( entry.last ){
            return options.apply( entry ); 
        } else if( entry.skip ) {
            options.apply( entry );
        }

    };
};


/**
 * Filters query-visit pairs; emits items: { value: [query, url] }
 * So what is a query-visit pair? It's like a query-click, but it's not 
 * restricted to only clicks on a SERP, but to any click after a query.
 *
 * @param {object} options Options that can contain the following field:
 *      apply:  the function to apply to each item.
 * @return {function} A pointer to the accumulator function, which takes a
 *      log entry as its only parameter and passes on items; if
 *      no next function is given, returns the last item seen on EOS.
 */
CROWDLOGGER.log.operations.filter.query_visit_pair_items = function( options ){
    var defaults = {
        apply: function(x){ return x; }
    };
    var query = undefined;
    options = CROWDLOGGER.log.operations.set_options(options, defaults);


    return function( entry ){
        if( CROWDLOGGER.logging.is_click(entry) ){
            if( entry.sr ){
                query = entry.q;
            }

            if( query !== undefined ){
                options.apply( {value: [query, entry.turl]} );
            }
        }
 
        if( entry.last ){
            return options.apply( entry );
        } else if( entry.skip ) {
            query = undefined;
            options.apply( entry );
        } 
   };
};

// Make only a couple accumulators: sequence and histogram.
// Make the rest filters: filter queries, query pairs, etc.

/**
 * An accumulator to gather and count distinct items. Upon 
 * receiving an end-of-stream (EOS) object, returns a list of distinct items 
 * and their frequencies. Items should come in as an array. The output will
 * look like:
 * {
 *  item.key: [ item.value, count ],
 *  ...
 * }
 * 
 * Each item should be an object with the following fields:
 * {
 *    value: {something},
 *    last:  true // only for EOS objects
 * }
 *
 * @param {object} options Options: can specify the key generation method:
 *  {
 *      gen_key: function
 *  }
 *  (the default is to assume the item value has a 'join' method and invoke
 *   that using <tab> as a separator).
 * @return {function} A pointer to the accumulator function, which takes a
 *      an object as its only parameter and returns an associative array as
 *      described above on EOS. 
 */
CROWDLOGGER.log.operations.accumulator.histogram = function( options ){

    var defaults = {
        gen_key: function(item){ return JSON.stringify(item); },
        gen_entry: function(item){ return 0; },
        increment_entry_count: function(value){ return value + 1; }
    };

    var items = {};
    options = CROWDLOGGER.log.operations.set_options(options, defaults);

    return function( item ){
        if( item.last ){
            return items;
        } else if( !item.skip ){
            var key = options.gen_key( item );

            if( items[key] === undefined ){
                items[key] = options.gen_entry(item);
            }
            items[key] = options.increment_entry_count(items[key]); 
        }
    };
};

/**
 * Default options for generating an artifact histogram. Note that this is
 * really for generating artifacts for experiments, so the gen_key looks
 * a little funky.
 */
CROWDLOGGER.log.operations.artifact_histogram_options = {
    // Identifies this uniquely by the primary and secondary data joined.
    gen_key:    function(item){ return [
        item.value.primary_data, item.value.secondary_data].join("\t"); },
    // Copies the artifact to a new object and adds a 'count' field.
    gen_entry:  function(item){ return {
        primary_data: item.value.primary_data, 
        secondary_data: item.value.secondary_data,
        count:  0 }; },
    // Increments the count by 1.
    increment_entry_count: function( value ){ 
        value.count++; return value; 
    }
};

/**
 * Converts a stream of items into artifacts based on the supplied
 * primary and secondary field generation functions.
 *
 * @param {object} options Options that can contain the following field:
 *      apply:  the function to apply to each item.
 *      gen_primary: a function that generates a primary field from the item.
 *      gen_secondary: function that generates a secondary field from the item.
 * @return {function} A pointer to the accumulator function, which takes an
 *      item as its only parameter and passes on artifacts; if
 *      no next function is given, returns the last item seen on EOS.
 */
CROWDLOGGER.log.operations.filter.to_artifact = function( options ){

    var defaults = {
        apply:         function(x){ return x; },
        gen_primary:   function(x){ return x; },
        gen_secondary: function(x){ return x; }
    };

    options = CROWDLOGGER.log.operations.set_options(options, defaults);

    return function( item ){
        if( item.last ){
            return options.apply(item);
        } else if( item.skip ){
            options.apply(item);
        } else {
            options.apply( {
                value: {
                    primary_data: options.gen_primary( item ),
                    secondary_data: options.gen_secondary( item )
                }
            } )
        }
    };
};



/**
 * An accumulator to gather items. Upon receiving an end-of-stream (EOS) 
 * object, returns a list of distinct items and their frequencies. Items 
 * should come in as an array. The output will look like:
 * [ item1.value, item2.value, item3.value, ... ]
 * 
 * Each item should be an object with the following fields:
 * {
 *    value: {something},
 *    last:  true // only for EOS objects
 * }
 *
 * @param {object} options Options (nothing is used currently).
 * @return {function} A pointer to the accumulator function, which takes a
 *      an object as its only parameter and returns an array as
 *      described above on EOS. 
 */
CROWDLOGGER.log.operations.accumulator.list = function( options ){
    var items = [];

    var defaults = {
        unwrap_item: function(item){ return item; }
    };

    options = CROWDLOGGER.log.operations.set_options(options, defaults);

    return function( item ){
        if( item.last ){
            return items;
        } else if( !item.skip ) {
            items.push( options.unwrap_item(item) );
        }
    };
};

}
