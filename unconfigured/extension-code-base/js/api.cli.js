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
    this.base = new CLIBase(crowdlogger, this);
    this.ui = null;
    this.user = null;
};