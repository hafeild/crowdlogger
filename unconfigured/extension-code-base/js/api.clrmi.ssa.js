/**
 * @fileOverview Provides the Server Side Access API for CrowdLogger remote modules
 * (CLRMs). There are two parts -- the CrowdLogger-side interface (CLI) and
 * the sandbox- side interface (SBI). CRMs communicate with the SBI, which in
 * turn communicates with the CLI, which has access to the CROWDLOGGER
 * object.
 *
 * %%LICENSE%%
 * 
 * @author hfeild
 * 
 * @version %%VERSION%%
 */

CLRMI.prototype.ServerSideAccess = function(api){
    // Private variables.
    var that = this;

    // Private functions.
    var wrapCallback;

    // Public functions.
    this.sendData; this.sendPostData; this.sendGetData;


    /**
     * Serves as a wrapper for callback. Given a set of options (e.g., to one
     * of the public methods below), this function will create and register a
     * callback wrapper that can support on_success, on_error, and on_chunk.
     *
     * @param {object} opts  A map of options.
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success  Called if the event field of the object 
     *                               passed to the callback is 'on_success'. The
     *                               value of the 'data' field will be passed
     *                               to this function.
     *    <li>{function} on_error    Called if the event field of the object
     *                               passed to the callback is 'on_error'. The
     *                               value of the 'error' field will be passed
     *                               to this function.
     *    <li>{function} on_chunk    Called if the event field of the object
     *                               passed to the callback is 'on_chunk'. The
     *                               value of the 'data' field will be passed
     *                               to this function as well as a 'next' and
     *                               'abort' function.
     * </ul>
     * @return The id of the registered callback.
     */
    wrapCallback = function(opts){
        var callbackID;
        var callback = function(params){
            if( params.event === 'on_error' && opts.on_error ){
                opts.on_error(params.error);
            } else if( params.event === 'on_success' && opts.on_success ) {
                opts.on_success(params.data);
            }
            api.base.unregisterCallback(callbackID);
        };

        callbackID = api.base.registerCallback(callback);
        return callbackID;
    };


    // Public function definitions.
    
    /**
     * Sends data to the given url.
     *
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} url             The URL to send the data to.
     *    <li>{string} method          One of GET or POST.
     * </ul>
     * OPTIONAL:
     * <ul>
     *   <li>{object|string} data      The data to send.
     *   <li>{boolean} bypassFirewallCheck  If true, then we don't check to
     *                                 see if the internet is accessible. 
     *    <li>{string} pingURL         The URL to ping to check if there's an
     *                                 internet connection. This defaults to
     *                                 the CrowdLogger server.
     *    <li>{function} on_success    The function to call on success. Should
     *                                 expect the server response as its only
     *                                 argument.
     *    <li>{function} on_error      Invoked if an error is encountered.
     * </ul>
     * @throws CLIException if required options are missing.
     */
    this.sendData = function(opts){
        // This will throw an exception if there are missing arguments.
        api.util.checkArgs(opts, ['url','method'], 'clrmi.ssa.sendData');

        // Pass the data one to the CLI.
        api.base.invokeCLIFunction({
            apiName: 'ssa',
            functionName: 'sendData',
            options: {
                callbackID: wrapCallback(opts),
                data: opts.data,
                url: opts.url,
                method: opts.method,
                bypassFirewallCheck: opts.bypassFirewallCheck,
                pingURL: opts.pingURL
            }
        });

    };

    /**
     * Sends POST data to the given url.
     *
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} url             The URL to send the data to.
     * </ul>
     * OPTIONAL:
     * <ul>
     *   <li>{object|string} data      The data to send.
     *   <li>{boolean} bypassFirewallCheck  If true, then we don't check to
     *                                 see if the internet is accessible. 
     *    <li>{string} pingURL         The URL to ping to check if there's an
     *                                 internet connection. This defaults to
     *                                 the CrowdLogger server.
     *    <li>{function} on_success    The function to call on success. Should
     *                                 expect the server response as its only
     *                                 argument.
     *    <li>{function} on_error      Invoked if an error is encountered.
     * </ul>
     * @throws CLIException if required options are missing.
     */
    this.sendPostData = function(opts){
        opts.method = 'POST';
        that.sendData(opts);
    };

    /**
     * Sends GET data to the given url.
     *
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} url             The URL to send the data to.
     * </ul>
     * OPTIONAL:
     * <ul>
     *   <li>{object|string} data      The data to send.
     *   <li>{boolean} bypassFirewallCheck  If true, then we don't check to
     *                                 see if the internet is accessible. 
     *    <li>{string} pingURL         The URL to ping to check if there's an
     *                                 internet connection. This defaults to
     *                                 the CrowdLogger server.
     *    <li>{function} on_success    The function to call on success. Should
     *                                 expect the server response as its only
     *                                 argument.
     *    <li>{function} on_error      Invoked if an error is encountered.
     * </ul>
     * @throws CLIException if required options are missing.
     */
    this.sendGetData = function(opts){
        opts.method = 'GET';
        that.sendData(opts);
    };    

}