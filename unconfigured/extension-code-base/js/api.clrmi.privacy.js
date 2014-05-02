/**
 * @fileOverview Provides the Privacy API for CrowdLogger remote modules
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

CLRMI.prototype.Privacy = function(api){
    // Private variables.
    var that = this,
        sharedFunctions = {};

    // Public variables.
    this.secretSharing = new this.SecretSharing(api, sharedFunctions);

    /**
     * Serves as a wrapper for callback. Given a set of options (e.g., to one
     * of the public methods below), this function will create and register a
     * callback wrapper that can support on_success and on_error.
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
     * </ul>
     * @return The id of the registered callback.
     */
    sharedFunctions.wrapCallback = function(opts){
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

};

CLRMI.prototype.Privacy.prototype.Encryption = function(api, sharedFunctions){
    // TODO.
};

/**
 * An API for uploading data via anonymized (optional) secret sharing.
 * @param {object} api              The CLRMI API.
 * @param {object} sharedFunctions  A set of functions shared among the Privacy
 *                                  sub-APIs.
 */
CLRMI.prototype.Privacy.prototype.SecretSharing = function(api,sharedFunctions){
    // Private variables.
    var that = this;

    // Public functions.
    // this.packAndSendArtifacts;

    /**
     * Encrypts, bundles, and sends off a list of artifacts to a set of 
     * anonymizers. Shamir's Secret Sharing is the scheme used for encryption.
     *
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{array} artifacts     An array of artifacts. Each artifact has 
     *                               three fields: primaryData, secondaryData,
     *                               and count.
     *     <li>{int} id              An id to attach to the uploaded data; this
     *                               is used to distinguish through different 
     *                               experiments and should not be user 
     *                               specific.
     *     <li>{int} n               The number of possible keys.
     *     <li>{int} k               The number of keys required for decryption.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{array} anonymizers    An array of anonymizers to send the data 
     *                               through. This should be a list of URLs.
     *                               Default: the CrowdLogger anonymizers.
     *    <li>{string} serverPubKey  The server public key to use. Default: use
     *                               the CrowdLogger server's pub key.
     *    <li>{string} userId        An id for this user, preferably unique and
     *                               constant across all of a user's instances.
     *                               Default: pass_phrase preference, if set, or
     *                               a random string.
     *    <li>{function} on_success  Invoked when everything is sent.
     *    <li>{function} on_error    Invoked if there's an error.
     * </ul>
     */
    this.packAndSendArtifacts = function(opts){
        // This will throw an exception if there are missing arguments.
        api.util.checkArgs(opts, ['artifacts','method'], 
            'clrmi.privacy.secretSharing');

        // Pass the data one to the CLI.
        api.base.invokeCLIFunction({
            apiName: 'privacy.secretSharing',
            functionName: 'packAndSendArtifacts',
            options: {
                callbackID: sharedFunctions.wrapCallback(opts),
                artifacts: opts.artifacts,
                id: opts.id,
                n: opts.n,
                k: opts.k,
                anonymizers: opts.anonymizers,
                userId: opts.userId,
                serverPubKey: opts.serverPubKey
            }
        });
    };
};

CLRMI.prototype.Privacy.prototype.Anonymization = function(api,sharedFunctions){
    // TODO
};

