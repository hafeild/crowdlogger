/**
 * @fileOverview Creates a new namespace called CROWDLOGGER.io.network
 * that provides functionality regarding network IO, such as sending
 * data via GET or POST.<p>
 * 
 * See the CROWDLOGGER.send_get_data namespace.<p>
 * 
 * %%VERSION_WEB%%
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
            method ){

    //data = encodeURI( data );
    var httpReq = new XMLHttpRequest();
    
    if( null == httpReq ) {
        return false;
    }

    // Check if the user forgot to specify a method. Default to GET.
    if( method === undefined ){
        method = "GET";
    }

    if( method === "GET" && data !== null ){
        url = url + "?" + data;
        data = null;
    }

    // Open the connection using the method specified.
    httpReq.open( method, url, true );
    httpReq.setRequestHeader(
        'Content-Type', 'application/x-www-form-urlencoded');

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
                on_success( response );
            } else {
                //B_DEBUG
                CROWDLOGGER.debug.log( "Error while posting data to  "+url+": " +
                    httpReq.status + 
                    "\n\ttext: " + httpReq.responseText +  
                    "\n\ttext: " + httpReq.responseXML + "\n" ); 
                //E_DEBUG
                on_error( "Status error connecting to " + url ); 
            }
        }
    }

    // Send the data.
    httpReq.send( data );

    // Note that returning true here just means that we've made it this far.
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
