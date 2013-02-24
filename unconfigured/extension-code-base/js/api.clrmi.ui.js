/**
 * @fileOverview <p>Provides the UI API for the CrowdLogger Remote Modules 
 * (CRMs)-side interface (CRMI).</p>
 *
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

/**
 * Provides the UI API for the CrowdLogger Remote Modules (CRMs)-side interface 
 * (CRMI).
 */
var CLRMIUserInterfaceAPI = function(api){
    // Private variables.
    var defaultWindowOptions = {
            url: '',
            name: '',
            specs: ''
        },
        that = this;

    // Private functions.
    var copyDefaults, onMessage, appendScript;

    // Public functions.
    this.openWindow;


    // Private function definitions.
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
     *     <li>{string} content      The HTML to go inside. This gets URI
     *                               escaped and then loaded via data:text/html.
     *                               If neither contents nor url are provided,
     *                               an about:blank page is opened.
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
        if( defaultWindowOptions.url === '' ){
            defaultWindowOptions.url = api.extensionPath +'blank.html';
        }
        var opts = copyDefaults(options, defaultWindowOptions);

        if( opts.specsMap ){
            var key, specs = [];
            for( key in opts.specsMap ){
                specs.push(key+'='+opts.specsMap[key]);
            }
            opts.specs = specs.join(',');
        }


        var win = window.open(opts.url, opts.name, opts.specs);

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

                try{
                    
                    var re = function(){
                        api.base.log('in re...readyState: '+ 
                            win.document.readyState);
                        if( win.document.readyState === "complete" ){
                            // win.document.getElementById('frame').setAttribute(
                            //     'srcdoc', opts.content    
                            // );
                            // var doc = document.implementation.
                            //     createHTMLDocument("New Document");
                            // doc.open();
                            // doc.write(opts.content);
                            // doc.close();
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
                            setTimeout(re, 20);
                        }
                    }

                    re();

                } catch(e){
                    api.base.log('doc.write did not work: '+ e);
                }
                
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
}