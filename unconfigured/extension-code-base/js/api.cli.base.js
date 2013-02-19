/**
 * @fileOverview Provides the base CrowdLogger-side interface (CLI) for 
 * CrowdLogger remote modules (CRMs).<p>
 * 
 * %%VERSION%%
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
var CLIBase = function(crowdlogger, cli){
    // Private variables.
    var that = this,
        clrmi,
        messageHandlers = {
            // ui: crowdlogger.api.cli.ui.handleMessage,
            // user: crowdlogger.api.cli.user.handleMessage
            alert: function(data){ alert(data.message); },
            log: function(data){ crowdlogger.debug.log(data.message);},
            getExtensionPath: function(data){that.sendMessage({
                command: 'setExtensionPath', 
                extensionPath: crowdlogger.version.info.
                    get_extension_html_prefix()
            })}

        };

    // Private function declarations.
    var onMessage, init, extractData;

    // Public function declarations.
    this.loadCLRM, this.sendMessage; 


    // Private function definitions.
    init = function(){
        crowdlogger.debug.log('In init\n');

        var path = crowdlogger.version.info.get_extension_prefix();
        var clrm_url = 'data:text/html,'+encodeURI(
            '<html>'+
            '<head>'+
            '<!-- Load jQuery first. -->'+
            '<script src="'+path+'js/external_lib/jquery.min.js"></script>'+
            '<!-- Load the API files. -->'+
            '<script src="'+path+'js/api.clrmi.base.js"></script>'+
            '<script src="'+path+'js/api.clrmi.user.js"></script>'+
            '<script src="'+path+'js/api.clrmi.ui.js"></script>'+
            '<!-- Gives us the api variable. -->'+
            '<script src="'+path+'js/api.clrmi.init.js"></script>'+
            '<script src="'+path+'html-js/clrm.js"></script>'+
            '</head>'+
            '<body>'+
            '</body>'+
            '</html>');

        if( crowdlogger.version.info.is_firefox ){
            var hiddenWindow = Components.classes[
                '@mozilla.org/appshell/appShellService;1']
                 .getService(Components.interfaces.nsIAppShellService)
                 .hiddenDOMWindow;
            var frame = hiddenWindow.document.getElementById('clrm');
            if( !frame ) {
                clrm_url = crowdlogger.version.info.get_extension_html_prefix()+
                    'clrm.html';

                crowdlogger.debug.log('Opening iframe for '+ clrm_url +'\n');
                var XUL_NS = 'http://www.mozilla.org/keymaster/gatekeeper/'+
                           'there.is.only.xul';

                frame = hiddenWindow.document.createElementNS(XUL_NS, 'iframe');
                frame.setAttribute('id', 'clrm');
                frame.setAttribute('src', clrm_url);
                frame.setAttribute('type', 'content');

                hiddenWindow.document.documentElement.appendChild(frame);
            }

            hiddenWindow.addEventListener('message', onMessage, true, true);
            clrmi = frame.contentWindow;

        } else {
            crowdlogger.jq('#clrm').attr('src', clrm_url);

            clrmi = crowdlogger.jq('#clrm')[0].contentWindow;
            crowdlogger.jq(window).bind( 'message', onMessage );
        }
    };

    extractData = function(event){ 
        if( event.data ){
            return event.data;
        } else {
            return event.originalEvent.data; 
        }
    };

    // Public function definitions.
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

        crowdlogger.debug.log('CLI received a message: '+ 
            JSON.stringify(data) +"\n");

        if( data.from === 'CLRMI' && messageHandlers[command] ){
            setTimeout( function(){messageHandlers[command](data)}, 2 );
        }
    };

    /**
     * Loads a CrowdLogger Remote Module. This can be from a URL or a string.
     *
     * @param {object} options  A map of options. Currently supported options
     *                          include:
     * <ul>
     *     <li>urls {array of strings}      One or more URLs of scripts to load.
     *     <li>scripts  {array of strings}  One or more script strings to load.
     * </ul>
     */
    this.loadCLRMs = function(options){
        var i;
        options.urls = options.urls || [];
        for(i = 0; i < options.urls.length; i++){
            that.loadCLRMFromURL(options.urls[i]);
        }

        options.scripts = options.scripts || [];
        for(i = 0; i < options.scripts.length; i++){
            that.loadCLRMFromString(options.scripts[i]);
        }
    };

    this.loadCLRMFromURL = function(url){
        CROWDLOGGER.io.network.send_get_data(url, null,
            function(response){ 
                CROWDLOGGER.debug.log('Heard back: '+ response); 
                that.loadCLRMFromString(response);
            }, function(e){}
        );
    };

    this.loadCLRMFromString = function(script){
        that.sendMessage({command: 'loadCLRM', script: script});
    };

    /**
     * Sends a message to the CLRMI.
     */
    this.sendMessage = function(message){
        crowdlogger.debug.log('CLI sending a message: '+
            JSON.stringify(message) +'\n');
        if( clrmi ){
            message.from = 'CLI';
            clrmi.postMessage(message, '*');
        }
    };

    init();
};