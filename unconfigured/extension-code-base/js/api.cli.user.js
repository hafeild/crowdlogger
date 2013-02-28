/**
 * @fileOverview Provides the User API for CrowdLogger remote modules (CRMs). 
 * There are two parts -- the CrowdLogger-side interface (CLI) and the sandbox-
 * side interface (SBI). CRMs communicate with the SBI, which in turn 
 * communicates with the CLI, which has access to the CROWDLOGGER object.<p>
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

CLI.prototype.User = function(crowdlogger, cli){
    this.history = new this.History(crowdlogger, cli);
    this.realTime = new this.RealTime(crowdlogger, cli);
};

CLI.prototype.User.prototype.History = function(crowdlogger, cli){
    // Private variables.

    // Private function declarations.

    // Public variables.

    // Public function declarations.
    this.getInteractionHistory;

    // Private function definitions.

    // Public function definitions.
    /**
     * Gets all of the user's interaction history.
     *
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{int} callbackID:        The id of the CLRMI function to invoke.
     *                                 This is invoked for the following
     *                                 events (stored in 'event') along with
     *                                 their parameters ('params'):
     *    <ul>
     *        <li>{function} on_chunk:     Invoked per chunk (see below). Chunks
     *                                     are processed asynchronously. Should
     *                                     expect an array of db entries 
     *                                     ('data')and a callback function id
     *                                     ('nextCallbackID').
     *        <li>{function} on_success:   Invoked when everything is read.
     *        <li>{function} on_error:     Invoked if there's an error.
     *    </ul>
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{int} chunk_size:        The size of the chunks to process. E.g.,
     *                                 chunk_size = 50 will cause 50 entries to
     *                                 be read, stored in an array, and then
     *                                 passed to the on_chunk function. If <=0,
     *                                 all entries will be read in before 
     *                                 calling on_chunk. This is approximate
     *                                 because ranges are used and therefore
     *                                 deleted items within that range will not
     *                                 be read (their id's are not reused).
     *                                 Default: 0.
     *    <li>{bool} reverse:          If true, the data will be read in reverse
     *                                 order of id. Default is 'false'.
     *    <li>{int} lower_bound:       The smallest id to retrieve; default: 0
     *    <li>{int} upper_bound:       The largest id to retrieve; default: -1
     *                                 (all ids >= lower_bound are retrieved).
     * @throws Exception if required options are missing.
     */
    this.getInteractionHistory = function(opts){
        // Verify the required options are present.
        if( !opts || !opts.callbackID ){
            throw new Exception('cli.user.history.getInteractionHistory '+
                'requires a callbackID field in the options map.');
            return false;
        }

        // Called when each chunk is ready to be processed.
        var on_chunk = function(data, next){
            // Serves as a wrapper for the 'next' function. The wrapper is
            // what gets registered in the function registry, not 'next'.
            var nextWrapper = function(id){
                // Unregister the nextWrapper callback.
                cli.base.unregisterCallback(id);
                next();
            };

            // Register the callback.
            var nextCallbackID = cli.base.registerCallback(nextWrapper);

            // Call the callback.
            cli.base.invokeCLRMICallback(opts.callbackID, {
                event: 'on_chunk',
                data: data,
                nextCallbackID: nextCallbackID
            });
        }

        // Called when there is an error.
        var on_error = function(error){
            // Call the callback.
            cli.base.invokeCLRMICallback(opts.callbackID, {
                event: 'on_error',
                error: error
            });
        }

        // Called when reading is finished.
        var on_success = function(error){
            // Call the callback.
            cli.base.invokeCLRMICallback(opts.callbackID, {event:'on_success'});
        }

        // Read the log.
        crowdlogger.io.log.read_activity_log({
            on_chunk: on_chunk,
            on_success: on_success,
            on_error: on_error,
            chunk_size: opts.chunk_size,
            reverse: opts.reverse,
            lower_bound: opts.lower_bound,
            upper_bound: opts.upper_bound
        });

        return true;
    };
};

CLI.prototype.User.prototype.RealTime = function(crowdlogger, cli){
    // Private variables.
    var that = this,
        validListeners = [
            'query-entered', 
            'page-loaded',
            'link-clicked',
            'page-focused'
        ];

    // Private function declarations.

    // Public variables.

    // Public function declarations.
    this.addActivityListener;

    // Private function definitions.

    // Public function definitions.

    /**
     * Adds a CLRMI listener to the activity element. Each time an activity
     * event fires, a message is sent to the CLRMI with the event's data.
     *
     * @param {object} opts     A map of options. Only one required option:
     * <ul>
     *    <li>{int} callbackID:     The id of the CLRMI function to invoke on
     *                              activity events.
     * </ul>
     * @throws Exception if required options are missing.
     */
    this.addCLRMIActivityListener = function(opts){
        // Verify the required options are present.
        if( !opts || !opts.callbackID ){
            throw new Exception('cli.user.realTime.addCLRMIActivityListener '+
                'requires a callbackID field in the options map.');
            return false;
        }

        var i, callbackWrapper;

        // Invoked for each event we attach a listener for.
        callbackWrapper = function(event, data){
            cli.base.invokeCLRMICallback(opts.callbackID, {
                eventName: event.type,
                eventData: data
            });
        };

        // Attach each of the listeners.
        for(i =0; i < validListeners.length; i++){
            crowdlogger.messages.on( validListeners[i], callbackWrapper);
        }

        return true;
    }
};