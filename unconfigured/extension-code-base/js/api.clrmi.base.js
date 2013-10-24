/**
 * @fileOverview <p>Provides the base CrowdLogger Remote Modules (CRMs)-side 
 * interface (CRMI) for CRMs.</p>
 *
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

/**
 * Provides the base CrowdLogger Remote Modules (CRMs)-side interface (CRMI) for
 * CRMs. This includes sending messages to the CrowdLogger-side Interface (CLI).
 */
CLRMI.prototype.Base = function(api) { 
    // Private variables.
    var that = this,
        messageHandlers = {
            //alert: function(data){ alert(data.message); }
            
        },
        modules = {},
        useSandbox = false,
        functionMap = {},
        nextFunctionID = 1;
        
    // Private function declarations.
    var init, extractData, onMessage, setExtensionPath, loadCLRM, unloadCLRM, 
        invokeCLRMICallback, invokeCLRMMethod, openLoggingWindow, onShutdown;

    // Public function declarations.
    this.postMessage, this.log, this.invokeCLIFunction;

    // Private function definitions.
    /**
     * Initializes things, including placing listeners to communicate with
     * the CLI.
     */
    init = function(){
        console.log('Initializing CLRMIBaseAPI.\n');

        // Populate the handlers.
        messageHandlers.loadCLRM = loadCLRM;
        messageHandlers.unloadCLRM = unloadCLRM;
        messageHandlers.setExtensionPath = setExtensionPath;
        messageHandlers.invokeCLRMMethod = invokeCLRMMethod;
        messageHandlers.openLoggingWindow = openLoggingWindow;

        jQuery(window).on( 'message', onMessage );

        // Ask CLI for the extension path so we can open CrowdLogger pages.
        that.sendMessage({command:'getExtensionPath'})

        messageHandlers.clrmiCallback = invokeCLRMICallback;

        //jQuery(window).on('beforeunload', onShutdown);
        // window.onbeforeunload = onShutdown;
    };

    /**
     * Extracts data from a message event.
     *
     * @param {DOMEvent} The postMessage event.
     * @return The data passed via postMessage.
     */
    extractData = function(event){ 
        if( event.data ){
            return event.data;
        } else {
            return event.originalEvent.data; 
        }
    };

    /**
     * Called via the CLRMI; At a minimum, the event object must consist of
     * a command field.
     *
     * @param {object} event An event. Should have a data field. Within the data
     *                       object, there must be a command field.
     */
    onMessage = function(event){
        var data = extractData(event);
        // if( !data.from || data.from !== 'CLRMI' ){
        //     //that.log('CLRMI received a message: '+ JSON.stringify(data));
        // }
        //alert('CLRMI received a message: '+ JSON.stringify(data));
        var command = data.command;
        if( data.from === 'CLI' && messageHandlers[command] ){
            setTimeout(function(){messageHandlers[command](data);}, 2);
        }
    };

    /**
     * Unloads all of the CLRMs.
     *
     * @param {DOM Event} event   Ignored.
     */
    onShutdown = function(event){
        alert('Being shut down!');
        api.ui.closeLoggingWindow();
        jQuery(clrmid, function(clrmid, clrm){
            unloadCLRM({clrmid: clrmid, reason: 'shutdown'});
        });
    };

    /**
     * Sets the path of the extension so we can load any local files when
     * necessary. This is called from the CLI, so the path is wrapped up in
     * a data object.
     * 
     * @param {object} data  An object that should contain the key 
     *                       'extensionPath' with a string value.
     */
    setExtensionPath = function(data){
        if( data.extensionPath ){
            api.extensionPath = data.extensionPath;
        }
    }

    /**
     * Loads a CrowdLogger Remote Module. 
     *
     * @param {string} data   Should contain a 'package' field whose value is
     *                        the JavaScript module code to load.
     */
    loadCLRM = function(data){
        that.log('In loadCLRM');
        try{
            var package = JSON.parse(data.package);
            that.log('Finished parsing the clrm...');
            var clrm = new CLRM(package, api.API, that.log);
            that.log('Finished instantiating the clrm...');

            // Wrapping this in a function in case we need to unload an existing
            // version of the module, and therefore need to call load after the
            // unloading has occurred.
            var load = function(){
                that.log('Calling init on the clrm...');

                //modules[clrm.id] = clrm.module;
                modules[package.clrmid] = clrm.module;
                clrm.module.init();

                that.log('Module '+ package.clrmid +' loaded!');
                if( data.callbackID ){
                    that.invokeCLICallback({
                        callbackID: data.callbackID,
                        options: {event: 'on_success'}
                    });
                }
            };

            // Check if it already exists. If so, unload the previous version.
            // if( modules[clrm.id] ){
            if( modules[package.clrmid] ){
                try{
                    that.log('Unloading module '+ package.clrmid);
                    // modules[clrm.id].unload('newversion', load);
                    modules[package.clrmid].unload('newversion', load);
                } catch(e){
                    that.log('There was an error unloading the old module: '+ 
                        e.toString());

                    load();
                }
            } else {
                load();
            }
        } catch(error) {
            if( data.callbackID ){
                that.invokeCLICallback({
                    callbackID: data.callbackID,
                    options: {error: error.toString()}
                });
            }
        }
    };

    /**
     * Unloads a CrowdLogger Remote Module. 
     *
     * @param {string} data  A map of options containing the following fields:
     * REQUIRED:
     * <ul>
     *    <li>{string} clrimd:   The id of the CLRM to unload.
     *    <li>{string} reason:   The reason for unloading; one of: 
     *                            'shutdown' (the extension or browser is 
     *                                shutting down),
     *                            'disable' (the user disabled it), 
     *                            'uninstall' (the user or CL has decided to 
     *                                remove the CLRM altogether),
     *                            'newversion' (making way for a new version)
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{int} callbackID:  The id of the CLI callback to invoke on success
     *                           or error. An error will result in the 'error'
     *                           field of the returned options to be set.
     * </ul>
     */
    unloadCLRM = function(data){
        that.log('In CLRMI.unloadCLRM');
        // Check if we have all the necessary params.
        if( !data || !data.clrmid || !data.reason ){
            if( data.callbackID ){
                that.invokeCLICallback({
                    callbackID: data.callbackID,
                    options: {
                        event: 'on_error', 
                        errorMsg: 'Not enough arguments to '+
                            'clrmi.base.unloadCLRM'
                    }
                });
            }
            return;
        }

        // Invoked when the CLRM has been unloaded.
        var onsuccess = function(){
            that.log(data.clrmid +' success');

            if( data.callbackID ){
                that.invokeCLICallback({
                    callbackID: data.callbackID,
                    options: {event: 'on_success'}
                });
            }
        }

        // Invoked on an error.
        var onerror = function(error){
            that.log(data.clrmid +' error: '+ error);
            if( data.callbackID ){
                that.invokeCLICallback({
                    callbackID: data.callbackID,
                    options: {event: 'on_error', errorMsg: error}
                });
            }
        }        

        var removeDB = function(){
            that.log('Removing DB for '+ data.clrmid);
            if(modules[data.clrmid]){
                delete modules[data.clrmid];
            }
            var storage = new api.Storage(api, data.clrmid, true);
            storage.removeDatabase({
                on_success: onsuccess,
                on_error: onerror
            });
        };

        // Check if the module is loaded.
        try{
            modules[data.clrmid].unload(data.reason, 
                data.reason === 'uninstall' ? removeDB : onsuccess, 
                data.reason === 'uninstall' ? remvoeDB : onerror)
        } catch(e) {
        //if( !modules[data.clrmid] ){
            if( data.reason === 'uninstall' ){
                removeDB();
            } else if( data.callbackID ){
                var options = {};
                if( !modules[data.clrmid] ){
                    onsuccess();
                } else {
                    onerror('[clrmi.base.unloadCLRM] '+ e);
                }
            }
            return;
        }
    };

    /**
     * Invokes a method of a CLRM.
     *
     * @param {object} data  A map of options.
     * REQUIRED:
     * <ul>
     *    <li>{string} clrmid     The id of the CLRM.
     *    <li>{string} method     The name of the method to invoke.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{int} callbackID    The id of a callback to invoke.
     *    <li>{object} opts       A map of parameters to pass to the method.
     * </ul>
     */
    invokeCLRMMethod = function(data){
        var sendErrorMessage = function(msg){
            if( data.callbackID ){
                that.invokeCLICallback({
                    callbackID: data.callbackID,
                    options: {
                        event: 'on_error',
                        errorMsg: msg
                    }
                });
            }
        };

        // Check if we have all the necessary params.
        if( !data || !data.clrmid || !data.method ){
            sendErrorMessage('Not enough arguments to '+
                        'clrmi.base.invokeCLRMMethod');
            return;
        }

        // Check if the CLRM is loaded.
        if( !modules[data.clrmid] ){
            sendErrorMessage('[clrmi.base.invokeCLRMMethod] '+ 
                data.clrmid +' is not currently loaded.');
            return;
        }

        // Check if the method exists.
        if( !modules[data.clrmid][data.method] ){
            sendErrorMessage('[clrmi.base.invokeCLRMMethod] '+
                data.method +' is not a method for '+ data.clrmid +'.');
        }

        // Invoke the function.
        var returnValue = modules[data.clrmid][data.method](data.opts);
        if( data.callbackID ){
            that.invokeCLICallback({
                callbackID: data.callbackID,
                options: {
                    event: 'on_success',
                    data: returnValue
                }
            });
        }
    };

    /**
     * Invokes a CLRMI callback function. Invocations of this should stem from a
     * call to sendMessage from the CLI side. The function will be passed the
     * given parameters in addition to the id of the callback so that the
     * callback can unregister it if needbe.
     *
     * @param {object} params      A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{int} callbackID     The id of the callback to invoke.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{anything} options       The options to send to the function.
     * </ul>
     */
    invokeCLRMICallback = function(params){
        if( !params || params.callbackID === undefined ){
            throw 'clrmi.invokeCLRMICallback requires at least '+
                'a callback field in the parameters map.';
            return false;
        }

        if( !functionMap[params.callbackID] ){
            throw 'clrmi.invokeCLRMICallback cannot find a '+
                'callback function with the id "'+ params.callbackID +'"!';
            return false;
        }

        setTimeout(function(){ 
            functionMap[params.callbackID](params.options, params.callbackID);
        }, 20);

        return true;
    };

    /**
     * Opens a logging window for CLRMs.
     */
    openLoggingWindow = function(message){
        api.ui.openLoggingWindow();
    };

    // Public function definitions.

    /**
     * Sends a message to the CLI.
     */
    this.sendMessage = function(message){
        // console.log('CLRMI sending a message: '+ JSON.stringify(message) +'\n');

        message.from = 'CLRMI';
        parent.postMessage(message, '*');
    };

    /**
     * Logs a message (should spit out in the console).
     * 
     * @param {string} message  The message to log.
     */
    this.log = function(message){
        that.sendMessage({
            command: 'log', 
            message: message
        });
    }

    /**
     * Invokes a CLI function. Since functions can't cross the postMessage
     * divide, the given callback is saved in a map.
     *
     * @param {object} params     A map of parameters:
     * REQUIRED:
     * <ul>
     *    <li>{string} apiName         The name of the CLI API to access.
     *    <li>{string} functionName    The name of the function whtin apiName
     *                                 to invoke.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{anything} options       The options to send to the function.
     *    <li>{function} callback      The function the CLI API should callback.
     * </ul>
     */
    this.invokeCLIFunction = function(params){
        //apiName, functionName, options, callback
        if( !params || !params.apiName || !params.functionName ){ 
            throw 'clrmi.invokeCLIFunction requires at least '+
                'the apiName and functionName fields to be specified in the '+
                'parameter object';
            return false; 
        }
        var callbackID = null;
        var options = params.options || {};

        // Register the callback (if there is one).
        if( params.callback ){
            callbackID = that.registerCallback(params.callback);
        }

        that.sendMessage({
            command: 'cliRequest', 
            apiName: params.apiName,
            functionName: params.functionName,
            options: options,
            callbackID: callbackID
        })

        return callbackID;
    };

    /**
     * Messages the CLI to invoke a callback function.
     *
     * @param {object} params      A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{int} callbackID     The id of the callback to invoke.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{anything} options       The options to send to the function.
     * </ul>
     */
    this.invokeCLICallback = function(params){
        if( !params || params.callbackID === undefined ){
            throw 'clrmi.invokeCLICallback requires at least a '+
                'callback field in the parameters map.';
            return false;
        }

        // Pack up the message.
        var message = {
            callbackID: params.callbackID,
            options: params.options,
            command: 'cliCallback'
        };

        // Send to the CLRMI.
        that.sendMessage(message);

        return true;
    };


    /**
     * Registers a callback. The resulting id can then be sent to the CLRMI
     * via the this.sendMessage.
     *
     * @param {function} callback     The callback to register.
     * @return {int} The callback id assigned to the given callback.
     */
    this.registerCallback = function(callback){
        var callbackID = nextFunctionID++;
        functionMap[callbackID] = callback;
        return callbackID;
    };

    /**
     * If the given callbackID exists in the registry, it is removed.
     *
     * @param {int} callbackID     The id of the function to unregister.
     */
    this.unregisterCallback = function(callbackID){
        if( functionMap[callbackID] ){
            delete functionMap[callbackID];
        }
    };

    init();
};

/**
 * A wrapper for a CLRM. Should be invoked with 'new'.
 *
 * @param {object} clrmPackage   The CLRM Package -- should contain subfields
 *                               such as 'module', 'html', 'js', 'css', and
 *                               'misc'.
 * @param {function} CrowdLoggerAPI  A reference to the CrowdLogger API -- this
 *                                   is how the CLRM will access the CLRMI.
 */
var CLRM = function(clrmPackage, CrowdLoggerAPI, log){
    log('In CLRM, about to run eval...');
    try{
        eval(clrmPackage.module);
    } catch(e) {
        log('Caught error loading package: '+ e);
    }
    log('Finished running eval...');

    // Every module should have a Module function defined.
    this.module = new RemoteModule(
        clrmPackage, new CrowdLoggerAPI(clrmPackage));

    log('Finished instantiating RemoteModule')
    this.id = clrmPackage.metadata.clrmid;

    // Clear it out so no one else has access to it.
    RemoteModule = undefined;
};


