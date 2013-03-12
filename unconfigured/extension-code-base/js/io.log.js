/**
 * @fileOverview Provides functions to access logs, regardless of how the logs
 * are stored.<p>
 * 
 * See the  CROWDLOGGER.io.log namespace.<p>
 * 
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

if( CROWDLOGGER.io.log === undefined ){

/**
 * @namespace Provides functions to access logs, regardless of how the logs
 * are stored. This serves as an interface to the log operation via files
 * and WebSQL.
 */
CROWDLOGGER.io.log = {};

/**
 * Writes a message to the activity log. Appends a newline at the end.
 * @function
 *
 * @param {string} message The entry to add to the log. A new line will be
 *      placed at the end.
 */
CROWDLOGGER.io.log.init = function(){
    CROWDLOGGER.io.log = new CROWDLOGGER.io.IndexedDB(CROWDLOGGER);
};

} // END CROWDLOGGER.io.log NAMESPACE
