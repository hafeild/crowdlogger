/**
 * @fileOverview Contains debugging functionality. Namely, printing to
 * the console ('dump' in Firefox, 'console.log' in Chrome).<p>
 * 
 * See the CROWDLOGGER.debug namespace.<p>
 * 
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%% 
 */

if( CROWDLOGGER.debug === undefined ){

/**
 * @namespace Contains debugging functionality. Namely, printing to
 * the console ('dump' in Firefox, 'console.log' in Chrome).
 */
CROWDLOGGER.debug = {};


/**
 * An alias for the proper debugging logging function (e.g., dump, 
 * console.log).
 * @name CROWDLOGGER.debug.log
 * @function
 * @param {string} message The message to print out.
 */
CROWDLOGGER.debug.init = function(){
    // Get the current browser name.
    //var browser_version = CROWDLOGGER.version.info.get_browser_name();

    // This will store the logging function to use.
    /** @ignore */
    // var logging_function;

    // For Firefox.
    if( CROWDLOGGER.version.info.is_firefox ){
        /** @ignore */
        CROWDLOGGER.debug.logging_function = function( message ) { 
            dump( message.replace(/\n$/,'')+ '\n' );
        };
    // For Chrome.
    } else if( CROWDLOGGER.version.info.is_chrome ) {
        /** @ignore */
        CROWDLOGGER.debug.logging_function = function( message ) { 
            console.log( message ); 
        };
    }
   
    /** @ignore */
    CROWDLOGGER.debug.log = CROWDLOGGER.debug.logging_function;
};

/**
 * To be called after preferences have been loaded. Checks if in dev mode;
 * if not, deactiviates the logging function.
 */
CROWDLOGGER.debug.reinit = function(){
    if( !CROWDLOGGER.preferences.get_bool_pref( "dev_mode", false ) ){
        CROWDLOGGER.debug.log("Not in dev mode; disabling console logging.");
        CROWDLOGGER.debug.log = function( message ){};
    } else {
        CROWDLOGGER.debug.log = CROWDLOGGER.debug.logging_function;
    }
}

} // END CROWDLOGGER.debug NAMESPACE
