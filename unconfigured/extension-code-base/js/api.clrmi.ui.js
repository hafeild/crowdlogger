/**
 * @fileOverview <p>Provides the UI API for the CrowdLogger Remote Modules 
 * (CRMs)-side interface (CRMI).</p>
 *
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

/**
 * Provides the UI API for the CrowdLogger Remote Modules (CRMs)-side interface 
 * (CRMI).
 */
CLRMI.prototype.UserInterface = function(api, clrmid){
    // Private variables.
    var defaultWindowOptions = {
            url: '',
            name: '',
            specs: ''
        },
        that = this,
        ioService,
        faviconService,
        loggingWindow;

    // Private functions.
    var copyDefaults, onMessage, appendScript, init, extractData;

    // Public variables.
    this.contentScripts = new this.ContentScripts(api, clrmid);

    // Public functions.
    // this.openWindow; 
    // this.dereferenceModuleResources;
    // this.getFaviconURL;
    // this.setMessageFlag; 
    // this.log; 
    // this.openLoggingWindow;
    // this.closeLoggingWindow;


    // Private function definitions.

    init = function(){
        try{
            ioService = Components.classes["@mozilla.org/network/io-service;1"].
                getService(Components.interfaces.nsIIOService);
            faviconService = Components.classes[
                "@mozilla.org/browser/favicon-service;1"].
                 getService(Components.interfaces.nsIFaviconService);
        } catch(e) {}
    }

    copyDefaults = function(obj, defaults){
        var x, objWithDefaults = {};
        for(x in defaults){
            objWithDefaults[x] =  (x in obj) ? obj[x] : defaults[x];
        }
        for(x in obj){
            if( !(x in objWithDefaults) ){
                objWithDefaults[x] = obj[x];
            }
        }
        return objWithDefaults;
    };

    extractData = function(event){ 
        if( event.data ){
            return event.data;
        } else {
            return event.originalEvent.data; 
        }
    };

    onMessage = function(event){
        var data = extractData(event);

        if( data.triggerElm && data.eventName ) {
            try{
                jQuery(data.triggerElm).trigger(
                    data.eventName, event.target, data)
            } catch(e){
                api.base.log(
                    'jQuery could not trigger event '+ 
                    data.eventName +': '+ e);
            }
        }
    }

    appendScript = function(doc, head, scriptElm){
        doc.defaultView.eval(scriptElm.innerHTML);
        // var newScriptElm = doc.createElement('script');
        // newScriptElm.type = "text/javascript";
        // newScriptElm.src = scriptElm.src;
        // newScriptElm.innerHTML = scriptElm.innerHTML;
        // head.appendChild(newScriptElm);
    };

    // Public function definitions.
    // this.alert = function(message){
    //     api.base.sendMessage({command: 'alert', message: message});
    // };

    /**
     * Opens a new window and returns a reference to it.
     *
     * @param {object} options    A map of options. The following are supported:
     * <ul>
     *     <li>{string} content      The HTML to go inside. 
     *     <li>{object} resources    If 'contents' is set, then all CLRM 
     *                               resource placeholders will be replaced
     *                               using this map.
     *     <li>{string} url          The URL to load (overrides contents). If
     *                               neither contents nor url are provided,
     *                               an about:blank page is opened.
     *     <li>{string} name         The name of the window to open.
     *     <li>{string} specs        The window.open specs. See 
     *                           http://www.w3schools.com/jsref/met_win_open.asp
     *                               for more information.
     *     <li>{object} specsMap     A map of specs. This is serialized into the
     *                               format "key1=value1,key2=value2,...". The
     *                               keys should be the same as those specified
     *                               in the specs string.
     *     <li>{function} callback   Invoked when the window has been created.
     * </ul>
     * @return A reference to the window.
     */
    this.openWindow = function(options){
        var opts, win;
        if( defaultWindowOptions.url === '' ){
            defaultWindowOptions.url = api.extensionPath +'blank.html';
        }

        opts = copyDefaults(options, defaultWindowOptions);

        if( opts.specsMap ){
            var key, specs = [];
            for( key in opts.specsMap ){
                specs.push(key+'='+opts.specsMap[key]);
            }
            opts.specs = specs.join(',');
        }

        win = window.open(opts.url, opts.name, opts.specs);

        if( opts.content && opts.url === defaultWindowOptions.url ){
            if( opts.resources ){
                opts.content = that.dereferenceModuleResources(
                    opts.content, opts.resources);
            }
            try{
                // Chrome allows this, but FF does not.
                win.document.open();
                win.document.write(opts.content);
                win.document.close();
                if(opts.callback){ opts.callback(win) };
            } catch(err) {
                // win.location.href = 'data:text/html;charset=UTF-8,'+ 
                //     encodeURIComponent(opts.content);

                api.base.log('win.document.write did not work: '+ err);

                // Updates the document, if it's loaded, with the new content.
                // Otherwise, waits a bit and then tries again.
                var updateDoc = function(){
                    api.base.log('in readyState: '+ 
                        win.document.readyState);
                    if( win.document.readyState === "complete" ){
                        var doc = (new DOMParser).parseFromString(
                            opts.content, "text/html");
                        api.base.log('Body: '+ doc.body.innerHTML);

                        // Copy the new HTML document into the frame
                        var destDocument = win.document;
                        var srcNode = doc.documentElement;
                        var newNode = destDocument.importNode(srcNode, true);

                        destDocument.replaceChild(newNode, 
                            destDocument.documentElement);

                        var scripts = doc.getElementsByTagName('script');
                        var i;
                        var destHead = 
                            destDocument.getElementsByTagName('head')[0];
                        for( i = 0; i < scripts.length; i++ ){
                            appendScript(destDocument, destHead, scripts[i]);
                        }
                        api.base.log('doc.write appears to have worked!!');
                        if( opts.callback ){ opts.callback(win); }
                    } else {
                        setTimeout(updateDoc, 20);
                    }
                }

                updateDoc();
            }
        } else if(opts.callback) {
            opts.callback(win);
        }
    }

    /**
     * Replaces instances of ::CLRMCSS:<name>, ::CLRMJS:<name>, and
     * ::CLRMMISC:<name> with the corresponding resources (if found) in
     * resources.
     *
     * @param {string} source      The string in which to insert the resources.
     * @param {object} resources   A map of resources. This is the same as
     *                             a CLRM Package. Should have at minimum
     *                             js, misc, and css keys.
     * @return {string} The source with the dereferenced CSS in style tags,
     *                  JavaScript in script tags, and misc tags replaced
     *                  verbatim.
     */
    this.dereferenceModuleResources = function( source, resources ){
        return source.replace(/::CLRM([^:]*):([^\s]*)(\s)/g, 
        function(m, type, name, boundary){
            var derefed = '';
            try{
                switch( type ){
                    case 'CSS':
                        derefed = '<style>'+ resources.css[name] +'</style>';
                        break;
                    case 'JS':
                        derefed = '<script>\n<!--\n'+ resources.js[name] +
                                  '\n-->\n</script>';
                        break;
                    case 'MISC':
                        derefed = resources.misc[name];
                        break;
                }
            } catch(e) { }
            return derefed + boundary;
        });
    };

    /**
     * Gets the URL of the favicon associated with the given page URL. The URL
     * of the default favicon will be returned if no favicon is found. The
     * generated URL comes from the web service http://g.etfv.co/.
     *
     * @param {string} url  The URL of the page to get the favicon for.
     * @param {boolean} shorten  Default: true; uses just the domain of the URL.
     * @return The URL of the favicon associated with the given URL.
     */
    this.getFaviconURL = function(url, shorten){
        shorten = shorten === undefined || shorten;

        if( shorten ){
            url = url.match('[^/]*/[^/]*/[^/]*')[0];
        }

        // if( faviconService ){
        //     return faviconService.getFaviconImageForPage(
        //         ioService.newURI(url, null, null)).spec;
        // } else {
        //     return 'chrome://favicon/'+ url;
        // }
        return 'http://g.etfv.co/'+ url;
    };

    /**
     * Sets the 'extension updates' notification.
     */
    this.setMessageFlag = function(){
        api.base.invokeCLIFunction({
            apiName: 'ui',
            functionName: 'setMessageFlag'
        });
    };

    /**
     * Logs a message to the logging window's console, if it's open.
     *
     * @param {anything} msg The thing to log.
     */
    this.log = function(msg){
        if( loggingWindow && loggingWindow.console ){
            loggingWindow.console.log(msg);
        }
    };

    /**
     * Opens a logging window.
     */
    this.openLoggingWindow = function(){
        if( loggingWindow && !loggingWindow.closed ){
            loggingWindow.focus();
        } else {
            loggingWindow = window.open('about:blank', 'loggingwindow', 
                'width=800,height=300');
        }
    };

    /**
     * Closes the logging window.
     */
    this.closeLoggingWindow = function(){
        if( loggingWindow && !loggingWindow.closed ){
            loggingWindow.close();
        }
    };
};


CLRMI.prototype.UserInterface.prototype.ContentScripts = function(api, clrmid){
    // Private variables.
    var that = this;

    // Private functions.
    var wrapCallback;

    // Public functions.
    // this.registerContentScript;
    // this.unregisterContentScript;

    // Private function definitions.

    /**
     * Serves as a wrapper for callback. Given a set of options (e.g., to one
     * of the public methods below), this function will create and register a
     * callback wrapper that can support on_success and on_error.
     *
     * @param {object} opts  A map of options.
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_message  Called if the event field of the object
     *                               passed to the callback is 'on_message'.
     *                               The value of the 'message' field will be
     *                               passed to this function.
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
    wrapCallback = function(opts){
        var callbackID;
        var callback = function(params){
            if( params.event === 'on_error' && opts.on_error ){
                opts.on_error(params.error);
            } else if( params.event === 'on_message' && opts.on_message ) {
                var callback2 = params.callbackID ? function(data){
                    api.base.invokeCLICallback({
                        callbackID: params.callbackID,
                        options: data
                    });
                } : undefined;
                opts.on_message(params.message, callback2);
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
     * Registers a content script to be injected into every page. Any existing 
     * content script for this CLRM module will be overwritten. If older content
     * scripts exist and there are open pages, they will be deactivated; 
     * however, the new script will not be added to already opened pages.
     *
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{string} script       The script to inject.
     * </ul>
     * OPTIONAL:
     * <ul>
     *     <li>{function} on_message:   Invoked when the content script
     *                                  sends a message via 
     *                                  <code>sendMessage</code>.
     *     <li>{function} on_success:   Invoked when the content script
     *                                  has been registered.
     *     <li>{function} on_error:     Invoked if there's an error.
     * </ul>
     */
    this.registerContentScript = function(opts) {
        // Checks that all of the required parameters are present.
        // This will throw an exception if there are missing arguments.
        api.util.checkArgs(opts, ['script'], 
            'clrmi.ui.contentScripts.registerContentScript');


        // Pass the data one to the CLI.
        api.base.invokeCLIFunction({
            apiName: 'ui.contentScripts',
            functionName: 'registerContentScript',
            options: {
                callbackID: wrapCallback(opts),
                clrmid: clrmid,
                script: opts.script
            }
        });
    };

    /**
     * Un-registers a content script. Any copies of the script injected into
     * currently open pages will no longer be able to send messages (though
     * they will continue to operate on those pages).
     *
     * @param {object} opts     A map of options:
     * OPTIONAL:
     * <ul>
     *     <li>{function} on_success:   Invoked when the content script
     *                                  has been registered.
     *     <li>{function} on_error:     Invoked if there's an error.
     * </ul>
     */
    this.unregisterContentScript = function(opts) {
        // Pass the data one to the CLI.
        api.base.invokeCLIFunction({
            apiName: 'ui.contentScripts',
            functionName: 'unregisterContentScript',
            options: {
                callbackID: wrapCallback(opts),
                clrmid: clrmid
            }
        });
    };
};