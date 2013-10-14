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

CLI.prototype.Privacy = function(crowdlogger, cli){
    // Private variables.
    var that = this;

    // Public functions.
    this.callbacks;
    this.secretSharing = new this.SecretSharing(crowdlogger, cli, this);

    // Provides several wrappers for common callback functions.
    this.callbacks = {
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


};

CLI.prototype.Privacy.prototype.SecretSharing = 
        function(crowdlogger, cli, privacy) {
    // Private variables.
    var that = this,
        callbacks = privacy.callbacks,
        DEFAULT_ANONYMIZERS = %%ANONYMIZERS%%,
        MAX_BUNDLE_SIZE = 50;



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
     *     <li>{int} callbackID      The id of the CLRMI function to invoke.
     *                               This is invoked for the following events
     *                               (stored in 'event') along with their
     *                               parameters ('params'):
     *        <ul>
     *            <li>{function} on_success:   Invoked when everything is sent.
     *            <li>{function} on_error:     Invoked if there's an error.
     *        </ul>
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
     * </ul>
     */
    this.packAndSendArtifacts = function( opts ) {
        // Checks that all of the required parameters are present.
        crowdlogger.util.check_args(opts, 
            ['artifacts', 'id', 'n',  'k', 'callbackID'], 
            'api.cli.privacy.secretSharing.packAndSendArtifacts', 
            cli.CLIException, true);

        var n, k, jobSalt, jobId, passphrase, url, currentBundle,
            bundleSize, processNextArtifact, bundleCount, serverPubKey,
            on_error = callbacks.on_error(opts.callbackID),
            on_success = callbacks.on_success(opts.callbackID);

        var timeout = 100;

        // Shuffle the artifacts so that they are not in any particular order.
        crowdlogger.util.shuffle( artifacts );

        passphrase = opts.userId || 
            crowdlogger.preferences.get_char_pref( 'pass_phrase', 
                Math.random().toString(36).substring(2) );
        n = opts.n;
        k = opts.k; 
        jobId = opts.jobId;
        // The salt should be job-specific, not user or instance specific.
        // Otherwise, we won't be able to decrypt anything.
        jobSalt = jobId;
        anonymizers = opts.anonymizers || DEFAULT_ANONYMIZERS;
        serverPubKey = opts.serverPubKey || 
            crowdlogger.secret_sharing.PUBLIC_KEY;

        // Stores the current bundle of encrypted artifacts (e-artifacts).
        currentBundle = '';
        bundleSize = 0;

        // Updates the current bundle and uploads it to the server if need be.
        var updateBundle = function( eartifact, count, i, forceUpload ){
            if( eartifact !== null ) {
                // Add the current e-artifact to the bundle.
                for( var j = 0; j < count; j++ ) {
                    currentBundle += eartifact + '\n';
                    bundleSize++;
                }
            }

            // Check if the bundle is too large and needs to be uploaded.
            if( bundleSize >= MAX_BUNDLE_SIZE || forceUpload ) {

                // Get the url of an anonymizer to send this bundle to.
                var url = anonymizers[
                    Math.floor(Math.random(anonymizers.length))];

                crowdlogger.io.network.send_data(
                    url,
                    'eartifacts=' + encodeURIComponent(currentBundle),
                    // On successful transmission.
                    function( response ){
                        // It's safe to reset the current bundle.
                        currentBundle = '';
                        bundleSize = 0;
       
                        // If the eartifact is null, then we we're done processing. 
                        if( eartifact !== null ) {
                            // Process the next one in 10ms. 
                            setTimeout( function(){processNextArtifact( i+1 );},
                                timeout );
                        }
                    },
                    function( error ) {
                        on_error( 'Error communicating with the experiment '+
                                  'server. '+ error );
                    },
                    'POST'
                );
            } else {
                setTimeout( function(){
                    processNextArtifact( i+1 ); },
                 timeout );
            }
        };

        // Processes the artifact at the given index, or ends if i is out of 
        // bounds.
        processNextArtifact = function( i ){
            var encryptWithRSA;

            // If there are no more artifacts left, upload the latest bundle
            // and invoke the callback.
            if( i === artifacts.length ){
                updateBundle( null, 0, 0, true );
                on_success();
                return true;
            }

            var artifact = artifacts[i];

            encryptWithRSA = function( encryptedData ){ 

                var whenEncryptionIsDone = function( eartifact ){
                    var eartifactJSON = JSON.stringify( eartifact );
                    // Update the current bundle and upload it to the server if
                    // need be.
                    setTimeout( function(){
                        updateBundle( eartifactJSON, artifact.count, i, false );
                    }, timeout );
                };

                // USE RSA to encrypt a subset of the data returned above into 
                // a package for the server. The object returned on this line
                // contains: an RSA cipher text and an AES cipher text. The AES
                // cipher text contains: the primary and secondary cipher texts,
                // the users secret share, and the job id.
                crowdlogger.secret_sharing.encrypt_for_server( 
                    encryptedData,
                    serverPubKey,
                    whenEncryptionIsDone );
            };

            // Encrypt it, get it's share, etc.
            // Get the shares and encrypted primary/secondary fields.
            crowdlogger.secret_sharing.generate_shares(
                artifact.primaryData, artifact.secondaryData,
                n, k, jobSalt, jobId, passphrase, function( data ){
                    setTimeout( function(){ encryptWithRSA( data );}, timeout );
                } );


            return true;
        }

        setTimeout( function(){ processNextArtifact( 0 ); }, timeout );
    };

};
