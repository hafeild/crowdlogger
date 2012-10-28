/**
 * @fileOverview Provides functions to access logs, regardless of how the logs
 * are stored.<p>
 * 
 * See the  CROWDLOGGER.io.log namespace.<p>
 * 
 * %%VERSION%%
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
    if( CROWDLOGGER.version.info.get_browser_name().match( /^ff/ ) !== null ){
        CROWDLOGGER.io.log.write_to_activity_log = 
            CROWDLOGGER.io.file.write_to_activity_log;
        CROWDLOGGER.io.log.write_to_error_log = 
            CROWDLOGGER.io.file.write_to_error_log;
        CROWDLOGGER.io.log.read_activity_log =
            CROWDLOGGER.io.file.read_activity_log;
        CROWDLOGGER.io.log.read_error_log =
            CROWDLOGGER.io.file.read_error_log;
        CROWDLOGGER.io.log.clear_error_log =
            CROWDLOGGER.io.file.clear_error_log;
        CROWDLOGGER.io.log.clear_activity_log =
            CROWDLOGGER.io.file.clear_activity_log;

    } else if( CROWDLOGGER.version.info.get_browser_name() === "chrome" ) {
        CROWDLOGGER.io.log.write_to_activity_log = 
            CROWDLOGGER.io.web_sql.write_to_activity_log;
        CROWDLOGGER.io.log.write_to_error_log = 
            CROWDLOGGER.io.web_sql.write_to_error_log;
        CROWDLOGGER.io.log.read_activity_log =
            CROWDLOGGER.io.web_sql.read_activity_log;
        CROWDLOGGER.io.log.read_error_log =
            CROWDLOGGER.io.web_sql.read_error_log;
        CROWDLOGGER.io.log.clear_error_log =
            CROWDLOGGER.io.web_sql.clear_error_log;
        CROWDLOGGER.io.log.clear_activity_log =
            CROWDLOGGER.io.web_sql.clear_activity_log;
    }
};


} // END CROWDLOGGER.io.log NAMESPACE
