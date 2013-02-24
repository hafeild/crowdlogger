/**
 * @fileOverview <p>Provides the base CrowdLogger Remote Modules (CRMs)-side 
 * interface (CRMI) for CRMs.</p>
 *
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

/**
 * Provides the base CrowdLogger Remote Modules (CRMs)-side interface (CRMI) for
 * CRMs. This includes sending messages to the CrowdLogger-side Interface (CLI).
 */
var CLRMIBaseAPI = function(api) { 
    // Private variables.
    var that = this,
        messageHandlers = {
            //alert: function(data){ alert(data.message); }
        },
        modules = {},
        useSandbox = false;
        
    // Private function declarations.
    var init, extractData, onMessage, setExtensionPath, loadCLRM;

    // Public function declarations.
    this.postMessage, this.log;

    // Private function definitions.
    init = function(){
        console.log('Initializing CLRMIBaseAPI.\n');
        messageHandlers.loadCLRM = loadCLRM;
        messageHandlers.setExtensionPath = setExtensionPath;
        jQuery(window).bind( 'message', onMessage );

        that.sendMessage({command:'getExtensionPath'})
        //var x = window.open(); x.document.write("hello");
        that.sendMessage({command:'log', message:'CLRMI saying "Hi!".'});
    };

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
        if( !data.from || data.from !== 'CLRMI' ){
            that.log('CLRMI received a message: '+ JSON.stringify(data));
        }
        //alert('CLRMI received a message: '+ JSON.stringify(data));
        var command = data.command;
        if( data.from === 'CLI' && messageHandlers[command] ){
            setTimeout(function(){messageHandlers[command](data);}, 2);
        }
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
     * @param {string} script   The JavaScript module.
     */
    loadCLRM = function(data){
        console.log('Loading CLRM');
        var clrm = new CLRM(JSON.parse(data.package), api.API);

        // Wrapping this in a function in case we need to unload an existing
        // version of the module, and therefore need to call load after the
        // unloading has occurred.
        var load = function(){
            modules[clrm.module.id] = clrm.module;
            clrm.module.init();
            that.log('Module '+ clrm.module.id +' loaded!');
        };

        // Check if it already exists. If so, unload the previous version.
        if( modules[clrm.module.id] ){
            try{
                that.log('Unloading module '+ clrm.module.id);
                modules[clrm.module.id].unload(load);
            } catch(e){
                load();
            }
        } else {
            load();
        }
    };

    // Public function definitions.

    /**
     * Sends a message to the CLI.
     */
    this.sendMessage = function(message){
        console.log('CLRMI sending a message: '+ JSON.stringify(message) +'\n');

        message.from = 'CLRMI';
        parent.postMessage(message, '*');
    };

    this.log = function(message){
        that.sendMessage({
            command: 'log', 
            message: message
        });
    }

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
var CLRM = function(clrmPackage, CrowdLoggerAPI){
    console.log('clrmPackage.module: '+ clrmPackage.module);
    eval(clrmPackage.module);
    console.log('Evaluated the CLRM; RemoteModule: '+ RemoteModule);
    console.log(RemoteModule);
    // Every module should have a Module function defined.
    this.module = new RemoteModule(clrmPackage, new CrowdLoggerAPI());
    // Clear it out so no one else has access to it.
    RemoteModule = undefined;
};


