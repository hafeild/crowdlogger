/**
 * @fileOverview Provides the UI API for CrowdLogger remote modules
 * (CLRMs). 
 *
 * %%LICENSE%%
 * 
 * @author hfeild
 * 
 * @version %%VERSION%%
 */
CLI.prototype.UserInterface = function(crowdlogger, cli){
    // Private variables.

    // Private function declarations.

    // Public variables.
    
    // Public function declarations.
    this.setMessageFlag;
     
    // Private function definitions.

    // Public function definitions.

    /**
     * Sets the 'extension updates' notification.
     */
    this.setMessageFlag = function(){
        crowdlogger.notifications.set_notification('study_updates');
    };

}