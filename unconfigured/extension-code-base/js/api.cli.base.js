/**
 * @fileOverview Provides the base CrowdLogger-side interface (CLI) for 
 * CrowdLogger remote modules (CRMs).<p>
 * 
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

/**
 * Provides the base CrowdLogger-side interface (CLI) for CrowdLogger remote 
 * modules (CLRMs). This includes sending and receiving messages from the
 * CLRM interface (CLRMI) and redirecting them accordingly.
 *
 * @param {object} crowdloger The CrowdLogger object.
 */
CLI.prototype.Base = function(crowdlogger, cli){
    // Private variables.
    var that = this,
        initAttempts = 0,
        clrmi,
        messageHandlers = {
            // ui: crowdlogger.api.cli.ui.handleMessage,
            // user: crowdlogger.api.cli.user.handleMessage
            alert: function(data){ alert(data.message); },
            log: function(data){ crowdlogger.debug.log(data.message+'\n');},
            getExtensionPath: function(data){that.sendMessage({
                command: 'setExtensionPath', 
                extensionPath: crowdlogger.version.info.
                    get_extension_html_prefix()
            })}
        },
        nextFunctionID = 1,
        functionMap = {};

    const MAX_INIT_ATTEMPTS = 100;

    // Private function declarations.
    var onMessage, init, extractData, invokeCLIFunction, invokeCLICallback;

    // Public function declarations.
    this.loadCLRM, this.unloadCLRM, this.sendMessage, this.registerCallback, 
    this.unregisterCallback, this.invokeCLRMICallback, 
    this.simpleCallbackWrapper; 


    // Private function definitions.
    /**
     * Initializes everything, including creating a space for the CLRMI
     * that is, more or less, separated from the rest of the CrowdLogger code.
     * Note that for Chrome, this separation is real---it's not possible for
     * code in the CLRMI to interact directly with CrowdLogger code or any
     * Chrome APIs. For Firefox, extension-level APIs are still available,
     * it has to go through the Components window business to access CrowdLogger
     * (this is undesirable, but we haven't figured out how to reduce the
     * privileges of the page -- a bootstrap based alternative might be the
     * right approach...).
     */
    init = function(){
        crowdlogger.debug.log('In init\n');

        var path = crowdlogger.version.info.get_extension_prefix();


        if( crowdlogger.version.info.is_firefox ){
            // var hiddenWindow = Components.classes[
            //     '@mozilla.org/appshell/appShellService;1'].
            //      getService(Components.interfaces.nsIAppShellService).
            //      hiddenDOMWindow;
            // var frame = hiddenWindow.document.getElementById('clrm');

            var clrm_url = 
                    crowdlogger.version.info.get_extension_html_prefix()+
                    'clrm.html';
            crowdlogger.jq('#clrm').remove();
            var frame = crowdlogger.jq('<iframe>');
            frame.attr('id', 'clrm').attr('src', clrm_url).attr('type', 
                'content');
            frame.appendTo('body');

            crowdlogger.jq(window).bind('message', onMessage);
            clrmi = frame[0].contentWindow;


        } else {
            var clrm_url = 'data:text/html,'+encodeURIComponent(
                '<html>'+
                '<head>'+
                '<!-- Load jQuery first. -->'+
                '<script src="'+path+'js/external_lib/jquery.min.js"></script>'+
                '<!-- Load the API files. -->'+
                '<script src="'+path+'js/api.clrmi.init.js"></script>'+
                '<script src="'+path+'js/api.clrmi.base.js"></script>'+
                '<script src="'+path+'js/api.clrmi.user.js"></script>'+
                '<script src="'+path+'js/api.clrmi.ui.js"></script>'+
                '<script src="'+path+'js/api.clrmi.util.js"></script>'+
                '<script src="'+path+'js/api.clrmi.storage.js"></script>'+
                '<!-- Gives us the api variable. -->'+
                '<script src="'+path+'html-js/clrm.js"></script>'+
                '</head>'+
                '<body>'+
                '</body>'+
                '</html>');
            crowdlogger.jq('#clrm').attr('src', clrm_url);

            clrmi = crowdlogger.jq('#clrm')[0].contentWindow;
            crowdlogger.jq(window).bind( 'message', onMessage );
        }

        messageHandlers.cliRequest = invokeCLIFunction;
        messageHandlers.cliCallback = invokeCLICallback;
        setTimeout(crowdlogger.clrm.loadAllEnabledCLRMs, 2000);
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
     * @param {object} event An event. In chrome, should have an originalEvent
     *                       object with a data field. Within the data
     *                       object, there must be a command field. In Firefox,
     *                       event must be the data object.
     */
    onMessage = function(event){
        var data = extractData(event);
        var command = data.command;

        // crowdlogger.debug.log('CLI received a message: '+ 
        //     JSON.stringify(data) +"\n");

        if( data.from === 'CLRMI' && messageHandlers[command] ){
            console.log('Received message from CLRMI: '+ JSON.stringify(data));
            setTimeout( function(){messageHandlers[command](data)}, 2 );
        }
    };

    /**
     * Invokes a CLI function. 
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
     *    <li>{int} callbackID         The id of the function the CLI API should
     *                                 callback.
     * </ul>
     */
    invokeCLIFunction = function(params){
        if( !params || !params.apiName || !params.functionName ){
            throw 'cli.invokeCLIFunction requires at least the '+
                'apiName and functionName fields to be specified in the '+
                'parameter object';
            return false; 
        }

        var throwInvalid = function(){
            throw 'Invalid apiName/functionName parameter to '+
                'cli.invokeCLIFunction: '+ params.apiName +'.'+ 
                params.functionName;
            return false;
        }

        var apiNameParts = params.apiName.split(/\./), func = cli, i;

        console.log('Attempting to invoke: '+ params.apiName +'.'+
            params.functionName +' in CLI.');

        // Check that the apiName starts off valid.
        if( apiNameParts.length === 0 || apiNameParts[0] === 'base' ){
            throwInvalid();
        }

        // Assemble the object chain leading up to the function.
        for(i = 0; i < apiNameParts.length; i++){
            console.log('Checking for existence of ['+ apiNameParts[i] +']');
            if( func[apiNameParts[i]] ){
                func = func[apiNameParts[i]];
            } else {
                throwInvalid();
            }
        }

        // Invoke the function, if it exists.
        if( func[params.functionName] ){
            setTimeout(function(){
                if( params.options.callbackID === undefined ){
                    params.options.callbackID = params.callbackID;
                }
                func[params.functionName](params.options);
            }, 25)
        } else {
            throwInvalid();
        }

        return true;
    };

    /**
     * Invokes a CLI callback function. Invocations of this should stem from a
     * call to sendMessage from the CLRMI side. The function will be passed the
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
    invokeCLICallback = function(params){
        if( !params || params.callbackID === undefined ){
            throw 'cli.invokeCLICallback requires at least '+
                'a callback field in the parameters map.';
            return false;
        }

        if( !functionMap[params.callbackID] ){
            throw 'cli.invokeCLICallback cannot find a callback '+
                'function with the id "'+ params.callbackID +'"!';
            return false;
        }

        setTimeout(function(){ 
            functionMap[params.callbackID](params.options, params.callbackID);
        }, 20);

        return true;
    };

    // Public function definitions.

    this.simpleCallbackWrapper = function(onsuccess, onerror){
        var callback = function(opts, callbackID){
            if( opts.event === 'on_error' && onerror ){
                onerror(opts.error);
            } else if( opts.event === 'on_success' && onsuccess ) {
                onsuccess();
            }

            that.unregisterCallback(callbackID);
        };
        return that.registerCallback(callback);
    };

    /**
     * Loads a CrowdLogger Remote Module. This can be from a URL or a string.
     *
     * @param {object} options  A map of options. Currently supported options
     *                          include:
     * <ul>
     *     <li>urls {array of strings}      One or more URLs of scripts to load.
     *     <li>packages  {array of strings} One or more package strings to load.
     * </ul>
     */
    this.loadCLRMs = function(options){
        var i;
        options.urls = options.urls || [];
        for(i = 0; i < options.urls.length; i++){
            that.loadCLRMFromURL(options.urls[i]);
        }

        options.packages = options.packages || [];
        for(i = 0; i < options.packages.length; i++){
            that.loadCLRMFromString(options.packages[i]);
        }
    };

    /**
     * Downloads the CLRM Package at the given URL and loads it.
     * 
     * @param {string} url     The URL of a CLRM Package to download.
     */
    this.loadCLRMFromURL = function(url){
        CROWDLOGGER.io.network.send_get_data(url, null,
            function(response){ 
                // CROWDLOGGER.debug.log('Heard back: '+ response); 
                that.loadCLRMFromString(response);
            }, function(e){}
        );
    };

    /**
     * Loads a CLRM Package from a string.
     *
     * @param {string} package     The CLRM Package as serialized JSON.
     */
    this.loadCLRMFromString = function(package, onsuccess, onerror){
        that.sendMessage({
            command: 'loadCLRM', 
            package: package,
            callbackID: that.simpleCallbackWrapper(onsuccess, onerror)
        });
    };

    /**
     * Unloads a CLRM Package by id.
     *
     * @param {string} package     The CLRM Package as serialized JSON.
     */
    this.unloadCLRM = function(clrmid, reason, onsuccess, onerror){
        that.sendMessage({
            command: 'unloadCLRM', 
            clrmid: clrmid, 
            reason: reason,
            callbackID: that.simpleCallbackWrapper(onsuccess, onerror)
        });
    };

    /**
     * Invokes a public method of the given (loaded) CLRM. 
     *
     * @param {object} params  A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} clrmid   The id of the CLRM whose method will be invoked.
     *    <li>{string} method   The name of the method to invoke.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{object} opts     A map of options to pass to the method.
     *    <li>{function} on_success Invoked on success, including any associated
     *                          data (e.g., the return value of a getter).
     *    <li>{function} on_error   Invoked on error.
     * </ul>
     */
    this.invokeCLRMMethod = function(params){
        if( !params || !params.clrmid || !params.method ){
            throw 'cli.invokeCLRMMethod requires at least a '+
                'clrmid and method field in the parameters map.';
            return false;
        }

        that.sendMessage({
            command: 'invokeCLRMMethod', 
            clrmid: params.clrmid, 
            method: params.method,
            opts: params.opts,
            callbackID: that.simpleCallbackWrapper(
                params.on_success ,params.on_error )
        });
    }

    /**
     * Sends a message to the CLRMI.
     */
    this.sendMessage = function(message){
        // crowdlogger.debug.log('CLI sending a message: '+
        //     JSON.stringify(message) +'\n');
        if( clrmi ){
            message.from = 'CLI';
            clrmi.postMessage(message, '*');
        }
    };

    /**
     * Messages the CLRMI to invokes a callback function.
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
    this.invokeCLRMICallback = function(params){
        if( !params || params.callbackID === undefined ){
            throw 'cli.invokeCLRMICallback requires at least a '+
                'callback field in the parameters map.';
            return false;
        }

        // Pack up the message.
        var message = {
            callbackID: params.callbackID,
            options: params.options,
            command: 'clrmiCallback'
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
        crowdlogger.debug.log('Callback ID ['+ callbackID +'] given to: '+
            callback);
        return callbackID;
    };

    /**
     * If the given callbackID exists in the registry, it is removed.
     *
     * @param {int} callbackID     The id of the function to unregister.
     */
    this.unregisterCallback = function(callbackID){
        if( functionMap[callbackID] ){
            crowdlogger.debug.log('Unregistering Callback ID ['+callbackID+']');
            delete functionMap[callbackID];
        }
    };

    init();
};