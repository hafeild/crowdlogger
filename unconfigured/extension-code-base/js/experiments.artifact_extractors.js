/**
 * @fileOverview Provides several extractors to process a search log.<p>
 * 
 * See the  CROWDLOGGER.experiments.artifact_extractors namespace.<p>
 *
 * %%LICENSE%% 
 * 
 * @author hfeild
 * @version %%VERSION%%
 */


if( !CROWDLOGGER.experiments ){
    CROWDLOGGER.experiments = {}
};

if( !CROWDLOGGER.experiments.artifact_extractors ){


/** 
 * @namespace Provides several extractors to process a search log. 
 */
CROWDLOGGER.experiments.artifact_extractors = {};

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
                {apply: CROWDLOGGER.log.operations.filter.to_artifact({
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
