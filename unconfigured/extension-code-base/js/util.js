/**
 * @fileOverview Provides simple utilities that are generally useful.<p> 
 * 
 * See the  CROWDLOGGER.study.util namespace.<p>
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

if( CROWDLOGGER.util === undefined ){

/**
 * @namespace Provides simple utilities that are generally useful.
 */
CROWDLOGGER.util = {};

/**
 * Returns the time of day, e.g., "1:45 pm".
 *
 * @param {object} the_date A date instance.
 * @return The time of day associated with this date object.
 */
CROWDLOGGER.util.date_to_time_of_day = function( the_date ){
    var hour = the_date.getHours();
    var minutes = the_date.getMinutes();
    var am_pm =  (the_date.getHours() > 11 ? "pm" : "am") 

    hour = hour > 12 ? hour - 12 : hour;
    hour = hour === 0 ? 12 : hour;
    minutes = (minutes < 10 ) ? "0" + minutes : ""+minutes;

    return hour + ":" + minutes + " " + am_pm;
};

/**
 * Copies the value of the given element to the system clipboard.
 */
CROWDLOGGER.util.copy_to_clipboard = function( element ){

    // Firefox.
    if( CROWDLOGGER.version.info.get_browser_name().match(/^ff/) !== null ){
        var clipboard_helper = 
            Components.classes["@mozilla.org/widget/clipboardhelper;1"]
            .getService(Components.interfaces.nsIClipboardHelper);
    
        element.select();
        clipboard_helper.copyString( element.value );

    // Chrome.
    } else {
        // This is located in chrome_main.html.
        var textarea = document.getElementById("tmp-clipboard");
        
        // now we put the message in the textarea
        textarea.value = element.value;

        // and copy the text from the textarea
        textarea.select();
        document.execCommand("copy", false, null);
    }
};

/**
 * Returns the value of checked radio button.
 *
 * @param {object} radio_button_group A radio button group element.
 */
CROWDLOGGER.util.get_selected_radio_button = function( radio_button_group ){
    for( var i = 0; i < radio_button_group.length; i++ ){
        if( radio_button_group[i].checked ){
            return radio_button_group[i].value;
        }
    }
    return null;
};

/**
 * Enables a button by taking a pair of buttons where one is the 'enabled'
 * button and the other 'disabled'. It shows the enabled one and hides the
 * disabled one.
 *
 * @param {array} button_array A 2-element array: enabled button, disabled 
 *      button.
 */
CROWDLOGGER.util.enable_button = function( button_array ){
        button_array[0].style.display = "";
        button_array[1].style.display = "none";
};

/**
 * Disables a button by taking a pair of buttons where one is the 'enabled'
 * button and the other 'disabled'. It shows the disabled one and hides the
 * enabled one.
 *
 * @param {array} button_array A 2-element array: enabled button, disabled 
 *      button.
 */
CROWDLOGGER.util.disable_button = function( button_array ){
    // Ha, tricked 'cha! I'm just swapping the buttons and letting
    // enable_button do all the work.. MUHAHAHAH... (note that my comment
    // is longer than the code it takes to do this...)
    CROWDLOGGER.util.enable_button( [button_array[1], button_array[0]] );
};

/**
 * Cleanses a string (data) by:
 * <ul>
 *   <li>if it's a non-encrypted-google https URL, all arguments are removed</li>
 *   <li>whatever it is, substrings matching the patterns are removed:
 *   <ul>
 *      <li>phone number</li> 
 *      <li>SSN</li>
 *   </ul>
 * </ul>
 *
 * @param {string} data The string to clean.
 * @return {string} The cleaned version of <tt>data</tt>.
 */
CROWDLOGGER.util.cleanse_string = function( data ){
    if( !data ){
        return data;
    }

    var output_string = data;

    // Is it an https url?
    if( output_string.match(/^https:\/\//) ) {
        // Yes. Now remove all the parameters.
        output_string = output_string.replace( /\?.*$/, "" );
    }

    // Remove anything that looks like a SSN.
    output_string = output_string.replace( 
         //  /(^|\D)\d\d\d\D{0,1}\d\d\D{0,1}\d\d\d\d(\D|$)/g, function( a ) {
            /(^|\s)\d\d\d\D\d\d\D\d\d\d\d(\s|$)/g, function( a ) {
        return a.replace( /\d/g, "#" );
    } );

    // Remove anything that looks like a phone number.
    output_string = output_string.replace( 
//  /(((%28)|\(){0,1}\d\d\d((%29)|\)){0,1}){0,1}\D{0,2}\d\d\d\D{0,2}\d\d\d\d/g,
   /(\s|^)(((%28)|\(){0,1}\d\d\d((%29)|\)){0,1}){0,1}\D\d\d\d\D\d\d\d\d(\s|$)/g,
        function( a ) {
            var replace = a.replace( /%28/, "____BEGIN_PAREN" );
            replace = replace.replace( /%29/, "____END_PAREN" );
            replace = replace.replace( /\d/g, "#" );
            replace = replace.replace( /____BEGIN_PAREN/, "%28" );
            replace = replace.replace( /____END_PAREN/, "%29" );
            return replace;
    } );

    return output_string;

};

/**
 * Randomly shuffles an array of objects (doesn't matter what they are) in 
 * place.
 *
 * @param {Array} array The array to shuffle (in place).
 */
CROWDLOGGER.util.shuffle = function( array ) {
    var j, tmp;
    // We're going to move each element (with high probability)
    for( var i = 0; i < array.length; i++ ) {
        // Randomly pick which index to swap this element with.
        j = Math.floor( Math.random() * array.length );

        // Perform the swap.
        tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
    }
};

/**
 * Compares two version numbers. The version numbers should be in the format
 * of digits and periods only. Examples of valid version numbers:
 * <ul>
 *   <li>1.0.3</li>
 *   <li>1.00.00.2.3.3</li>
 *   <li>5</li>
 * </ul>
 *
 * @param {string} v1 The first version number.
 * @param {string} v2 The second version number.
 *
 * @return 0 if v1 == v2; -1 if v1 < v2; 1 if v1 > v2.
 */
CROWDLOGGER.util.compare_version_numbers = function( v1, v2 ) {
    var v1_parts, v2_parts, length;

    // Break each version number into it's pieces. So "1.3.0" becomes the
    // array ["1", "3", "0"].
    v1_parts = v1.split( /\./ );
    v2_parts = v2.split( /\./ );

    // We want to compare the overlapping segments between the two versions.
    length = Math.min( v1_parts.length, v2_parts.length );

    for( var i = 0; i < length; i++ ) {
        var cur_v1 = parseInt( v1_parts[i] );
        var cur_v2 = parseInt( v2_parts[i] );

        if( cur_v1 < cur_v2 ){
            return -1;
        } else if( cur_v1 > cur_v2 ) {
            return 1;
        }
    }

    // If we got here, then the two version agree at least on their overlapping
    // segments. However, if one is longer than the other, than that one is
    // the higher version.
    if( v1_parts.length > v2_parts.length ){
        return 1;
    } else if( v1_parts.length < v2_parts.length ) {
        return -1;
    } else {
        return 0;
    }

};

/**
 * Finds the browser-specific functions necessary for creating blobs for
 * downloads. Wrappers for these functions are stored in an object, which
 * has three fields:
 *      blob_builder -> function()
 *      create_object_url -> function(data) = url
 *      revoke_object_url -> function(url)
 * The window and CROWDLOGGER.window objects are search over for the functions.
 * <code>null</code> is returned if any of these functions were not found. 
 *
 * @return {object} An object with three function wrappers; null if any one
 *      of the functions was not found.
 */
CROWDLOGGER.util.get_dynamic_save_functions = function(){

    // Figures out if the given window object has the necessary blob-saving
    // functions available. Specifically, a blob builder (BlobBuilder,
    // WebKitBlobBuilder, or MozBlobBuilder), an object url creator
    // (webkitURL.createObjectURL, URL.createObjectURL, createObjectURL),
    // and a revoke object url (mirrors the create object url functions).
    // These are all returned in an object with three fields:
    //      blob_builder -> function()
    //      create_object_url -> function(data) = url
    //      revoke_object_url -> function(url)
    // If a function was not found, it is null.
    var check_window = function( win ){
        var has_blob_builder, has_create_object;
        var save_functions = {
            blob_builder:  null,
            create_object_url: null,
            revoke_object_url: null
        };

        if( win.BlobBuilder !== undefined ){
            save_functions.blob_builder = 
                function(){return new win.BlobBuilder();};
        } else if( win.WebKitBlobBuilder !== undefined){
            save_functions.blob_builder = 
                function(){return new win.WebKitBlobBuilder();};
        } else if( win.MozBlobBuilder !== undefined ){
            save_functions.blob_builder = 
                function(){return new win.MozBlobBuilder();};
        }

        if( win.webkitURL !== undefined &&
                win.webkitURL.createObjectURL !== undefined) {
            save_functions.create_object_url = 
                function(x){ return win.webkitURL.createObjectURL(x); };
            save_functions.revoke_object_url = 
                function(x){ win.webkitURL.revokeObjectURL(x); };
        } else if( win.createObjectURL !== undefined ){
            save_functions.create_object_url = 
                function(x){ return win.createObjectURL(x); };
            save_functions.revoke_object_url = 
                function(x){ win.revokeObjectURL(x); };
        } else if( win.URL !== undefined &&
                win.URL.createObjectURL !== undefined ) {
            save_functions.create_object_url = 
                function(x){ return win.URL.createObjectURL(x); };
            save_functions.revoke_object_url = 
                function(x){ win.URL.revokeObjectURL(x); };
        }

        return save_functions;
    };

    // Checks if all of the functions in the given object are non-null.
    var all_functions_defined = function( functions ){
        var none_null = true;
        for( x in functions ){
            none_null = none_null && functions[x] !== null;
        }
        return none_null;
    };

    //B_DEBUG
    //CROWDLOGGER.debug.log( "========================\nCHECKING WINDOWS\n" );
    //E_DEBUG

    // Figure out which window to use. This is really a hack to get around
    // issues about what is available to the current window object...this
    // mostly pertains to Firefox.
    var windows = { window: window, crowdlogger_window: CROWDLOGGER.window };
    for( win in windows ){
        var functions = check_window( windows[win] );
        if( all_functions_defined( functions ) ) {
            //B_DEBUG
            //CROWDLOGGER.debug.log( "SAVE DYNAMIC TEXT CHECK: " + win + "\n");
            //E_DEBUG
            return functions;
        }
    }

    //B_DEBUG
    //CROWDLOGGER.debug.log( "SAVE DYNAMIC TEXT CHECK: null\n" );
    //E_DEBUG

    // If we reached here, then we didn't find all of the necessary functions.
    return null;
};

/**
 * Saves the given data to a blob object, attached to the given document,
 * and sets the file header to request the blob be downloaded. The blob
 * is deleted after a short amount of time (not the downloaded file; just
 * the version living in the browser).
 *
 * @param {object} doc  A document object; this will have the blob injected
 *      in an iframe element.
 * @param {string} data The data to save.
 * @return The status: <code>true</code> if successful, <code>false</code>
 *      otherwise.
 */
CROWDLOGGER.util.save_dynamic_text = function( doc, data ) {
    var builder = undefined, bit_array, saveas, removeURL, createURL;
    var save_functions = CROWDLOGGER.util.get_dynamic_save_functions();

    if( save_functions === null ){
        return false;
    }
    
    builder = save_functions.blob_builder();
    
    // Convert the data into unsigned ints.
    bytes = new Uint8Array(data.length);
    for(var i = 0; i< data.length; i++) {
      bytes[i] = data.charCodeAt(i);
    }
    builder.append( bytes.buffer );
    
    blob = builder.getBlob("application/octet-stream");
    saveas = doc.createElement("iframe");
    saveas.style.display = "none";
    saveas.name = "log.tsv";
    

    try{
        saveas.src = save_functions.create_object_url(blob);
    } catch(e) {
        CROWDLOGGER.debug.log( "Exception: " + e );
    }
    
    doc.body.appendChild(saveas);
    //doc.getElementById( "log-area" ).appendChild(saveas);

    // After some period of time, remove this object (it could get big).
    setTimeout( 
        function(){ save_functions.revoke_object_url( saveas.src ); }, 50000 )

    return true;    
};


CROWDLOGGER.util.save_dynamic_text_stream = function( doc ) {
    var builder = undefined, bit_array, saveas, removeURL, createURL;
    var save_functions = CROWDLOGGER.util.get_dynamic_save_functions();

    if( save_functions === null ){
        return null;
    }
    
    builder = save_functions.blob_builder();
    
    var append = function(data){
        // Convert the data into unsigned ints.
        bytes = new Uint8Array(data.length);
        for(var i = 0; i< data.length; i++) {
          bytes[i] = data.charCodeAt(i);
        }
        builder.append( bytes.buffer );
    };

    var save = function(name){
        saveAs(builder.getBlob("application/octet-stream"), name);

        // blob = builder.getBlob("application/octet-stream");
        // saveas = doc.createElement("iframe");
        // saveas.style.display = "none";
        // // saveas.name = "log.tsv";
        

        // try{
        //     saveas.src = save_functions.create_object_url(blob);
        // } catch(e) {
        //     CROWDLOGGER.debug.log( "Exception: " + e );
        // }
    
        // doc.body.appendChild(saveas);
        // //doc.getElementById( "log-area" ).appendChild(saveas);

        // // After some period of time, remove this object (it could get big).
        // setTimeout( 
        //     function(){ save_functions.revoke_object_url( saveas.src ); }, 50000 )
    };

    return {
        append_data: append,
        save_as: save
    };    
};



/**
 * Based on: http://www.js-x.com/page/javascripts__example.html?view=745
 * Extracts email addresses from the mixed format of names and email addresses
 * (like what you would enter into a mail client's To/CC/BCC fields).
 *
 * @param {string} A list of emails.
 * @return {string} A list of clean emails, comma delimited.
 */ 
CROWDLOGGER.util.clean_mixed_emails = function(mixed) { 
    var email = ""; // if no match, use this 
    var emails_array = mixed.match(
        /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi); 
    if (emails_array) { 
        email = ""; 
        for (var i = 0; i < emails_array.length; i++) { 
            if (i > 0){
                 email += ",";  
            }
            email += emails_array[i]; 
        } 
    } 
    return email; 
}; 

/**
 * Creates an entry for a tool listing, e.g., see the Dev Tools page.
 *
 * @param {obj}      jq           The jQuery object for the page on which the 
 *                                entry will be added.
 * @param {function} on_click     The function to call when the heading is 
 *                                clicked.
 * @param {string}   heading      The heading to display.
 * @param {string}   description  The description to display under the heading.
 *
 * @return An entry as a jQuery object. 
 */
CROWDLOGGER.util.format_entry = function(jq, on_click, heading, description) {

    var entry = jq("<div>").addClass("entry");
    var heading_elm = jq("<h2>");
    var heading_link_elm = jq("<a href='#'>").click(function(){
        on_click(); 
        return false;
    }).html(heading);

    entry.append(heading_elm);
    heading_elm.append(heading_link_elm);
    entry.append(description);

    return entry;
};

/**
 * Creates a simple html table from a hash table. The key's will be displayed
 * in the left-most column and the values in the right-most column.
 *
 * @param {associative array} map    The map.
 * 
 * @return A string html table.
 */
CROWDLOGGER.util.make_table = function( map ) {
    var output = ["<table>"];
    for( key in map ){
        output.push("<tr><td>"+key+"</td><td>"+
            JSON.stringify(map[key]).replace(",", ", ")+"</td></tr>");        
    }
    output.push("</table>");
    return output.join("\n");
};

/**
 * Performs a binary search over the given array. The comp_func is used to 
 * compare the the current element in the array with the item. 
 *
 * Based on http://jsfromhell.com/array/search [rev. #2] by 
 * Carlos R. L. Rodrigues
 *
 * @param {array} array   An array of anything.
 * @param {anything} item The item being searched for.
 * @param {function} comp_func A comparison function. Should take two items of
 *    the types given (the first arg will be from the array, the second will
 *    be the item to find) and return -1, 0, or 1 if the first arg is less than,
 *    equal to, or greater than the second arg.
 * @param {boolean} insert Optional. If true and the item is not found, the
 *    index where it should be inserted is returned.
 */
CROWDLOGGER.util.binary_search = function( array, item, comp_func, insert ){
    insert = insert === undefined ? false : insert;

    if( array.length === 0 ){
        return insert ? 0 : -1;
    }

    var high = array.length, low = -1, middle;
    while( high - low > 1 ){
        if( comp_func( array[middle = high+low >> 1], item ) < 0 ){
            low = middle;
        } else {
            high = middle;
        }
    }

    if( comp_func(array[high], item) !== 0 ){
        return insert ? high : -1;
    } else {
        return high;
    }
};

/**
 * A comparison of two ints. Returns -1, 0, or 1 if x is less than, equal to,
 * or greater than y, respectively.
 *
 * @param {integer} x The first number.
 * @param {integer} y The second number.
 * @return -1, 0, or 1 if x is less than, equal to, or greater than y, 
 *     respectively.
 */
CROWDLOGGER.util.int_compare = function(x, y){
    if( x < y ){
        return -1;
    } else if( x == y ){
        return 0;
    } else {
        return 1;
    }
};

/**
 * A comparison of two ints. Returns -1, 0, or 1 if x is less than, equal to,
 * or greater than y, respectively.
 *
 * @param {array} x An array formatted [key, int value].
 * @param {array} y An array formatted [key, int value].
 * @return -1, 0, or 1 if x[1] is less than, equal to, or greater than y[1], 
 *     respectively.
 */
CROWDLOGGER.util.key_value_compare = function(x, y){
    try{
        if( x[1] < y[1] ){
            return -1;
        } else if( x[1] == y[1] ){
            return 0;
        } else {
            return 1;
        }
    } catch(err){
        console.log(x);
        console.log(y);
        return -1;
    } 
};

/**
 * Converts an array into an object where each element is set to 'true'.
 * 
 * @param  {array} array An array of anything.
 * @return {object} An object where each element of the given array is a key.
 */
CROWDLOGGER.util.objectify_array = function(array){
    var object = {};
    CROWDLOGGER.jq.each(array, function(i,entry){
        object[entry] = true;
    });
    return object;
};

/**
 * Selects a subset of the given array.
 * 
 * @param  {array} array           An array of anything.
 * @param  {function} select_func  A function that takes an element of the given
 *      array and returns 'true' if the element should be selected.
 * @return {array} An array of the selected elements of the given array.
 */
CROWDLOGGER.util.select = function(array, select_func){
    var result = [];
    CROWDLOGGER.jq.each(array, function(i,entry){
        if( select_func(entry) ) {
            result.push(entry);
        }
    });
    return result;
};

/**
 * Formats a query into a URL for the corresponding search engine. Currently
 * only supports Google.
 * 
 * @param  {string} se    Search engine.
 * @param  {string} query The query string.
 * @return {string} The search URL for the given query and search engine.
 */
CROWDLOGGER.util.format_search_url = function(se, query){
    if( se.match(/google/) !== null ){
        return se.replace(/\/$/, '') +'/search?q='+ query;
    }
};

/**
 * Truncates a URL down to the domain, including the http{s} at the beginning.
 * 
 * @param  {string} url The URL to truncate.
 * @return {string} A truncated URL.
 */
CROWDLOGGER.util.truncate_url = function(url){
    return url.replace(/(https{0,1}:\/\/[^\/]*)\/.*$/, '$1');
};

/**
 * Tests whether two timestamps are from the same day (in terms of UTC date).
 * 
 * @param  {timestamp} t1 The first timestamp; needs to be parsable by Date.
 * @param  {timestamp} t2 The second timestamp; needs to be parsable by Date.
 * @return {boolean} True if t1 and t2 are from the same UTC day.
 */
CROWDLOGGER.util.are_same_day = function(t1, t2){
    return( new Date(t1).toDateString() === new Date(t2).toDateString() );
};

/**
 * Applies the function fn to each element in the array.
 * 
 * @param  {Array}    array   An array.
 * @param  {Function} fn      A function which takes an index and the element
 *                            at array[index].
 * @param  {boolean}  reverse If true, the array will be traversed in reverse
 *                            order.
 */
CROWDLOGGER.util.foreach = function(array, fn, reverse){
    var i;
    if( reverse === true ){ 
        for(i = array.length-1; i >= 0; i-- ){ fn(i, array[i]); }
    } else {
        for(i = 0; i < array.length; i++ ){ fn(i, array[i]); }
    }
};

/**
 * Returns a copy of the given array.
 * 
 * @param  {Array} array The array to copy.
 * @return {Array} A duplicate of the given array.
 */
CROWDLOGGER.util.copy = function(array){
    var copy = [], i;
    for(i = 0; i < array.length; i++){
        copy.push( array[i] );
    }
    return copy;
};

/**
 * Checks if a refresh was requested or the given document contains an element 
 * named 'init' and it's not already set to 'initialized'.
 *
 * @param {Object} doc  The doc of the page to check.
 * @param {boolean} refresh Whether a refresh was requested.
 * @return refresh || doc has 'init' and 'init' is not set to 'initialized'.
 */
CROWDLOGGER.util.okay_to_refresh_page = function(doc, refresh) {
    refresh === undefined ? false : refresh;
    var elm = doc.getElementById('init');
    if( elm ){
        return refresh || elm.innerHTML !== 'initialized';
    } 
    return true;
};

/**
 * Sets the 'init' element to 'initialized'.
 *
 * @param {Object} doc  The doc of the page to update.
 */
CROWDLOGGER.util.mark_page_as_initialized = function(doc) {
    if( doc.defaultView && doc.defaultView.jQuery ){
        doc.defaultView.jQuery('#init').html('initialized');
    }
};

} // END CROWDLOGGER.util NAMESPACE
