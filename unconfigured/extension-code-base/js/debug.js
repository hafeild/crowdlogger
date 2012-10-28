/**
 * @fileOverview Contains debugging functionality. Namely, printing to
 * the console ('dump' in Firefox, 'console.log' in Chrome).<p>
 * 
 * See the CROWDLOGGER.debug namespace.<p>
 * 
 * %%VERSION%%
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
    var browser_version = CROWDLOGGER.version.info.get_browser_name();

    // This will store the logging function to use.
    /** @ignore */
    var logging_function;

    // For Firefox.
    if( browser_version.match( /^ff/ ) !== null ){
        /** @ignore */
        logging_function = function( message ) { dump( message ) };
    // For Chrome.
    } else if( browser_version === "chrome" ) {
        /** @ignore */
        logging_function = function( message ) { console.log( message ); };
    }
   
    /** @ignore */
    CROWDLOGGER.debug.log = logging_function;
};

} // END CROWDLOGGER.debug NAMESPACE
