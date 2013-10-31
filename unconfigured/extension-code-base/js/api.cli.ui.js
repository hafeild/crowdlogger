/**
 * @fileOverview Provides the UI API for CrowdLogger remote modules
 * (CLRMs). 
 *
 * %%LICENSE%%
 * 
 * @author hfeild
 * 
 * @version %%VERSION%%
 */
CLI.prototype.UserInterface = function(crowdlogger, cli){
    // Private variables.
    var that = this;

    // Private function declarations.
    var init;

    // Public variables.
    this.contentScripts = new this.ContentScripts(crowdlogger, cli);
    
    // Public function declarations.
    this.setMessageFlag;
    this.injectContentScript;
    this.openLoggingWindow;
     
    // Private function definitions.
    init = function(){
        if( crowdlogger.version.info.is_chrome ){
            // This ensures that new popup windows are focused on creation.
            chrome.windows.onCreated.addListener(function(win) { 
                chrome.windows.update(win.id, {focused: true});  
            });
        }
    };

    // Public function definitions.

    /**
     * Sets the 'extension updates' notification.
     */
    this.setMessageFlag = function(){
        crowdlogger.notifications.set_notification('study_updates');
    };

    /**
     * Opens a logging window so CLRMs can log to it.
     */
    this.openLoggingWindow = function(){
        cli.base.sendMessage({
            command: "openLoggingWindow"
        });
    };

    init();
}


CLI.prototype.UserInterface.prototype.ContentScripts =function(crowdlogger,cli){
    // Private variables.
    var that = this,
        callbacks;

    // Public function declarations.
    this.registerContentScript;
    this.unregisterContentScript;

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
        // Called when there is an message.
        on_message: function(callbackID){ 
            return function(msg, callback2){
                var callbackID2 = null;
                if( callback2 ){
                    callbackID2 = cli.base.registerCallback(function(message){
                        cli.base.unregisterCallback(callbackID2);
                        callback2(message);
                    });
                }
                // Call the callback.
                cli.base.invokeCLRMICallback({
                    callbackID: callbackID, 
                    options: {
                        event: 'on_message',
                        message: msg,
                        callbackID: callbackID2
                    }
                });
            };
        },
        // Called a content script has been successfully registered.
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
     * Registers a content script to be injected into every page. Any existing 
     * content script for this CLRM module will be overwritten. If older content
     * scripts exist and there are open pages, they will be deactivated; 
     * however, the new script will not be added to already opened pages.
     *
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{string} clrmid       The id of the CLRM module.
     *     <li>{string} script       The script to inject.
     *     <li>{int} callbackID      The id of the CLRMI function to invoke.
     *                               This is invoked for the following events
     *                               (stored in 'event') along with their
     *                               parameters ('params'):
     *        <ul>
     *            <li>{function} on_message:   Invoked when the content script
     *                                         sends a message via 
     *                                         <code>sendMessage</code>.
     *            <li>{function} on_success:   Invoked when the content script
     *                                         has been registered.
     *            <li>{function} on_error:     Invoked if there's an error.
     *        </ul>
     * </ul>
     */
    this.registerContentScript = function(opts) {
        // Checks that all of the required parameters are present.
        crowdlogger.util.check_args(opts, 
            ['clrmid', 'script', 'callbackID'], 
            'api.cli.ui.contentScripts.registerContentScript', 
            cli.CLIException, true);

        var version = 1,
            scripts = crowdlogger.logging.event_listeners.clrm_script_details;
        if( scripts[opts.clrmid] ){
            version = scripts[opts.clrmid].version + 1;
        }

        // Add the content script.
        scripts[opts.clrmid] = {
            id: opts.clrmid,
            script: opts.script,
            version: version,
            on_message: callbacks.on_message(opts.callbackID)
        };

        // Let the caller know the script was registered successfully.
        callbacks.on_success(opts.callbackID)();
    };

    /**
     * Un-registers a content script. Any copies of the script injected into
     * currently open pages will no longer be able to send messages (though
     * they will continue to operate on those pages).
     *
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{string} clrmid       The id of the CLRM module.
     *     <li>{int} callbackID      The id of the CLRMI function to invoke.
     *                               This is invoked for the following events
     *                               (stored in 'event') along with their
     *                               parameters ('params'):
     *        <ul>
     *            <li>{function} on_success:   Invoked when the content script
     *                                         has been registered.
     *            <li>{function} on_error:     Invoked if there's an error.
     *        </ul>
     * </ul>
     */
    this.unregisterContentScript = function(opts) {
        // Checks that all of the required parameters are present.
        crowdlogger.util.check_args(opts, 
            ['clrmid', 'callbackID'], 
            'api.cli.ui.contentScripts.unregisterContentScript', 
            cli.CLIException, true);

        var version = 1,
            scripts = crowdlogger.logging.event_listeners.clrm_script_details;
        if( scripts[opts.clrmid] ){
            version = scripts[opts.clrmid].version + 1;
        }

        // Remove the content script.
        scripts[opts.clrmid] = {
            id: opts.clrmid,
            script: undefined,
            version: version,
            on_message: undefined
        };

        // Let the caller know the script was unregistered successfully.
        callbacks.on_success(opts.callbackID)();
    };
};