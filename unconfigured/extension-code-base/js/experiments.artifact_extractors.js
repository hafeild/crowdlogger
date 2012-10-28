/**
 * @fileOverview Provides several extractors to process a search log.<p>
 * 
 * See the  CROWDLOGGER.experiments.artifact_extractors namespace.<p>
 *
 * %%VERSION%% 
 * 
 * @author hfeild
 * @version %%VERSION%%
 */



if( CROWDLOGGER.experiments.artifact_extractors === undefined ){


/** 
 * @namespace Provides several extractors to process a search log. 
 */
CROWDLOGGER.experiments.artifact_extractors = {};

/**
 * Extracts queries from the search log.
 *
 * @param {string} log_data The log data.
 * @param {function} on_complete The function to call on completion. It should
 *      take as a parameter an array of object, where each has three fields:
 *      primary_data,  secondary_data, and count.
 */
/*
CROWDLOGGER.experiments.artifact_extractors.extract_query_histogram = function( 
            log_data, on_complete ){
    //B_DEBUG
    CROWDLOGGER.debug.log( "In CROWDLOGGER.experiments.artifact_extractors.extract_query_histogram\n" );
    //E_DEBUG

    var histogram = {};

    // Add a dummy query; this helps us determine how many distinct users
    // participated in the experiment.
    histogram['DUMMY'] = {
        primary_data:   'DUMMY',
        secondary_data: 'DUMMY',
        count:          1
    };

    // Go through the log, looking for Search events.
    var lines = log_data.split( /\n/ );
    for( var i = 0; i < lines.length; i++ ){
        // The log entries should be tab-delimited.
        var line_parts = lines[i].split( /\t/ );

        // Is this a search?
        if( line_parts[0] === "Search" ){
            var query_raw = line_parts[2];
            // Normalize the query. I.e.:
            //   1) case conflate
            //   2) space conflate
            var query_normalized = 
                line_parts[2].toLowerCase().replace( /\s+/, " " );

            var key = query_raw + "\t" + query_normalized;

            // Add to the histogram -- create a new entry if needed.
            if( histogram[key] === undefined ){
                
                histogram[key] = {
                    primary_data:   query_normalized,
                    secondary_data: query_raw,
                    count:          0
                };
                //B_DEBUG
                //CROWDLOGGER.debug.log( "Creating a new histogram entry: " +
                //    JSON.stringify( histogram[key] ) + "\n");
                //E_DEBUG
            }
            histogram[key].count++;
        }
    }

    // Convert the histogram to an array.
    var artifacts = [], i = 0;
    for( var artifact_key in histogram ){
        artifacts[i] = histogram[artifact_key];
        i++;
    }

    // Invoke the on_complete callback.
    on_complete( artifacts );
};
*/

/**
 * Extracts query pairs from the search log.
 *
 * @param {string} log_data The log data.
 * @param {function} on_complete The function to call on completion. It should
 *      take as a parameter an array of object, where each has three fields:
 *      primary_data,  secondary_data, and count.
 */
/*
CROWDLOGGER.experiments.artifact_extractors.extract_query_pairs = function( 
            log_data, on_complete ){
    //B_DEBUG
    CROWDLOGGER.debug.log( "In CROWDLOGGER.experiments.artifact_extractors." +
        "extract_query_pairs\n" );
    //E_DEBUG

    var histogram = {};

    var previous_query_raw = "";
    var previous_query_normalized = "";

    var lines = log_data.split( /\n/ );

    // Add a dummy query; this helps us determine how many distinct users
    // participated in the experiment.
    histogram['DUMMY'] = {
        primary_data:   'DUMMY',
        secondary_data: 'DUMMY',
        count:          1
    };

    // Go through the log, looking for Search events.
    for( var i = 0; i < lines.length; i++ ){
        // The log entries should be tab-delimited.
        var line_parts = lines[i].split( /\t/ );

        // Is this a search?
        if( line_parts[0] === "Search" ){
            var query_raw = line_parts[2];
            // Normalize the query. I.e.:
            //   1) case conflate
            //   2) space conflate
            var query_normalized = 
                line_parts[2].toLowerCase().replace( /\s+/, " " );

            // If the previous query is empty, then don't emit a pair.
            if( previous_query_raw !== "" ){

                var key = [previous_query_raw, query_raw, 
                    previous_query_normalized, query_normalized].join( "\t" );
    
                // Add to the histogram -- create a new entry if needed.
                if( histogram[key] === undefined ){
                    
                    histogram[key] = {
                        primary_data:   [previous_query_normalized, 
                                        query_normalized].join( "\t" ),
                        secondary_data: [previous_query_raw, query_raw].
                                            join("\t"),
                        count:          0
                    };
                    //B_DEBUG
                    //CROWDLOGGER.debug.log( "Creating a new histogram entry: " +
                    //    JSON.stringify( histogram[key] ) + "\n");
                    //E_DEBUG
                }
                histogram[key].count++;
            }

            // The current query now becomes the previous query.
            previous_query_raw = query_raw;
            previous_query_normalized = query_normalized;
        }
    }

    // Convert the histogram to an array.
    var artifacts = [], i = 0;
    for( var artifact_key in histogram ){
        artifacts[i] = histogram[artifact_key];
        i++;
    }

    // Invoke the on_complete callback.
    on_complete( artifacts );
};
*/

/**
 * Extracts query-URL pairs from the search log.
 *
 * @param {string} log_data The log data.
 * @param {function} on_complete The function to call on completion. It should
 *      take as a parameter an array of object, where each has three fields:
 *      primary_data,  secondary_data, and count.
 */
/*
CROWDLOGGER.experiments.artifact_extractors.extract_query_url_pairs = function( 
            log_data, on_complete ){
    var CLICKED_URL = 2;
    var IS_SEARCH_RESULT = 4;
    var QUERY = 5;

    //B_DEBUG
    CROWDLOGGER.debug.log( "In CROWDLOGGER.experiments.artifact_extractors." +
        "extract_query_url_pairs\n" );
    //E_DEBUG

    var histogram = {};

    var lines = log_data.split( /\n/ );


    // Add a dummy query; this helps us determine how many distinct users
    // participated in the experiment.
    histogram['DUMMY'] = {
        primary_data:   'DUMMY',
        secondary_data: 'DUMMY',
        count:          1
    };

    // Go through the log, looking for Click events.
    for( var i = 0; i < lines.length; i++ ){
        // The log entries should be tab-delimited.
        var line_parts = lines[i].split( /\t/ );

        // Is this a search?
        if( line_parts[0] === "Click" && line_parts[IS_SEARCH_RESULT]==="true"){

            var url = line_parts[CLICKED_URL];

            var query_raw = line_parts[QUERY];
            // Normalize the query. I.e.:
            //   1) case conflate
            //   2) space conflate
            var query_normalized = 
                line_parts[QUERY].toLowerCase().replace( /\s+/, " " );

            var key = [query_raw, url].join( "\t" );

            // Add to the histogram -- create a new entry if needed.
            if( histogram[key] === undefined ){
                
                histogram[key] = {
                    primary_data:   [query_normalized, url].join( "\t" ),
                    secondary_data: [query_raw].join("\t"),
                    count:          0
                };
                //B_DEBUG
                //CROWDLOGGER.debug.log( "Creating a new histogram entry: " +
                //    JSON.stringify( histogram[key] ) + "\n");
                //E_DEBUG
            }

            histogram[key].count++;
        }
    }

    // Convert the histogram to an array.
    var artifacts = [], i = 0;
    for( var artifact_key in histogram ){
        artifacts[i] = histogram[artifact_key];
        i++;
    }

    // Invoke the on_complete callback.
    on_complete( artifacts );
};
*/


/**
 * Handles a histogram of artifacts:
 *    - adds in a dummy entry
 *    - converts the histogram to an array
 *    - invokes the on_complete function on the resulting array
 *
 * @param {object} histogram An associative array of keys -> artifacts.
 * @param {function} on_complete A function to pass the array of artifacts to.
 */
CROWDLOGGER.experiments.artifact_extractors.process_artifact_histogram =
        function( histogram, on_complete ){
    var histogram, artifacts = [], i = 0;

    histogram = CROWDLOGGER.experiments.artifact_extractors.add_dummy_artifact(
        histogram );

    // Convert the histogram to an array.
    for( var artifact_key in histogram ){
        artifacts[i] = histogram[artifact_key];
        i++;
    }
    on_complete( artifacts );        
}

/**
 * Adds a dummy entry to the given histogram.
 *
 * @param {object} hist The histogram to which the dummy entry should be
 *      added.
 */
CROWDLOGGER.experiments.artifact_extractors.add_dummy_artifact = function(hist){
    hist['__DUMMY__'] = {
        primary_data:   '__DUMMY__',
        secondary_data: '__DUMMY__',
        count:          1
    };
    return hist;
}


/**
 * Extracts query-URL pairs from the search log.
 *
 * @param {function} on_complete The function to call on completion. It should
 *      take as a parameter an array of object, where each has three fields:
 *      primary_data,  secondary_data, and count.
 */
CROWDLOGGER.experiments.artifact_extractors.extract_query_url_pairs =
        function( on_complete ){

    CROWDLOGGER.log.operations.accumulate_over( 
       CROWDLOGGER.log.operations.filter.session_boundaries(
              {apply: CROWDLOGGER.log.operations.filter.query_click_pair_items( 
                  {apply: CROWDLOGGER.log.operations.filter.to_artifact(
                      {
                          apply: CROWDLOGGER.log.operations.accumulator.
                            histogram( CROWDLOGGER.log.operations.
                                artifact_histogram_options
                            ),
                          gen_primary: function(item){ 
                            return [
                                CROWDLOGGER.log.operations.
                                    term_order_normalize( item.value[0] ), 
                                item.value[1]].join("\t") },
                          gen_secondary: function(item){
                            return item.value.join("\t") }
                      })
                  })
          }), 
       function(histogram){
            CROWDLOGGER.experiments.artifact_extractors.
                process_artifact_histogram( histogram, on_complete );
       }  
    );

};

/**
 * Extracts query-vist pairs from the search log. These differ from query-URL
 * pairs in that query-visit pairs are not limited to only clicks on results
 * found on the query's SERP. 
 *
 * @param {function} on_complete The function to call on completion. It should
 *      take as a parameter an array of object, where each has three fields:
 *      primary_data,  secondary_data, and count.
 */
CROWDLOGGER.experiments.artifact_extractors.extract_query_visit_pairs =
        function( on_complete ){

    CROWDLOGGER.log.operations.accumulate_over( 
       CROWDLOGGER.log.operations.filter.session_boundaries(
              {apply: CROWDLOGGER.log.operations.filter.query_visit_pair_items( 
                  {apply: CROWDLOGGER.log.operations.filter.to_artifact(
                      {
                          apply: CROWDLOGGER.log.operations.accumulator.
                            histogram( CROWDLOGGER.log.operations.
                                artifact_histogram_options
                            ),
                          gen_primary: function(item){ 
                            return [
                                CROWDLOGGER.log.operations.
                                    term_order_normalize( item.value[0] ), 
                                item.value[1]].join("\t") },
                          gen_secondary: function(item){
                            return item.value.join("\t") }
                      })
                  })
          }), 
       function(histogram){
            CROWDLOGGER.experiments.artifact_extractors.
                process_artifact_histogram( histogram, on_complete );
       }  
    );

};


/**
 * Extracts query pairs from the search log.
 *
 * @param {function} on_complete The function to call on completion. It should
 *      take as a parameter an array of object, where each has three fields:
 *      primary_data,  secondary_data, and count.
 */
CROWDLOGGER.experiments.artifact_extractors.extract_query_pairs =
        function( on_complete ){

    CROWDLOGGER.log.operations.accumulate_over( 
       CROWDLOGGER.log.operations.filter.session_boundaries(
              {apply: CROWDLOGGER.log.operations.filter.query_pair_items( 
                  {apply: CROWDLOGGER.log.operations.filter.to_artifact(
                      {
                          apply: CROWDLOGGER.log.operations.accumulator.
                            histogram( CROWDLOGGER.log.operations.
                                artifact_histogram_options
                            ),
                          gen_primary: function(item){ 
                            return [
                                CROWDLOGGER.log.operations.
                                    term_order_normalize( item.value[0] ), 
                                CROWDLOGGER.log.operations.
                                    term_order_normalize( item.value[1] )
                                ].join("\t" ) }, 
                          gen_secondary: function(item){
                            return item.value.join("\t") }
                      })
                  })
          }), 
       function(histogram){
            CROWDLOGGER.experiments.artifact_extractors.
                process_artifact_histogram( histogram, on_complete );
       }  
    );

};


/**
 * Extracts queries from the search log.
 *
 * @param {function} on_complete The function to call on completion. It should
 *      take as a parameter an array of object, where each has three fields:
 *      primary_data,  secondary_data, and count.
 */
CROWDLOGGER.experiments.artifact_extractors.extract_queries =
        function( on_complete ){

    CROWDLOGGER.log.operations.accumulate_over( 
       CROWDLOGGER.log.operations.filter.session_boundaries(
              {apply: CROWDLOGGER.log.operations.filter.query_items( 
                  {apply: CROWDLOGGER.log.operations.filter.to_artifact(
                      {
                          apply: CROWDLOGGER.log.operations.accumulator.
                            histogram( CROWDLOGGER.log.operations.
                                artifact_histogram_options
                            ),
                          gen_primary: function(item){ 
                            return CROWDLOGGER.log.operations.
                               term_order_normalize( item.value[0] ) },
                          gen_secondary: function(item){
                            return item.value[0] }
                      })
                  })
          }), 
       function(histogram){
            CROWDLOGGER.experiments.artifact_extractors.
                process_artifact_histogram( histogram, on_complete );
       }  
    );

};


/**
 * Extracts queries from the search log, only uses simple query normalization.
 *
 * @param {function} on_complete The function to call on completion. It should
 *      take as a parameter an array of object, where each has three fields:
 *      primary_data,  secondary_data, and count.
 */
CROWDLOGGER.experiments.artifact_extractors.extract_queries_simple_norm =
        function( on_complete ){

    CROWDLOGGER.log.operations.accumulate_over( 
       CROWDLOGGER.log.operations.filter.session_boundaries(
              {apply: CROWDLOGGER.log.operations.filter.query_items( 
                  {apply: CROWDLOGGER.log.operations.filter.to_artifact(
                      {
                          apply: CROWDLOGGER.log.operations.accumulator.
                            histogram( CROWDLOGGER.log.operations.
                                artifact_histogram_options
                            ),
                          gen_primary: function(item){ 
                            return item.value[0].toLowerCase().
                                replace(/\s+/, " "); },
                          gen_secondary: function(item){
                            return item.value[0] }
                      })
                  })
              }), 
       function(histogram){
            CROWDLOGGER.experiments.artifact_extractors.
                process_artifact_histogram( histogram, on_complete );
       }  
    );

};


/**
 * The extractors.
 */
CROWDLOGGER.experiments.artifact_extractors.extractors = {
    query_pair: 
        CROWDLOGGER.experiments.artifact_extractors.extract_query_pairs,
    query:
        CROWDLOGGER.experiments.artifact_extractors.extract_queries,
    query_simple_norm:
        CROWDLOGGER.experiments.artifact_extractors.extract_queries_simple_norm,
    query_url:
        CROWDLOGGER.experiments.artifact_extractors.extract_query_url_pairs,
    query_visit:
        CROWDLOGGER.experiments.artifact_extractors.extract_query_visit_pairs
}



/**
 * Runs the given extractor on the user's search log and calls on_complete when 
 * finished.
 *
 * @param {string} name The name of the extractor. Possibilities are:
 *      <ul>
 *          <li>query</li>
 *          <li>query pair</li>
 *          <li>query url pair</li>
 *      </ul>
 * @param {function} on_complete A function to be called once the data has been
 *      extracted and converted into primary and secondary data. This function
 *      should take an array of objects, where each on has the fields  
 *      primary_data, secondary_data, and count.
 *
 * @return <tt>true</tt> if the given name is valid and the extractor was called,
 *      <tt>false</tt> otherwise.
 */
CROWDLOGGER.experiments.artifact_extractors.run_extractor = function( name, 
            on_complete ){

    var is_running = false;


    if( CROWDLOGGER.experiments.artifact_extractors.extractors[name] !==
            undefined ){ 
        CROWDLOGGER.experiments.artifact_extractors.extractors[name]( 
            on_complete );
        is_running = true;
    }

    return is_running;
};

} // END CROWDLOGGER.experiments.artifact_extractors NAMESPACE
