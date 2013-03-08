/**
 * @fileOverview Creates a new namespace called CROWDLOGGER.session_data, which
 * stores values that need to be shared across
 * windows. Within Firefox, where each window has it's own global space, 
 * these values are accessed via the FUEL Application.storage structure. In
 * Google Chrome, memory in background pages are shared across all windows,
 * so these accessor methods simply get/set values that are stored inside
 * of this namespace object.<p>
 * 
 * See the CROWDLOGGER.session_data namespace.<p>
 * 
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%% 
 */


if( CROWDLOGGER.session_data === undefined ){
/**
 * @namespace Contains accessors for values that need to be shared across
 * windows. Within Firefox, where each window has it's own global space, 
 * these values are accessed via the FUEL Application.storage structure. In
 * Google Chrome, memory in background pages are shared across all windows,
 * so these accessor methods simply get/set values that are stored inside
 * of this namespace object.
 */
CROWDLOGGER.session_data = {};


/**
 * Gets the value associated with the given key and returns the default
 * value if that key is not pressent in the CROWDLOGGER.session_data namespace.
 *
 * @param {string} key The key or name of the data to retreive.
 * @param {string} default_value The value to return if key is not set.
 */
CROWDLOGGER.session_data.get = function( key, default_value){
    // Check if it's in the session_data scope.
    if( CROWDLOGGER.session_data[key] === undefined ){
        // Nope. Return the default.
        return default_value;
    } else {
        // It does, so retrieve the contents.
        return CROWDLOGGER.session_data[key];
    }

};


/**
 * Sets the value associated with the given key.
 *
 * @param {string} key The key or name of the data to retreive.
 * @param {string} value The value to set.
 */
CROWDLOGGER.session_data.set = function( key, value){
    return CROWDLOGGER.session_data[key] = value;
};


} // END CROWDLOGGER.session_data NAMESPACE
