/**
 * @fileOverview Provides the Server Side Access API for CrowdLogger remote 
 * modules (CLRMs). There are two parts -- the CrowdLogger-side interface (CLI)
 * and the sandbox- side interface (SBI). CRMs communicate with the SBI, which
 * in turn communicates with the CLI, which has access to the CROWDLOGGER
 * object.
 *
 * %%LICENSE%%
 * 
 * @author hfeild
 * 
 * @version %%VERSION%%
 */

CLI.prototype.ServerSideAccess = function(crowdlogger, cli){
    // Private variables.
    var that = this,
        callbacks;

    // Public functions:
    // this.sendData;

    // Provides several wrappers for common callback functions.
    callbacks = {
        // Called when there is an error.
        on_error: function(callbackID){ 
            return function(error){
                // Call the callback.
                cli.base.invokeCLRMICallback({
                    callbackID: callbackID, 
                    options: {
                        event: 'on_error',
                        error: error
                    }
                });
            };
        },

        // Called when reading is finished.
        on_success: function(callbackID){ 
            return function(data){
                // Call the callback.
                cli.base.invokeCLRMICallback({
                    callbackID: callbackID, 
                    options: {
                        event: 'on_success',
                        data: data
                    }
                });
            };
        }
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
     *    <li>{int} callbackID:        The id of the CLRMI function to invoke.
     *                                 This is invoked for the following
     *                                 events (stored in 'event') along with
     *                                 their parameters ('params'):
     *        <ul>
     *            <li>{function} on_success:   Invoked when everything is read.
     *            <li>{function} on_error:     Invoked if there's an error.
     *        </ul>
     * </ul>
     * OPTIONAL:
     * <ul>
     *   <li>{object|string} data      The data to send.
     *   <li>{boolean} bypassFirewallCheck  If true, then we don't check to
     *                                 see if the internet is accessible. 
     *    <li>{string} pingURL         The URL to ping to check if there's an
     *                                 internet connection. This defaults to
     *                                 the CrowdLogger server.
     * </ul>
     * @throws CLIException if required options are missing.
     */
    this.sendData = function(opts){
        crowdlogger.util.check_args(opts, 
            ['url', 'method', 'callbackID'], 'api.cli.ssa.postData', 
            cli.CLIException, true);

        var tmpData = [], param;
        if( opts.data && (typeof opts.data) === 'object' ){
            for(param in opts.data){
                tmpData.push(param +'='+ JSON.stringify(opts.data[param]));
            }
            opts.data = tmpData.join('&');
        }

        crowdlogger.io.network.send_data( 
            opts.url, opts.data, callbacks.on_success(opts.callbackID), 
            callbacks.on_error(opts.callbackID), opts.method,
            opts.bypassFirewallCheck, opts.pingURL );
    };
};
