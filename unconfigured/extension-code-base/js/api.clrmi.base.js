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
var CLRMIBaseAPI = function(api) { //, cli){
    // Private variables.
    var that = this,
        messageHandlers = {},
        modules = {},
        useSandbox = false;
        
    // Private function declarations.
    var init, extractData, onMessage;

    // Public function declarations.
    this.loadCLRM, this.postMessage;

    // Private function definitions.
    init = function(){
        console.log('Initializing CLRMIBaseAPI.\n');
        messageHandlers.loadCLRM = that.loadCLRM;
        jQuery(window).bind( 'message', onMessage );
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
        console.log('CLRMI received a message: '+ JSON.stringify(data) +'\n');
        var command = data.command;
        if( messageHandlers[command] ){
            messageHandlers[command](data);
        }
    };

    // Public function definitions.

    /**
     * Loads a CrowdLogger Remote Module. 
     *
     * @param {string} script   The JavaScript module.
     */
    this.loadCLRM = function(data){
        console.log('Loading CLRM');
        var clrm = new CLRM(data.script, api.API);
        modules[clrm.module.id] = clrm.module;
    };

    /**
     * Sends a message to the CLI.
     */
    this.sendMessage = function(message){
        console.log('CLRMI sending a message: '+ JSON.stringify(message) +'\n');

        parent.postMessage(message, '*');
    };

    init();
};

var CLRM = function(script, CrowdLoggerAPI){
    eval(script);
    console.log('Evaluated the CLRM; RemoteModule: '+ RemoteModule);
    // Every module should have a Module function defined.
    this.module = new RemoteModule(new CrowdLoggerAPI());
    // Clear it out in case they made it global.
    RemoteModule = undefined;
};


