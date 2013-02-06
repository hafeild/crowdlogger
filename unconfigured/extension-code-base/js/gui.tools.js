/**
 * @fileOverview Provides functionality to display data taken from a user's
 * activity log. 
 * 
 * See the  CROWDLOGGER.gui.tools namespace.<p>
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */


if( CROWDLOGGER.gui.tools === undefined ){

/**
 * @namespace Provides functionality to display data taken from a user's
 * activity log
 */
CROWDLOGGER.gui.tools = {};


/**
 * Launches a new tab with the search_histogram.html file. This file is
 * then populated with the user's searches along with their counts.
 *
 * @param {object} doc [Optional.] If included, the given doc will be
 *      updated, rather than launching a whole new page.
 */
CROWDLOGGER.gui.tools.diplay_search_histogram = function( doc ){

    // TODO This function needs to be re-written to use log.operations.

    // The page to load.
    var registration_page = CROWDLOGGER.preferences.get_char_pref( 
        "search_histogram_dialog_url", "not_found.html" );

    // The prefix for the extension's html files.
    var extension_prefix = CROWDLOGGER.version.info.get_extension_html_prefix();

    // The full url.
    var url = extension_prefix + registration_page;


    // Takes a dump of the log and converts it to an object that contains
    // pairs of (normalized) searches and frequencies.
    // var log_to_query_counts = function( log_entries, make_array ){
    //     var histogram = {};
    //     var threshold = 2000; // 2 seconds.

    //     // So we can track the time between queries. We're only going to
    //     // emit a query if it is the last in a line of rapidly submitted
    //     // queries (this line is allowed to consist of only one element
    //     var previous_time = 0;
    //     var previous_query = "";

    //     // Adds the query to the histogram, provided it's not an empty 
    //     // query, i.e., "".
    //     var addQuery = function( query ){
    //         if( query === "" ){ return; }
            
    //         // Add to the histogram.
    //         if( histogram[query] === undefined ){
    //             histogram[query] = 0;
    //         }
    //         histogram[query]++;
    //     };

    //     // Go through the log, looking for Search events.
    //     for( var i = 0; i < log_entries.length; i++ ){
    //         // The log entries should be tab-delimited.
    //         //var line_parts = lines[i].split( /\t/ );

    //         // Is this a search?
    //         if( line_parts[0] === "Search" ){
    //             // Normalize the query. I.e.:
    //             //   1) case conflate
    //             //   2) space conflate
    //             var query = line_parts[2].toLowerCase().replace( /\s+/, " " );
    //             var time  = parseInt( line_parts[1] );

    //             if( (time - previous_time) > threshold ) {
    //                 // Add to the histogram.
    //                 addQuery( previous_query );
    //             }

    //             previous_time  = time;
    //             previous_query = query;
    //         }
    //     }
    //     // Don't forget about the last query! (Don't worry, this checks if
    //     // no queries were processed at all...or at least if this query is
    //     // blank).
    //     addQuery( previous_query );

    //     if( make_array ){
    //         var hist_array = [];
    //         for( var query in histogram ){
    //             hist_array.push( [query, histogram[query]] );
    //         }
    //         return hist_array;
    //     } else {
    //         return histogram;
    //     }
    // };

    // The function to call when the page loads.
    /** @ignore */
    var search_history_handler = function( doc ){
            // This points to the container on the web page where we will
            // place the histogram.
            var contents_element = doc.getElementById("contents");

            // Clear the table.
            contents_element.innerHTML = "";

            // This will be called when the file is finished being read.
            var process_histogram = function( histogram ){

                var query_counts = [], query;
                for( query in histogram ){
                    query_counts.push( [query, histogram[query]] );
                }

                // // Get the search histogram for the log.
                // var query_counts = log_to_query_counts( file_contents, true );

                // Sort by query frequency, non-ascending. 
                query_counts.sort( function(a,b){ return b[1]-a[1]; } );


                // The header.
                var html = "";

                // Now iterate through the array of searches and make a new
                // row for each.
                for( var i = 0; i < query_counts.length; i++ ){
                    html += "<tr><td>" + query_counts[i][0] + "</td>" +
                                "<td>" + query_counts[i][1] + "</td></tr>\n"; 
                }

                // Place the html.
                contents_element.innerHTML = html;
            };
            
            // Read the activity file in and then call the function above.
            // CROWDLOGGER.io.log.read_activity_log( {on_chunk: process_entries} );

            CROWDLOGGER.log.operations.accumulate_over(
                CROWDLOGGER.log.operations.filter.searches({
                    apply: CROWDLOGGER.log.operations.filter.clean_queries({
                        apply:CROWDLOGGER.log.operations.accumulator.histogram({
                            gen_key: function(v){ return v.q; },
                            gen_entry: function(v){ return 0; },
                            increment_entry_count: function(e){ return e+1; }
                        })
                    }),
                }),
                process_histogram
            );
            
    };

    if( doc === undefined ){
        // Open the window and call the handler when the page loads.
        CROWDLOGGER.gui.windows.open_dialog( url, "search history", 
            CROWDLOGGER.gui.tools.diplay_search_histogram );
    } else {
        if( doc.defaultView && doc.defaultView.jQuery ){
            doc.defaultView.jQuery('#init').html('initialized');
            search_history_handler( doc );
        }
    }
};




/**
 * Launches a new tab with the search_trails.html file. This file is
 * then populated with the user's searches and clicks.
 *
 * @param {object} doc [Optional.] If included, the given doc will be
 *      updated, rather than launching a whole new page.
 */
CROWDLOGGER.gui.tools.diplay_search_trails = function( doc ){

    // The page to load.
    var registration_page = CROWDLOGGER.preferences.get_char_pref( 
        "search_trails_dialog_url", "not_found.html" );

    // The prefix for the extension's html files.
    var extension_prefix = CROWDLOGGER.version.info.get_extension_html_prefix();

    // The full url.
    var url = extension_prefix + registration_page;

    function Search_Trail( day, month, year ) {
        this.day    = day   === undefined ? "" : day;
        this.month  = month === undefined ? "" : month;
        this.year   = year  === undefined ? "" : year;
        this.events = []; // Seach trail events.
        this.add_event = function( e ) {
            this.events.push( e );
        };
        this.to_key = function(){
            return this.month +" "+ this.day +", "+ this.year;
        }
    }

    function Search_Trail_Event( time, type, display, link, se ) {
        this.time = time;
        this.type = type;    // One of "seach", "serpClick", or "click".
        this.display = display; // What to show the user.
        this.link = link;    // A link to attach to the label.
        this.se = se;       // The search engine.
        this.to_s = function(){ 
            return [this.time, this.type, this.dipslay, this.link, 
                this.se].join( ", " ); 
        };
    };

    // Takes the contents of the log and converts it to an object that contains
    // pairs of (normalized) searches and frequencies.
    var log_to_search_trails_by_day = function( entries ){
        var search_trail_array = [];
        var cur_search_trail = new Search_Trail();

        var threshold = 2000; // 2 seconds.

        // Compares to search trails for equality (i.e., are they for the same
        // day?).
        var are_same_day = function( st1, st2 ) {
            return st1.day === st2.day && st1.month === st2.month && 
                st1.year == st2.year;
        }

        // Adds the given search trail event to the current trail (if they
        // occurred on the same day) or a new one.
        var add_trail_event = function( trail_event ){
            var the_date = new Date(trail_event.time);
            var st = new Search_Trail( the_date.getDate(),
                CROWDLOGGER.gui.study.pages.months_long[the_date.getMonth()],  
                the_date.getFullYear() );

            //B_DEBUG
            // CROWDLOGGER.debug.log( "Adding a trail event: [" + trail_event.to_s() + "]\n" );
            //E_DEBUG 

            if( !are_same_day( cur_search_trail, st ) ){
                cur_search_trail = st;
                search_trail_array.push( cur_search_trail );
            }

            cur_search_trail.add_event( trail_event );
        }

        var to_search_url = function( query, search_engine ){
            if( search_engine.match( /google/ ) !== null ){
                return  "http://www.google.com/search?q=" + encodeURI( query );
            } else if( search_engine.match( /yahoo/ ) !== null ) {
                return "http://search.yahoo.com/search?p=" + encodeURI( query );
            } else if( search_engine.match( /bing/ ) !== null ) {
                return "http://www.bing.com/search?q=" + encodeURI( query );
            }

        };


        // So we can track the time between queries. We're only going to
        // emit a query if it is the last in a line of rapidly submitted
        // queries (this line is allowed to consist of only one element
        var previous_search_event = new Search_Trail_Event( 0, "", "", "", "" );

        // Go through the log, looking for Search events.
        //var lines = log_data.split( /\n/ );
        var i;
        for( i = 0; i < entries.length; i++ ){
            var entry = entries[i];
            // The log entries should be tab-delimited.
            //var line_parts = lines[i].split( /\t/ );

            // Is this a search?
            if( entry.e === "search" ){
                var search_trail_event = new Search_Trail_Event( 
                    entry.t, "search",
                    to_search_url( entry.q, entry.se), entry.url, entry.se
                );
                //B_DEBUG
                // CROWDLOGGER.debug.log( "Just created a search trail event: " + search_trail_event.to_s() + "\n" );
                //E_DEBUG

                if( (search_trail_event.time - previous_search_event.time) > 
                        threshold && previous_search_event.time > 0 ) {
                    add_trail_event( previous_search_event );
                }

                previous_search_event = search_trail_event;

            // Is it a click?
            } else if( entry.e === "click" ){
                var time = entry.t;
                var url = entry.turl;
                var is_ser = entry.sr;
                var type = "click";
                if( is_ser ) {
                    type = "serpClick";
                }

                var click_event = new Search_Trail_Event( 
                    time, type, url, url, "" );

                if( previous_search_event.time > 0 ){
                    add_trail_event( previous_search_event );
                    previous_search_event = new Search_Trail_Event( 
                        0, "", "", "", "" );
                }
    
                add_trail_event( click_event );
                
            }
           
        }
        // Don't forget about the last query! 
        if(  previous_search_event.time > 0 ){
            add_trail_event( previous_search_event );
        }

        //B_DEBUG
        //CROWDLOGGER.debug.log( "Returning " + search_trail_array.length + 
        //    " day's worth of search trails!\n" );
        //E_DEBUG
        return search_trail_array;
    };

    // The function to call when the page loads.
    /** @ignore */
    var search_trail_handler = function( doc ){
        var jq = doc.defaultView.jQuery;

        // This points to the container on the web page where we will
        // place the search trail.
        var contents_element = jq('#contents');

        // Clear the contents.
        contents_element.html('');
       
        var se_shortener = function( se ) {
            if( se.match( /google/ ) !== null ) {
                return "Google";
            } else if( se.match( /bing/ ) !== null ) {
                return "Bing";
            } else if( se.match( /yahoo/ ) !== null ) {
                return "Y!";
            }
        } 

        // This will be called when the file is finished being read.
        var process_entries = function( entries, next ){

            console.log( "Entries: "+ entries );

            // Get the search histogram for the log.
            var search_trails = log_to_search_trails_by_day( entries );


            // The header.
            var html = jq('<table>');

            // Now iterate through the array of search trails in reverse order,
            // separating days with a ruler.
            for( var i = search_trails.length-1; i >= 0; i-- ){
                //B_DEBUG
                //CROWDLOGGER.debug.log( "Analyzing search trail " + i + "\n" );
                //E_DEBUG

                html.append('<tr><td colspan="2" class="date">'+
                    search_trails[i].to_key() +'</td></tr>'); // The date.

                for( var j = 0; j < search_trails[i].events.length; j++ ) {
                    var cur_event = search_trails[i].events[j];
                    var the_date = new Date(cur_event.time );
                    var row = jq('<tr>').appendTo(html);
                    row.append('<td class="time">' + 
                        CROWDLOGGER.util.date_to_time_of_day(the_date) +
                        '</td>');
                    var td = jq('<td class="'+ cur_event.type + '">').
                        appendTo(row);

                    if( cur_event.type === "serpClick" ) {
                        td.append('<span class="serpClick">&gt; </span>');
                    } else if( cur_event.type === "click" ) {
                        td.append('<span class="click">&gt;&gt; </span>');
                    }

                    if( cur_event.link !== "" ) {
                        var link = jq('<a href="">');
                        link.click((function(link_text){ 
                            return function(){
                                CROWDLOGGER.gui.windows.open_tab(link_text); 
                                return false;
                            }
                        })(cur_event.link));
                        link.html(' '+ cur_event.display.length > 50 ? 
                                cur_event.display.substring(0, 50)+'...' : 
                                cur_event.display );
                        link.attr('title', cur_event.link);
                        td.append(link);

                    } else {
                        td.append('<span> '+ 
                           (cur_event.display.length > 50 ? 
                                cur_event.display.substring(0, 50)+'...' : 
                                cur_event.display ) +'</span>');
                    }

                    if( cur_event.type=="search" ) {
                        td.append('<span class="searchEngine"> ('+
                            se_shortener(cur_event.se) + ')</span>');
                    }

                    //html +=  "</td></tr>\n"; 
                }
            }

            // Place the html.
            contents_element.append(html);

            // next();
        };
        
        // Read the activity file in and then call the function above.
        CROWDLOGGER.io.log.read_activity_log( {on_chunk: process_entries} );
            
    };

    if( doc === undefined ){
        // Open the window and call the handler when the page loads.
        CROWDLOGGER.gui.windows.open_dialog( url, "search trails", 
            CROWDLOGGER.gui.tools.diplay_search_trails );
    } else {
        if( doc.defaultView && doc.defaultView.jQuery ){
            doc.defaultView.jQuery('#init').html('initialized');
            search_trail_handler( doc );
        }
    }
};


/**
 * Does two things:
 * <ol>
 *      <li>Displays the contents of the log in the given document. This is
 *          kind of a pretty printing, but only in the sense that the page 
 *          has the same style as the other CrowdLogger pages.</li>
 *      <li>Either offers to save the log to file (uses blob urls) or, if
 *          blobs are not supported (i.e., FF3 & FF4), a url to the log on
 *          file is given.</li>
 * </ol>
 *
 * @param {object} The document on which to display the log. This should have
 *      at least two elements: log-area (where the log will be displayed) and
 *      save-log (a link that will either invoke the log to be saved or
 *      open the log file in a new window).
 */
CROWDLOGGER.gui.tools.export_log = function( doc ){
    // The page to load.
    var registration_page = CROWDLOGGER.preferences.get_char_pref(
        "export_dialog_url", "not_found.html" );
            
    // The prefix for the extension's html files.
    var extension_prefix = CROWDLOGGER.version.info.get_extension_html_prefix();
        
    // The full url.
    var url = extension_prefix + registration_page;  

    // Dumps the contents of the log to the given document.
    var dump_log = function( doc ) {
        var win = CROWDLOGGER.window;

        // Called when the activity log has been parsed.
        var process_entries = function( entries, next ){

            // Called when the user clicks on the "Save" link.
            var save_data_to_file = function(){
                //B_DEBUG
                CROWDLOGGER.debug.log( 
                    "Attempting to save log data to file.\n" );
                //E_DEBUG

                // First, trying using HTML5 blobs to save the data; this
                // creates an awful looking filename, but it's the only way
                // to do it in Chrome right now (I think, at least).
                // This isn't supported in FF3.*, so in that case, we just
                // have to display the file itself.
                if( !CROWDLOGGER.util.save_dynamic_text( doc, 
                        JSON.stringify(entries) ) &&
                     CROWDLOGGER.version.info.get_browser_name().
                        match(/^ff/) != null ) {
                    CROWDLOGGER.io.file.display_activity_log( doc );
                }
            };

            doc.getElementById( "log-area" ).innerHTML = 
                JSON.stringify(entries, null, '\t');

            var save_log_elm = doc.getElementById( "save-log" );
            var description = "Save log (this will create a file with a " +
                "random string of numbers to your default downloads " +
                "directory)";

            //CROWDLOGGER.version.info.get_browser_name() === "ff3" ){
            if( CROWDLOGGER.util.get_dynamic_save_functions() === null ){ 
                description = "Show log on file system";
            }

            save_log_elm.innerHTML = description; 
            save_log_elm.addEventListener(
                "click", function(e){ save_data_to_file(); }, false ); 

            next();

        };

        // Read the activity file in and then call the function above.
        CROWDLOGGER.io.log.read_activity_log( {on_chunk: process_entries} );
    };

    if( doc === undefined ){
        // Open the window and call the handler when the page loads.
        CROWDLOGGER.gui.windows.open_dialog( url, "search log",
            CROWDLOGGER.gui.tools.export_log );
    } else {
        if( doc.defaultView && doc.defaultView.jQuery ){
            doc.defaultView.jQuery('#init').html('initialized');
            dump_log( doc );
        }
    }
  

}

} // END CROWDLOGGER.gui.tools NAMESPaCE
