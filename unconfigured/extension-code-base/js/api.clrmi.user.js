/**
 * @fileOverview <p>Provides the user API for the CrowdLogger Remote Modules 
 * ( CRMs )-side interface ( CRMI ).</p>
 *
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

/**
 * Provides the user API for the CrowdLogger Remote Modules ( CRMs )-side  
 * interface ( CRMI ).
 */
var CLRMIUserAPI = function( api ){
    // Private variables.
    var that = this;

    // Private function declarations.
    var init;

    // Public variables.
    this.history, this.realTime;

    // Public function declarations.

    // Private function definitions.
    init = function(){
        that.history = new that.History( api );
        that.realTime = new that.RealTime( api );
        return that;
    }

    // Public function definitions.

    init();
};


CLRMIUserAPI.prototype.History = function( api ){
    // Private variables.
    var that = this;

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
     *    <li>{Function} on_chunk:     Invoked per chunk (see below). Chunks
     *                                 are processed asynchronously.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{Function} on_success:   Invoked when everything has been read.
     *    <li>{Function} on_error:     Invoked if there's an error.
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
     * @throws Exception if on_chunk is not specified.
     */
    this.getInteractionHistory = function( opts ){
        // Check that the mandatory options are present.
        if( !opts || !opts.on_chunk ){
            throw new Exception('clrmi.user.history.getInteractionHistory '+
                'requires an on_chunk option.');
            return false;
        }

        var callbackID;

        // Handles on_chunk, on_success, and on_error events from the CLI.
        var callback = function(params){
            if( params.event === 'on_chunk' ){
                var next = function(){
                    api.base.invokeCLICallback(params.nextCallbackID);
                };
                opts.on_chunk(data, next);
            } else {
                if( params.event === 'on_error' && opts.on_error ){
                    opts.on_error(params.error);
                } else {
                    opts.on_success();
                }
                api.base.unregisterCallback(callbackID);
            }
        };

        // Register the callback.
        callbackID = api.base.registerCallback(callback);

        return api.base.invokeCLIFunction({
            apiName: 'api.user.history',
            functionName: 'getInteractionHistory',
            options: {
                callbackID: callbackID,
                chunk_size: opts.chunk_size,
                reverse: opts.reverse,
                lower_bound: opts.lower_bound,
                upper_bound: opts.upper_bound
            }
        });
    };

};


CLRMIUserAPI.prototype.RealTime = function( api ){
    // Private variables.
    var that = this,
        validListeners = [
            'query-entered', 
            'page-loaded',
            'link-clicked',
            'page-focused'
        ],
        activityElm;


    // Private function declarations.
    var init, triggerActivityEvent;

    // Public variables.

    // Public function declarations.
    this.addActivityListeners, this.removeActivityListeners;

    // Private function definitions.

    /**
     * Creates a DOM element to which activity listeners can be attached.
     * Sets up a listener via the CLI that will send a message over to the
     * CLRMI side, where the event is triggered on the activity element.
     */
    init = function(){
        // Create an element to dispatch log events.
        activityElm = jQuery('<div id="clrmi-user-activity">');

        // Make a channel through which the CLI can let us know when 
        // activity events fire.
        api.base.invokeCLIFunction({
            apiName: 'api.user.realTime',
            functionName: 'addCLRMIActivityListener',
            callback: triggerActivityEvent
        });
    };

    /**
     * Expected to be invoked via a callback from the CLI. Triggers an event
     * on the activity element.
     *
     * @param {object} data     Data about the activity event. Should include
     *                          eventName and eventData fields.
     * @param {int} callbackID  (Unused) The id of the callback function.
     */
    triggerActivityEvent = function(data, callbackID){
        activityElm.trigger( data.eventName, data.eventData );
    };

    // Public function definitions.

    /**
     * Adds listeners for log events, e.g., searches, clicks, page loads, etc.
     *
     * @param {object} opts     A map of events to callbacks. Valid events are:
     * <ul>
     *     <li>query-entered 
     *     <li>page-loaded
     *     <li>link-clicked
     *     <li>page-focused
     * </ul>
     *                          The callbacks should expect two arguments:
     *                          the first is the event (ignore this) and the
     *                          second is the data for the event. This is a
     *                          search, click, page load, or page focus object
     *                          containing the same data that is logged.
     */
    this.addActivityListeners = function(opts){
        opts = opts || {};
        var i;
        for( i = 0; i < validListeners.length; i++ ){
            if( opts[validListeners[i]] ){
                activityElm.on(validListeners[i], opts[validListeners[i]]);
            }
        }
    };

    init();
};