/**
 * @fileOverview Provides the Storage API for CrowdLogger remote modules
 * (CLRMs). There are two parts -- the CrowdLogger-side interface (CLI) and
 * the sandbox- side interface (SBI). CRMs communicate with the SBI, which in
 * turn communicates with the CLI, which has access to the CROWDLOGGER
 * object.
 *
 * %%COPYRIGHT%%
 * 
 * @author hfeild
 * 
 * @version %%VERSION%%
 */

CLI.prototype.Storage = function(crowdlogger, cli){
    // Private variables.
    
    // Private function declarations.
    var upgraded;

    // Public variables.
    
    // Public function declarations.
     
    // Private function definitions.

    upgradeDB =
    
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
     *        <ul>
     *            <li>{function} on_success:   Invoked when everything is read.
     *            <li>{function} on_error:     Invoked if there's an error.
     *        </ul>
     *    <li>{string} dbName          The name of the database to open.
     *    <li>{string} storeName       The name of the store to work with.
     * </ul>
     * @throws Exception if required options are missing.
     */
    this.storeOps = function(opts){
        if( !opts || !opts.callbackID || !opts.dbName || !opts.storeName){
            throw 'api.cli.storage.storeOps is missing required parameters.';
            return false;
        }


    };
};
