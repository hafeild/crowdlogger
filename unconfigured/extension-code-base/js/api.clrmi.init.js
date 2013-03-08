/**
 * @fileOverview <p>Initializes the CrowdLogger Remote Modules (CRMs)-side 
 * interface (CRMI) for CRMs. This works in conjunction with the CrowdLogger-
 * side interface (CLI) functions (see CROWDLOGGER.api.cli). This is meant to
 * be loaded in a sandbox and thus does not use the CROWDLOGGER namespace.</p>
 *
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

var CLRMI = function(cli){
    // Private. Holds an instance of each API.
    //var api = {};
    var that = this;
    this.extensionPath = '';
    this.base = new this.Base(that, cli);
    this.user = new this.User(that);
    this.ui = new this.UserInterface(that);
    this.util = new this.Util();

    // Serves as a conduit for the API. Each CRMI will be given an instance
    // of this.
    this.API = function(clrmiPackage){

        // Public functions -- what will be exposed to a CLRM.
        this.user    = that.user;
        this.ui      = that.ui;
        this.storage = new that.Storage(that, clrmiPackage.id);
    };
};

