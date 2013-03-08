/**
 * @fileOverview Provides functions to access the WebSQL database.<p>
 * 
 * See the  CROWDLOGGER.io.web_sql namespace.<p>
 *
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */


// Define the CROWDLOGGER.io namespace if it isn't already.
if( CROWDLOGGER.io === undefined ) {
    CROWDLOGGER.io = {};
}


if( CROWDLOGGER.io.web_sql === undefined ){

/**
 * @namespace Provides functions to access the WebSQL database.
 */
CROWDLOGGER.io.web_sql = {};


/**
 * Initializes the WebSQL IO functions. The functions that actually 
 * read and write from the database are private.
 */
CROWDLOGGER.io.web_sql.init = function(){
    // Funcitons.
    var create_table, clear_log, write_to_db, read_from_db, open_db, 
        write_to_log, read_log, truncate_table;
    
    // Some constants across our database IO
    var activity_log_table_name, database, database_name, database_size, 
        error_log_table_name;

    database_name = CROWDLOGGER.preferences.get_char_pref( 
        "extension_directory_name", "pp_search" );
    activity_log_table_name = CROWDLOGGER.preferences.get_char_pref(
        "activity_log_name", "activity_log" );
    error_log_table_name = CROWDLOGGER.preferences.get_char_pref(
        "error_log_name", "error_log" );
    database_size = 10 * 1024 * 1024; // 10 MB


    /**
     * Writes the given data to the error log table, followed by a new line.
     *
     * @param {string} data The data to write to the error log.
     */
    CROWDLOGGER.io.web_sql.write_to_error_log = function( data ){
        //B_DEBUG
        CROWDLOGGER.debug.log( "\nTO ERROR LOG:\n\t" + data + "\n\n" );
        //E_DEBUG
        
        // Write the data.
        write_to_log( database_name, error_log_table_name, data );
    };
    
    
    /**
     * Writes the given data to the activity log table, followed by a new
     * line.
     *
     * @param {string} data The data to write to the activity log.
     */
    CROWDLOGGER.io.web_sql.write_to_activity_log = function( data ) {
        //B_DEBUG
        CROWDLOGGER.debug.log( "\nTO ACTIVITY LOG:\n\t" + data + "\n\n" );
        //E_DEBUG
        
        // Write the data.
        write_to_log( database_name, activity_log_table_name, data );
    };


    /**
     * Truncates the activity log table.
     */
    CROWDLOGGER.io.web_sql.clear_activity_log = function() {
        clear_log( activity_log_table_name );
    };    

    /**
     * Truncates the error log table.
     */
    CROWDLOGGER.io.web_sql.clear_error_log = function() {
        clear_log( error_log_table_name );
    };

 
    /**
     * Truncates the given log table.
     */
    clear_log = function( log_name ) {
        if( database !== undefined  ){
            truncate_table( database, log_name, function(){}, 
                function(){} );
        }
    };


    /**
     * An alias for CROWDLOGGER.io.web_sql.write_to_activity_log.
     * @name CROWDLOGGER.io.web_sql.log
     * @function
     * @param {string} data The data to write to the activity log.
     */
    CROWDLOGGER.io.web_sql.log = CROWDLOGGER.io.web_sql.write_to_activity_log;


    /**
     * Reads the error log table and sends the data to the given callback
     * function. The callback should take one parameter: a string containing
     * the contents of the log.
     *
     * @param {function} callback The function to call when the error log
     *      has been read in.
     */
    CROWDLOGGER.io.web_sql.read_error_log = function( callback ){
        //B_DEBUG
        //CROWDLOGGER.debug.log( "\nTO ERROR LOG:\n\t" + message + "\n\n" );
        //E_DEBUG

        // Read the data and send it to callback.
        read_log( database_name, error_log_table_name, callback );
    };    


    /**
     * Reads the activity log table and sends the data to the given callback
     * function. The callback should take one parameter: a string containing
     * the contents of the log.
     *
     * @param {function} callback The function to call when the activity log
     *      has been read in.
     */
    CROWDLOGGER.io.web_sql.read_activity_log = function( callback ){
        //B_DEBUG
        //CROWDLOGGER.debug.log( "\nTO ACTIVITY LOG:\n\t" + message + "\n\n" );
        //E_DEBUG

        // Read the data and send it to callback.
        read_log( database_name, activity_log_table_name, callback );
    };    

  
    /**
     * This is a generic write function that will take care of opening
     * a database, creating the table (if need be), and writing the given
     * data to it.
     * @function
     * @private
     * @member CROWDLOGGER.io.web_sql
     *
     * @param {string} database_name The name of the database to open.
     * @param {string} table_name The name of the table to create.
     * @param {string} data The data to write to the database.
     */
    write_to_log = function(database_name, table_name, data ){
        // Open the database.
        if( database === undefined ){
            database = open_db( database_name );
        }

        // Create the table, if need be.
        create_table( database, table_name, function(e){ 
            CROWDLOGGER.debug.log( "Error creating table: " + 
                e.message + "\n" );
        }, function(){ 
            // Write the message to the table.
            write_to_db( database, table_name, data );
        });
    }; 

    /**
     * This is a generic read function that will take care of opening
     * a database, creating the table (if need be), and reading the given
     * data from it.
     * @function
     * @private
     * @member CROWDLOGGER.io.web_sql
     *
     * @param {string} database_name The name of the database to open.
     * @param {string} table_name The name of the table to create.
     * @param {function} callback The function to call when the data has 
     *      been read.
     */
    read_log = function(database_name, table_name, callback ){
        // Open the database.
        if( database === undefined ){
            database = open_db( database_name );
        }

        // Create the table, if need be.
        create_table( database, table_name, function(tx, e){
            CROWDLOGGER.debug.log( "Error creating table: " +
                e.message + "\n" );
        }, function(){
            // Read the message from the table.
            read_from_db( database, table_name, callback );
        } );
    };


    
    /**
     * Reads the entire contents from the given database and table.
     * It is then passed to the callback, which should take one parameter:
     * a string containing the contents of the table.
     * @function
     * @private
     * @member CROWDLOGGER.io.web_sql
     *
     * @param {Object} database The database.
     * @param {string} table_name The name of the table to read.
     * @param {function} callback The function to invoke after the data
     *  has been read in.
     */
    read_from_db = function( database, table_name, callback ){
        // An error function.
        var on_error = function( transaction, e ){
            CROWDLOGGER.debug.log( 
                "There was an error reading from the database: " + 
                e.message + "\n" );
        };

        // A wrapper that will convert the data extracted from the database
        // into a single string that is then passed to the callback.
        var callback_wrapper = function( tx, rs ){
            var data = "";

            // Read the rows in and append them to the data string.
            for( var i = 0; i < rs.rows.length; i++ ){
                data += rs.rows.item(i).data + "\n";
            }

            // Send the data off to the callback.
            setTimeout( function(){callback( data );}, 10 );
        };

        // Read the data and invoke the callback function.
        database.readTransaction( function(transaction){
            transaction.executeSql( 'select * from '+ table_name, [],
                callback_wrapper, 
                on_error );
        });
    };


    /**
     * Writes the given piece of data to the given database and table. The
     * data is written as a single entry (i.e., no columns).
     * @function
     * @private
     * @member CROWDLOGGER.io.web_sql
     *
     * @param {Object} database The database.
     * @param {string} table_name The name of the table to read.
     * @param {string} data The data to write to the database.
     */
    write_to_db = function( database, table_name, data ){
        // An error function.
        var on_error = function( transaction, e ){ 
            CROWDLOGGER.debug.log( "There was an error writing to the database: "+
                e.message + "\n" );
        };

        // A success function.
        var on_success = function( transaction, r ){ };

        // Write the data to the database.
        database.transaction( function(transaction){
            transaction.executeSql( 'insert into '+ table_name + 
                     '( data ) values (?)',
                [data],
                on_success,
                on_error);
        });

    };


    /**
     * Opens the CROWDLOGGER database.
     * @function
     * @private
     * @member CROWDLOGGER.io.web_sql
     *
     * @return {Object} The opened database.
     */
    open_db = function() {
        return openDatabase( database_name, "1.0", 
            "Database for CROWDLOGGER.", database_size );
    };

    
    /**
     * Creates a table in the given database. If the table already
     * exists, then this function will not do anything. All tables currently
     * considered consist of one column.
     *
     * @param {Object} database The database in which the table should
     *      be created.
     * @param {string} table_name The name of the table.
     * @param {function} on_error The function to call in the event of an error.
     * @param {function} on_success The function to call if the operation is
     *      successful.
     */    
    create_table = function( database, table_name, on_error, on_success ){
        database.transaction( function(transaction){
            transaction.executeSql( 'create table if not exists ' +
                table_name + '(id integer primary key asc, data text)', []);
        }, on_error, on_success );
    };

    /**
     * Truncates the given table in the database.
     *
     * @param {Object} database The database in which the table should
     *      be created.
     * @param {string} table_name The name of the table.
     * @param {function} on_error The function to call in the event of an error.
     * @param {function} on_success The function to call if the operation is
     *      successful.
     */
    truncate_table = function( database, table_name, on_error, on_success ){
        database.transaction( function( transaction) {
            transaction.executeSql( 'delete from ' + table_name, [] );
        }, on_error, on_success );
    };
        
};

}
