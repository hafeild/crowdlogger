/**
 * @fileOverview <p>Initializes the CrowdLogger Remote Modules (CRMs)-side 
 * interface (CRMI) for CRMs. This works in conjunction with the CrowdLogger-
 * side interface (CLI) functions (see CROWDLOGGER.api.cli). This is meant to
 * be loaded in a sandbox and thus does not use the CROWDLOGGER namespace.</p>
 *
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

var CLRMI = function(cli){
    // Private. Holds an instance of each API.
    //var api = {};
    var that = this;
    this.base = new CLRMIBaseAPI(that, cli);
    this.user = new CLRMIUserAPI(that);
    this.ui = new CLRMIUserInterfaceAPI(that);

    // Serves as a conduit for the API. Each CRMI will be given an instance
    // of this.
    this.API = function(){
        // Public functions.
        this.user = that.user;
        this.ui = that.ui;
    };
};

