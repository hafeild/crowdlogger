/**
 * @fileOverview <p>Provides the storage API for the CrowdLogger Remote Modules 
 * (CLRMs)-side interface (CLRMI).</p>
 *
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

/**
 * Provides the storage API for the CrowdLogger Remote Modules (CLRMs)-side  
 * interface (CLRMI).
 */
CLRMI.prototype.Storage = function( api, id ){
    // Private variables.
    var that = this,
        db;

    // Private function declarations.
    var init;

    // Public variables.
    

    // Public function declarations.

    // Private function definitions.
    init = function(){
        that.history = new that.History( api );
        that.realTime = new that.RealTime( api );
        return that;
    }

    // Public function definitions.

    init();
};
