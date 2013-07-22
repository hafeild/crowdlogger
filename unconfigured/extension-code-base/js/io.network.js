/**
 * @fileOverview Creates a new namespace called CROWDLOGGER.io.network
 * that provides functionality regarding network IO, such as sending
 * data via GET or POST.<p>
 * 
 * See the CROWDLOGGER.send_get_data namespace.<p>
 * 
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%% 
 */

// Define the CROWDLOGGER.io namespace if it isn't already.
if( CROWDLOGGER.io === undefined ) {

    /**
     * @namespace A namespace for different kinds of IO, including file and
     * network.
     */
    CROWDLOGGER.io = {};
}

if( CROWDLOGGER.io.network === undefined ){

/**
 * @namespace Provides functionality regarding network IO, such as sending
 * data via GET or POST.
 */
CROWDLOGGER.io.network = {};


/**
 * Forms a url from the server_base_url and the given page name. The page name
 * should be a valid preference variable.
 * @param {string} page_name  The name of the preference corresponding to the 
 *                            desired page.
 * @param {string} the_default    The default web page to use in the event that 
 *                            page_name is not a valid preference. This is
 *                            appended to the server_base_url.
 * @return The value of the page_name preference appended to the 
 *         server_base_url.
 */
CROWDLOGGER.io.network.get_server_url = function( page_name, the_default ){
    return CROWDLOGGER.preferences.get_char_pref( 'server_base_url', '' ) +
        CROWDLOGGER.preferences.get_char_pref( page_name, the_default );
};

/**
 * Sends data to the given URL using GET or POST. On error, the error callback 
 * function is called. On success, the success callback function is invoked.
 * @function
 *
 * @param {string} url The url to contact.
 * @param {string} data The data to send.
 * @param {function} on_success The function to call on success.
 * @param {function} on_error The function to call if an error is encountered.
 * @param {string} method Either GET or POST -- the method used to transfer
 *                        data.
 */
CROWDLOGGER.io.network.send_data = function( url, data, on_success, on_error, 
            method, bypass_firewall_check, ping_url ){


    // Check if this url is https -- if so, we need to ping the 'ping server'
    // first to make sure there is an internet connection. This is a precaution
    // in the event that the user's computer has pulled an ip address, but is
    // behind a firewall (e.g., at a hotel with a sign-in page).
    if(  url.match(/^https/) && !bypass_firewall_check ){
        ping_url = ping_url ||
            CROWDLOGGER.preferences.get_char_pref( "ping_server_url", 
                                                   "http://www.google.com" );

        CROWDLOGGER.io.network.send_data( ping_url, "", function(){ 
            CROWDLOGGER.io.network.send_data( 
                url, data, on_success, on_error, method, true ); 
        }, on_error, "GET", true );
        return true;
    }

    //data = encodeURI( data );
    var httpReq = new XMLHttpRequest();
    
    if( null == httpReq ) {
        return false;
    }

    // Check if the user forgot to specify a method. Default to GET.
    method = method || "GET";

    if( method === "GET" && data !== null ){
        url = url + "?" + data;
        data = null;
    }

    // Open the connection using the method specified.
    httpReq.open( method, url, true );
    httpReq.setRequestHeader(
        'Content-Type', 'application/x-www-form-urlencoded');

    CROWDLOGGER.debug.log('Set '+ method +' request for: '+ url);

    // Create a listener function. As soon as the request has gone through
    // and we get a response back, fire up the on_success function passed in.
    httpReq.onreadystatechange = function() {

        if( httpReq.readyState == 4 ) {
            if( httpReq.status == 200 ) {
                var response = 
                   httpReq.responseText.replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1");
                /*//B_DEBUG
                CROWDLOGGER.debug.log( "Successfully heard back from " + url + 
                    ". Here's the response text: " + response + 
                    "\n" );
                //E_DEBUG*/
                if(on_success){ on_success( response ) };
            } else {
                //B_DEBUG
                CROWDLOGGER.debug.log( "Error while posting data to  "+url+": "+
                    httpReq.status + 
                    "\n\ttext: " + httpReq.responseText +  
                    "\n\ttext: " + httpReq.responseXML + "\n" ); 
                //E_DEBUG
                if(on_error){ on_error( "Status error connecting to " + url ); } 
            }
        }
    }

    // Send the data.
    httpReq.send( data );

    return true;
};


/**
 * Sends data to the given URL using POST. On error, the error callback function
 * is called. On success, the success callback function is invoked.
 *
 * @param {string} url The url to contact.
 * @param {string} data The data to send via POST.
 * @param {function} on_success The function to call on success.
 * @param {function} on_error The function to call if an error is encountered.
 */
CROWDLOGGER.io.network.send_post_data = 
        function( url, data, on_success, on_error ){
    CROWDLOGGER.io.network.send_data( url, data, on_success, on_error, "POST" );
};

/**
 * Sends data to the given URL using GET. On error, the error callback function
 * is called. On success, the success callback function is invoked.
 *
 * @param {string} url The url to contact.
 * @param {string} data The data to send via GET.
 * @param {function} on_success The function to call on success.
 * @param {function} on_error The function to call if an error is encountered.
 */
CROWDLOGGER.io.network.send_get_data = 
        function( url, data, on_success, on_error ){

    CROWDLOGGER.io.network.send_data( url, data, on_success, on_error, "GET" );
};



}
