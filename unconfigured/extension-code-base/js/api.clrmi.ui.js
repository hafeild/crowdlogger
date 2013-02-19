/**
 * @fileOverview <p>Provides the UI API for the CrowdLogger Remote Modules 
 * (CRMs)-side interface (CRMI).</p>
 *
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

/**
 * Provides the UI API for the CrowdLogger Remote Modules (CRMs)-side interface 
 * (CRMI).
 */
var CLRMIUserInterfaceAPI = function(api){
    this.alert = function(message){
        api.base.sendMessage({command: 'alert', message: message});
    };

    this.openWindow = function(name, specs){
        name = name || '';
        specs = specs || '';
        var win = window.open('', name, specs);
        return win;
    }
}