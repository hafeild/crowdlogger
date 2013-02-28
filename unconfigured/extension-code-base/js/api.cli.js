/**
 * @fileOverview Provides the wrapper for the CrowdLogger-side interface (CLI) 
 * for CrowdLogger remote modules (CRMs).<p>
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

var CLI = function(crowdlogger){
    var that = this,
        init;

    init = function(){
        that.base = new that.Base(crowdlogger, that);
        that.ui = null;
        that.user = new that.User(crowdlogger, that);
        return that;
    };

    init();
};