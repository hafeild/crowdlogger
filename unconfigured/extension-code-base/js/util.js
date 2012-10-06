/**
 * @fileOverview Provides simple utilities that are generally useful.<p> 
 * 
 * See the  CROWDLOGGER.study.util namespace.<p>
 * 
 * %%VERSION_WEB%%
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

} // END CROWDLOGGER.util NAMESPACE
