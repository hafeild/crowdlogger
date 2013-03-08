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
    CROWDLOGGER.io.log = new CROWDLOGGER.io.IndexedDB()

    // Writers.
    // Specialized writers.
    // CROWDLOGGER.io.log.write_to_activity_log = 
    //     CROWDLOGGER.io.indexed_db.write_to_activity_log;
    // CROWDLOGGER.io.log.write_to_error_log = 
    //     CROWDLOGGER.io.indexed_db.write_to_error_log;
    // CROWDLOGGER.
    // // Generic writer. Note that this may have some restrictions.
    // CROWDLOGGER.io.log.write_to_log =
    //     CROWDLOGGER.io.indexed_db.write_to_generic_log

    // // Updaters.
    // // Generic updaters.
    // CROWDLOGGER.io.log.update_search = 
    //     CROWDLOGGER.io.indexed_db.update_search;
    // CROWDLOGGER.io.log.update_task = 
    //     CROWDLOGGER.io.indexed_db.update_task;

    // // Readers.
    // CROWDLOGGER.io.log.read_activity_log =
    //     CROWDLOGGER.io.indexed_db.read_activity_log;
    // CROWDLOGGER.io.log.read_error_log =
    //     CROWDLOGGER.io.indexed_db.read_error_log;
    // CROWDLOGGER.io.log.read_search_log =


    // // Clearers.
    // CROWDLOGGER.io.log.clear_error_log =
    //     CROWDLOGGER.io.indexed_db.clear_error_log;
    // CROWDLOGGER.io.log.clear_activity_log =
    //     CROWDLOGGER.io.indexed_db.clear_activity_log;
};

} // END CROWDLOGGER.io.log NAMESPACE
