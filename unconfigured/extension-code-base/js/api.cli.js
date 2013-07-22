/**
 * @fileOverview Provides the wrapper for the CrowdLogger-side interface (CLI) 
 * for CrowdLogger remote modules (CRMs).<p>
 * 
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

var CLI = function(crowdlogger){
    var that = this,
        init;

    /**
     * Initializes all the api functions.
     * @returns A reference to itself.
     */
    init = function(){
        that.base     = new that.Base(crowdlogger, that);
        that.ui       = new that.UserInterface(crowdlogger, that);
        that.user     = new that.User(crowdlogger, that);
        that.storage  = new that.Storage(crowdlogger, that);
        that.ssa      = new that.ServerSideAccess(crowdlogger, that);
        that.privacy  = new that.Privacy(crowdlogger, that);
        return that;
    };

    /**
     * Defines an exception that can be thrown. Simply wraps an error 
     * message. Should be invoked with new.
     *
     * @param {string} message     The error message.
     */
    this.CLIException = function(message){
        this.toString = function(){ return message; };
    };

    init();
};