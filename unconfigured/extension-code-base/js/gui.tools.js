/**
 * @fileOverview Provides functionality to display data taken from a user's
 * activity log. 
 * 
 * See the  CROWDLOGGER.gui.tools namespace.<p>
 * 
 * %%LICENSE%%
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
 * @param {boolean} refresh Whether to refresh the page.
 */
CROWDLOGGER.gui.tools.diplay_search_histogram = function( doc, refresh ){
    // The page to load.
    var registration_page = CROWDLOGGER.preferences.get_char_pref( 
        "search_histogram_dialog_url", "not_found.html" );

    // The prefix for the extension's html files.
    var extension_prefix = CROWDLOGGER.version.info.get_extension_html_prefix();

    // The full url.
    var url = extension_prefix + registration_page;

    // The function to call when the page loads.
    /** @ignore */
    var search_history_handler = function( doc, refresh ){
            if( !CROWDLOGGER.util.okay_to_refresh_page(doc, refresh) ){return;}
            CROWDLOGGER.util.mark_page_as_initialized(doc);

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

            // Create a search histogram.            
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
            search_history_handler );
    } else {
        search_history_handler( doc, refresh );
    }
};

/**
 * Launches a new tab with the search_trails.html file. This file is
 * then populated with the user's searches and clicks.
 *
 * @param {object} doc [Optional.] If included, the given doc will be
 *      updated, rather than launching a whole new page.
 * @param {boolean} refresh Whether to refresh the page.
 */
CROWDLOGGER.gui.tools.diplay_search_trails = function( doc, refresh ){

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
                    entry.q,
                    to_search_url( entry.q, entry.se), entry.se
                );

                if( (search_trail_event.time - previous_search_event.time) < 
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

        return search_trail_array;
    };

    // The function to call when the page loads.
    /** @ignore */
    var search_trail_handler = function( doc, refresh ){
        if( !CROWDLOGGER.util.okay_to_refresh_page(doc, refresh) ){ return; }
        CROWDLOGGER.util.mark_page_as_initialized(doc);

        var curDayElm, curDayKey = "";

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

        // The header.
        var html = jq('<table>');

        // Place the html.
        contents_element.append(html);

        // This will be called when the file is finished being read.
        var process_entries = function( entries, next ){
            // Get the search histogram for the log.
            var search_trails = log_to_search_trails_by_day( entries );

            // Now iterate through the array of search trails in reverse order,
            // separating days with a ruler.
            //for( var i = search_trails.length-1; i >= 0; i-- ){
            var i;
            for( i = 0; i < search_trails.length; i++ ){
                if( search_trails[i].to_key() !== curDayKey ){
                    html.append('<tr><td colspan="2" class="date">'+
                        search_trails[i].to_key() +'</td></tr>'); // The date.
                    curDayKey = search_trails[i].to_key();
                }

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
            entries = null;
            search_trails = null;

            jq('<span class="button" style="height: 20px">').
                text('See more').
                click(function(){
                    next();
                    jq(this).remove();
                }).appendTo(contents_element);

            // next();
        };
        
        // Read the activity file in and then call the function above.
        CROWDLOGGER.io.log.read_activity_log( {
            on_chunk: process_entries,
            chunk_size: 2000,
            reverse: true
        } );
    };

    if( doc === undefined ){
        // Open the window and call the handler when the page loads.
        CROWDLOGGER.gui.windows.open_dialog( url, "search trails",
            search_trail_handler );
    } else {
        search_trail_handler( doc, refresh );
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
 * @param {object} doc The document on which to display the log. This should have
 *      at least two elements: log-area (where the log will be displayed) and
 *      save-log (a link that will either invoke the log to be saved or
 *      open the log file in a new window).
 * @param {boolean} refresh Whether the page is being refreshed (optional).
 */
CROWDLOGGER.gui.tools.export_log = function( doc, refresh ){
    // The page to load.
    var registration_page = CROWDLOGGER.preferences.get_char_pref(
        "export_dialog_url", "not_found.html" );
            
    // The prefix for the extension's html files.
    var extension_prefix = CROWDLOGGER.version.info.get_extension_html_prefix();
        
    // The full url.
    var url = extension_prefix + registration_page;  

    // Dumps the contents of the log to the given document.
    var dump_log = function( doc, refresh ) {
        if( !CROWDLOGGER.util.okay_to_refresh_page(doc, refresh) ){ return; }
        CROWDLOGGER.util.mark_page_as_initialized(doc);

        var win = CROWDLOGGER.window,
            save_log_elm,
            done = false,
            jq = doc.defaultView.jQuery,
            next_button = jq(
                '<span class="button" style="height: 20px">Next</span>').
                insertAfter('#log-area'),
            save,
            process_entries;

        save = function(){
            const FILE_TYPE = 'application/x-download'; //'text/plain;charset=utf-8'; //text/javascript'; //'application/x-download';
            var blob,
                firstEntry = true,
                oldestDate, 
                newestDate,
                limit = jq('#file-limit').val(),
                data = [],
                append_entries_to_save,
                save_file;

            if( limit === 'all' ){
                limit = 0;
            } else {
                limit = parseFloat(limit);
                if( isNaN(limit) ){
                    limit = 0;
                }
            }

            save_log_elm.removeClass('button');
            save_log_elm.off('click', save);
            save_log_elm.html('');

            append_entries_to_save = function( entries, next ){
                if(save_log_elm.html().length === 3){
                    save_log_elm.html('');
                } else {
                    save_log_elm.html( save_log_elm.html()+'.');
                }

                var i, size;

                // Update the dates.
                if( newestDate === undefined && entries.length > 0 ){
                    newestDate = entries[0].t;
                    oldestDate = newestDate;
                }

                if( entries.length > 0 ){
                    oldestDate = Math.min(
                        oldestDate, entries[entries.length-1].t);
                }

                if( data.length === 0 ){
                    data = ['[', JSON.stringify(entries.shift(), null, '\t')];
                }

                // Serialize the entries.
                while( entries.length > 0 ){
                    data.push(',');
                    data.push(JSON.stringify(entries.shift(), null, '\t'));
                }

                size = data.length / 4500.0; // Rough estimate of 4.5k/MB.
                console.log(size);

                if(limit === 0 || size < limit){
                    setTimeout(next, 5);
                } else {
                    setTimeout(save_file, 5);
                }
            };

            save_file = function(){
                if( data.length > 0 ){ //blob){

                    //blob = new Blob([blob, ']'], {type: FILE_TYPE});
                    data.push(']');
                    blob = new Blob(data, {type: FILE_TYPE});
                    console.log("Writing file!");
                    // saveAs(
                    //     new Blob([blob,']'], {type: FILE_TYPE}), 
                    //     'log.'+oldestDate+'-'+newestDate+'.json');
                    var url = URL.createObjectURL(blob);

                    //blob = null;
                    // save_log_elm.html('Save');
                    // save_log_elm.on('click', save); 
                    var e = jq('<a href="'+url+'" download="log.'+
                        oldestDate+'-'+
                        newestDate+'.json"></a>').
                        insertAfter(save_log_elm);

                    e.click(function(){
                        var link = jq(this);
                        save_log_elm.html('Save');
                        save_log_elm.addClass('button');
                        save_log_elm.on('click', save); 
                        setTimeout(function(){
                            link.remove();
                            URL.revokeObjectURL(url);
                        }, 50);
                    })[0].click();
                    //.trigger('click');
                    delete blob;
                }
            };

            CROWDLOGGER.io.log.read_activity_log( {
                on_chunk: append_entries_to_save,
                chunk_size: 500,
                on_success: save_file,
                reverse: true
            } );

        };

        // Called when the activity log has been parsed.
        process_entries = function( entries, next ){
            doc.getElementById( 'log-area' ).innerHTML = 
                JSON.stringify(entries, null, '\t');


            var next_wrapper = function(){
                next_button.off('click', next_wrapper);
                next_button.hide();
            }
            next_button.on('click', next_wrapper);
            if( !done ){
                next_button.show();
            }
        };

        // Attach the code that forms the blob to download to the 'Save' button.
        save_log_elm = jq('#save-log');
        if( !refresh ){
            save_log_elm.on('click', save); 
        }    

        // This controls what is displayed directly on the export page (i.e.,
        // it's not for storing the data to a file).
        CROWDLOGGER.io.log.read_activity_log( {
            on_chunk: process_entries,
            chunk_size: 1000,
            on_success: function(){
                next_button.hide();
                done = true;
            },
            reverse: true
        } );
    };

    if( doc === undefined ){
        // Open the window and call the handler when the page loads.
        CROWDLOGGER.gui.windows.open_dialog( url, "search log", dump_log );
    } else {
        dump_log( doc, refresh );
    }
}



} // END CROWDLOGGER.gui.tools NAMESPaCE
