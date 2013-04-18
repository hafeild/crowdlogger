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
    init = function(){
        if( crowdlogger.version.info.is_chrome ){
            // This ensures that new popup windows are focused on creation.
            chrome.windows.onCreated.addListener(function(win) { 
                chrome.windows.update(win.id, {focused: true});  
            });
        }
    };

    // Public function definitions.

    /**
     * Sets the 'extension updates' notification.
     */
    this.setMessageFlag = function(){
        crowdlogger.notifications.set_notification('study_updates');
    };


    init();
}