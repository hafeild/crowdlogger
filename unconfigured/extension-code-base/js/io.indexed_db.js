/**
 * @fileOverview Provides functions to access to data stored in IndexedDB 
 * databases.
 * 
 * See the  CROWDLOGGER.io.log namespace.<p>
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

// Define the CROWDLOGGER.io namespace if it isn't already.
if( CROWDLOGGER.io === undefined ) {
    CROWDLOGGER.io = {};
}

if( CROWDLOGGER.io.indexed_db === undefined ){

/**
 * @namespace Provides functions to access the WebSQL database.
 */
CROWDLOGGER.io.indexed_db = {};

/**
 * Creates and returns an object with functions for accessing IndexedDB 
 * databases. The functions that actually read and write from the database are 
 * private. 
 * @class An interface for accessing an IndexedDB.
 * @return {Object} An object with several publicly accessible functions for 
 *   reading from
 *         and writing to IndexedDB databases.
 */
CROWDLOGGER.io.IndexedDB = function(){
    // Private functions.
    var create_table, clear_log, write_to_db, read_from_db, open_db, 
        write_to_log, read_log, run_transaction, foreach_entry,
        raise_error, on_crowlogger_db_upgraded, on_extension_db_upgraded,
        copy_obj, create_store, truncate_store, update_log;


    // Some constants
    var DATABASE_NAME = 'crowdlogger',
        EXTENSION_DATABASE_NAME = 'crowdlogger_extensions',
        EXTENSION_STORE_NAME = 'data',
        ACTIVITY_LOG_STORE_NAME = 'activity_log',
        ERROR_LOG_STORE_NAME = 'error_log',
        DATABASE_SIZE = 10 * 1024 * 1024, // 10 MB
        VERSION = 1,
        VERSIONCHANGE = //IDBTransaction ? IDBTransaction.VERSION_CHANGE : 
            'versionchange',
        READONLY = //IDBTransaction ? IDBTransaction.READ_ONLY : 
            'readonly',
        READWRITE = //IDBTransaction ? IDBTransaction.READ_WRITE : 
            'readwrite',
        NEXT = 'next',
        NEXTUNIQUE = 'nextunique',
        PREV = 'prev',
        PREVUNIQUE = 'prevunique',
        T = 5, // Default timeout.
        IndexedDB = window.indexedDB || window.mozIndexedDB || 
            window.webkitIndexedDB,
        IDBKeyRange = window.IDBKeyRange || window.mozIDBKeyRange || 
            window.webkitIDBKeyRange;



    // Some globals.
    var that = this,
        db_connections = {};

    // Public functions. These will all be defined later, just listing them
    // out for now.
    // Writers. For appending individual entries.
    this.write_to_error_log = undefined;
    this.write_to_activity_log = undefined;
    this.log = undefined;
    this.write_to_extension_log = undefined;

    // Updaters. For modifying or deleting batches of entries.
    this.update_error_log = undefined;
    this.update_activity_log = undefined;
    this.update_extension_log = undefined;

    // Readers. For reading all or subsets of entries.
    this.read_error_log = undefined;
    this.read_activity_log = undefined;
    this.read_extension_log = undefined;

    // Clearers. For dropping entire tables.
    this.clear_error_log = undefined;
    this.clear_activity_log = undefined;
    this.clear_extension_log = undefined

    // Public variables.
    this.version = VERSION;

    // ******* BEGIN PUBLIC FUNCTIONS ********* //

    // ** WRITERS ** //
    /**
     * Writes the given data to the error log store.
     *
     * @param {object} opts  A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{string} data:             An array of data objects to write to 
     *                                    the database.
     * </ul> 
     * OPTIONAL:
     * <ul>
     *    <li>{Function} on_success:      Invoked when writing is complete.
     *    <li>{Function} on_error:        Invoked if there's an error.
     * </ul>  
     * 
     * @throws {Error} If the required opts fields are not present.
     */
    this.write_to_error_log = function( opts ){
        if( opts && typeof opts === "string" ){
            opts = {data: opts};
        }

        opts = copy_obj(opts);
        if( !opts.data ){
            return raise_error(
                "Missing parameters in call to write_to_error_log.", 
                opts.on_error);
        }

        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_name = ERROR_LOG_STORE_NAME;

        // Write the data.
        return write_to_log( opts );
    };
    
    /**
     * Writes the given data to the activity log store.
     *
     * @param {object} opts  A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{string} data:             An array of data objects to write to 
     *                                    the database.
     * </ul> 
     * OPTIONAL:
     * <ul>
     *    <li>{Function} on_success:      Invoked when writing is complete.
     *    <li>{Function} on_error:        Invoked if there's an error.
     * </ul>  
     * 
     * @throws {Error} If the required opts fields are not present.
     */
    this.write_to_activity_log = function( opts ){
        opts = copy_obj(opts);
        if( !opts.data ){
            return raise_error(
                "Missing parameters in call to write_to_activity_log.", 
                opts.on_error);
        }

        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_name = ACTIVITY_LOG_STORE_NAME;

        // Write the data.
        return write_to_log( opts );
    };

    /**
     * An alias for write_to_activity_log.
     */
    this.log = this.write_to_activity_log;    

    /**
     * Writes the given data to an extension log.
     *
     * @param {object} opts  A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{string} db_name:          The name of the database to open.
     *     <li>{int} db_version:          The version of the db.
     *     <li>{string} data:             An array of data objects to write to 
     *                                    the database.
     * </ul> 
     * OPTIONAL:
     * <ul>
     *     <li>{string} store_name:       The name of the table to create.
     *     <li>{Function} on_upgrade:     Invoked if the database needs to be 
     *                                    updated.
     *    <li>{Function} on_success:      Invoked when writing is complete.
     *    <li>{Function} on_error:        Invoked if there's an error.
     * </ul>  
     * 
     * @throws {Error} If the required opts fields are not present.
     */
    this.write_to_extension_log = function( opts ){
        opts = copy_obj(opts);
        if( !opts.db_name || !opts.db_version || !opts.data ){
            return raise_error(
                "Missing parameters in call to write_to_extension_log.", 
                opts.on_error);
        }
        opts.on_upgrade = opts.on_upgrade || on_extension_db_upgraded;
        opts.store_name = opts.store_name || EXTENSION_STORE_NAME;

        // Write the data.
        return write_to_log( opts );
    };

    // ** UPDATERS ** //
    /**
     * Updates entries in the activity log. 
     * @example
     * update_activity_log({
     *   foreach: function(entry){ 
     *        if(isOld(entry))              return {delete:true};
     *        else if(needsUpdating(entry)) return {entry: update(entry)});
     *        else                          return {}; // Do nothing.
     *   },
     *   on_success: function(entry)
     * })
     *
     * @param {Object} opts     A map consisting of several options, including:
     * REQUIRED:
     * <ul>
     *    <li>{Funciton} foreach:         A function to run on each entry. It
     *                                    should take an entry object as its
     *                                    only parameter and optionally return
     *                                    an object with three optional fields:
     *                                    entry (new data, ids must match),
     *                                    stop (true or false),
     *                                    delete (true or false).
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{Function} on_success:      A function to call when all data
     *                                    has been processed.
     *    <li>{Funciton} on_error:        Invoked when an error occurs.
     * </ul>
     */
    this.update_activity_log = function( opts ){
        opts = copy_obj(opts);
        if( !opts.foreach ){
            return raise_error(
                'Missing parameters in call to update_activity_log.',
                opts.on_error)
        }
        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_name = ACTIVITY_LOG_STORE_NAME;

        // Read the data and send it to callback.
        return update_log( opts );
    };

    /**
     * Updates entries in the error log. 
     * @example
     * update_activity_log({
     *   foreach: function(entry){ 
     *        if(isOld(entry))              return {delete:true};
     *        else if(needsUpdating(entry)) return {entry: update(entry)});
     *        else                          return {}; // Do nothing.
     *   },
     *   on_success: function(entry)
     * })
     *
     * @param {Object} opts     A map consisting of several options, including:
     * REQUIRED:
     * <ul>
     *    <li>{Funciton} foreach:         A function to run on each entry. It
     *                                    should take an entry object as its
     *                                    only parameter and optionally return
     *                                    an object with three optional fields:
     *                                    entry (new data, ids must match),
     *                                    stop (true or false),
     *                                    delete (true or false).
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{Function} on_success:      A function to call when all data
     *                                    has been processed.
     *    <li>{Funciton} on_error:        Invoked when an error occurs.
     * </ul>
     */
    this.update_error_log = function( opts ){
        opts = copy_obj(opts);
        if( !opts.foreach ){
            return raise_error(
                'Missing parameters in call to update_activity_log.',
                opts.on_error)
        }
        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_name = ERROR_LOG_STORE_NAME;

        // Read the data and send it to callback.
        return update_log( opts );
    }

    /**
     * Updates entries in an extension's log. 
     * @example
     * update_activity_log({
     *   foreach: function(entry){ 
     *        if(isOld(entry))              return {delete:true};
     *        else if(needsUpdating(entry)) return {entry: update(entry)});
     *        else                          return {}; // Do nothing.
     *   },
     *   on_success: function(entry)
     * })
     *
     * @param {Object} opts     A map consisting of several options, including:
     * REQUIRED:
     * <ul>
     *    <li>{string} db_name:           The database name.
     *    <li>{int} db_version:           The version of the db.     
     *    <li>{Funciton} foreach:         A function to run on each entry. It
     *                                    should take an entry object as its
     *                                    only parameter and optionally return
     *                                    an object with three optional fields:
     *                                    entry (new data, ids must match),
     *                                    stop (true or false),
     *                                    delete (true or false).
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{Function} on_upgrade:      Invoked if the database needs to be 
     *                                    updated.
     *    <li>{string} store_name:        The name of the store to read.     
     *    <li>{Function} on_success:      A function to call when all data
     *                                    has been processed.
     *    <li>{Funciton} on_error:        Invoked when an error occurs.
     * </ul>
     */
    this.update_extension_log = function( opts ){
        opts = copy_obj(opts);
        if( !opts.foreach || !opts.db_version || !opts.db_name ){
            return raise_error(
                'Missing parameters in call to update_activity_log.',
                opts.on_error)
        }
        opts.on_upgrade = opts.on_upgrade || on_extension_db_upgraded;
        opts.store_name = opts.store_name || EXTENSION_STORE_NAME;

        // Read the data and send it to callback.
        return update_log( opts );
    }

    // ** CLEARERS ** //
    /**
     * Truncates the activity log store.
     * 
     * @param {Object} opts        A map of options:
     * OPTIONAL:
     * <ul>
     *    <li>{Function} on_success:   Invoked when everything has been read.
     *    <li>{Function} on_error:     Invoked if there's an error.
     * </ul>     
     */
    this.clear_activity_log = function( opts ) {
        opts = copy_obj(opts);
        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_name = ACTIVITY_LOG_STORE_NAME;

        // Clear the log.
        return clear_log( opts );
    };    

    /**
     * Truncates the error log store.
     * 
     * @param {Object} opts        A map of options:
     * OPTIONAL:
     * <ul>
     *    <li>{Function} on_success:   Invoked when everything has been read.
     *    <li>{Function} on_error:     Invoked if there's an error.
     * </ul>     
     */
    this.clear_error_log = function( opts ) {
        opts = copy_obj(opts);
        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_name = ERROR_LOG_STORE_NAME;

        // Clear the log.
        return clear_log( opts );
    };

    /**
     * Truncates an extension store.
     * 
     * @param {Object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} db_name:        The database name.
     *    <li>{int} db_version:        The version of the db.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{Function} on_upgrade:   Invoked if the database needs to be 
     *                                 updated.
     *    <li>{string} store_name:     The name of the store to read.
     *    <li>{Function} on_success:   Invoked when everything has been read.
     *    <li>{Function} on_error:     Invoked if there's an error.
     * </ul>
     * 
     * @throws {Error} If required opts fields are missing.
     */
    this.clear_extension_log = function( opts ) {
        opts = copy_obj(opts);
        if( !opts.db_name || !opts.db_version ){
            return raise_error(
                "Missing parameters in call to clear_extension_log.",
                opts.on_error);
        }

        opts.on_upgrade = opts.on_upgrade || on_extension_db_upgraded;
        opts.store_name = opts.store_name || EXTENSION_STORE_NAME;

        // Read the data and send it to callback.
        return clear_log( opts );
    };

    // ** READERS ** //
    /**
     * Reads the activity log store and sends the data to the given callback
     * (on_chunk) function. The callback should expect an array of data db
     * entries and a next callback. If chunk_size > 0, then invoking 'next' will
     * cause the next chunk of data to be read in.
     *
     * @function
     * @member CROWDLOGGER.io.indexed_db
     *
     * @param {Object} opts        A map of additional options:
     * REQUIRED:
     * <ul>
     *    <li>{Function} on_chunk:     Invoked per chunk (see below). Chunks
     *                                 are processed asynchronously.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{Function} on_success:   Invoked when everything has been read.
     *    <li>{Function} on_error:     Invoked if there's an error.
     *    <li>{int} chunk_size:        The size of the chunks to process. E.g.,
     *                                 chunk_size = 50 will cause 50 entries to
     *                                 be read, stored in an array, and then
     *                                 passed to the on_chunk function. If <=0,
     *                                 all entries will be read in before 
     *                                 calling on_chunk. This is approximate
     *                                 because ranges are used and therefore
     *                                 deleted items within that range will not
     *                                 be read (their id's are not reused).
     *    <li>{bool} reverse:          If true, the data will be read in reverse
     *                                 order of id. Default is 'false'.
     *    <li>{int} lower_bound:       The smallest id to retrieve; default: 0
     *    <li>{int} upper_bound:       The largest id to retrieve; default: -1
     *                                 (all ids >= lower_bound are retrieved).
     * </ul>
     */
    this.read_error_log = function( opts ){
        opts = copy_obj(opts);
        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_name = ERROR_LOG_STORE_NAME;

        // Read the data and send it to callback.
        return read_log( opts );
    };    

    /**
     * Reads the activity log store and sends the data to the given callback
     * (on_chunk) function. The callback should expect an array of data db
     * entries and a next callback. If chunk_size > 0, then invoking 'next' will
     * cause the next chunk of data to be read in.
     *
     * @function
     * @member CROWDLOGGER.io.indexed_db
     *
     * @param {Object} opts        A map of additional options:
     * REQUIRED:
     * <ul>
     *    <li>{Function} on_chunk:     Invoked per chunk (see below). Chunks
     *                                 are processed asynchronously.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{Function} on_success:   Invoked when everything has been read.
     *    <li>{Function} on_error:     Invoked if there's an error.
     *    <li>{int} chunk_size:        The size of the chunks to process. E.g.,
     *                                 chunk_size = 50 will cause 50 entries to
     *                                 be read, stored in an array, and then
     *                                 passed to the on_chunk function. If <=0,
     *                                 all entries will be read in before 
     *                                 calling on_chunk. This is approximate
     *                                 because ranges are used and therefore
     *                                 deleted items within that range will not
     *                                 be read (their id's are not reused).
     *                                 Default: 0.
     *    <li>{bool} reverse:          If true, the data will be read in reverse
     *                                 order of id. Default is 'false'.
     *    <li>{int} lower_bound:       The smallest id to retrieve; default: 0
     *    <li>{int} upper_bound:       The largest id to retrieve; default: -1
     *                                 (all ids >= lower_bound are retrieved).
     * </ul>
     */
    this.read_activity_log = function( opts ){
        opts = copy_obj(opts);
        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_name = ACTIVITY_LOG_STORE_NAME;

        // Read the data and send it to callback.
        return read_log( opts );
    };    

    /**
     * Reads data from a CrowdLogger extension file. This is pretty extensible,
     * allowing the caller to have control over how a new database is
     * constructed, though a default is supplied.
     *
     * @function
     * @member CROWDLOGGER.io.indexed_db
     *
     * @param {Object} opts        A map of additional options:
     * REQUIRED:
     * <ul>
     *    <li>{string} db_name:        The database name.
     *    <li>{int} db_version:        The version of the db.
     *    <li>{Function} on_chunk:     Invoked per chunk (see below). Chunks
     *                                 are processed asynchronously.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{Function} on_upgrade:   Invoked if the database needs to be 
     *                                 updated.
     *    <li>{string} store_name:     The name of the store to read.
     *    <li>{Function} on_success:   Invoked when everything has been read.
     *    <li>{Function} on_error:     Invoked if there's an error.
     *    <li>{int} chunk_size:        The size of the chunks to process. E.g.,
     *                                 chunk_size = 50 will cause 50 entries to
     *                                 be read, stored in an array, and then
     *                                 passed to the on_chunk function. If <=0,
     *                                 all entries will be read in before 
     *                                 calling on_chunk. This is approximate
     *                                 because ranges are used and therefore
     *                                 deleted items within that range will not
     *                                 be read (their id's are not reused).
     *                                 Default: 0.
     *    <li>{bool} reverse:          If true, the data will be read in reverse
     *                                 order of id. Default is 'false'.
     *    <li>{int} lower_bound:       The smallest id to retrieve; default: 0
     *    <li>{int} upper_bound:       The largest id to retrieve; default: -1
     *                                 (all ids >= lower_bound are retrieved).
     * </ul>
     *
     * @throws {Error} If required opts fields are missing.
     */
    this.read_extension_log = function( opts ){
        opts = copy_obj(opts);
        if( !opts.db_name || !opts.db_version || !opts.on_chunk ){
            return raise_error(
                "Missing parameters in call to read_extension_log.",
                opts.on_error);
        }

        opts.on_upgrade = opts.on_upgrade || on_extension_db_upgraded;
        opts.store_name = opts.store_name || EXTENSION_STORE_NAME;

        // Read the data.
        return read_log( opts );
    }; 
    // ******* END PUBLIC FUNCTIONS ********* //


    // ******* BEGIN PRIVATE FUNCTIONS ********* //
    /**
     * Creates the stores in a CrowdLogger database.
     *
     * @param event     The event generated by creating a new database.
     */
    on_crowlogger_db_upgraded = function(db){
        create_store({
            db: db, 
            store_name: ACTIVITY_LOG_STORE_NAME
        });
        create_store({
            db: db, 
            store_name: ERROR_LOG_STORE_NAME
        });
    }

    /**
     * Creates the default store in a CrowdLogger extension database.
     *
     * @param event     The event generated by creating a new database.
     */
    on_extension_db_upgraded = function(db){
        create_store({
            db: db, 
            store_name: EXTENSION_STORE_NAME
        });
    }

    /**
     * Truncates the given log store.
     *
     * @param {Object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{string} db_name:          The name of the database to open.
     *     <li>{Function} on_upgrade:     Invoked if the database needs to be 
     *                                    updated.
     *     <li>{int} db_version:          The version of the db.
     *     <li>{string} store_name:       The name of the store to clear.
     * </ul>
     * OPTIONAL:
     * <ul>
     *     <li>{Funciton} on_error:       Invoked on an error.
     *     <li>{Function} on_success:     Invoked on success.
     * </ul>     
     *
     * @throws {Error} If required opts fields are missing.
     */
    clear_log = function( opts ) {
        if( !opts || !opts.db_name || !opts.db_version ){ 
            opts = opts || {};
            return raise_error("Missing parameters in call to clear_log.", 
                opts.on_error);
        }

        if( !db_connections[opts.db_name] ){
            return open_db({
                db_name: opts.db_name,
                db_version: opts.db_version,
                on_upgrade: opts.on_upgrade,
                on_error: opts.on_error,
                on_success: function(db){
                    db_connections[opts.db_name] = db;
                    clear_log(opts);
                }
            });
        }

        return truncate_store({
            db: db_connections[opts.db_name], 
            store_name: opts.store_name,
            on_error: opts.on_error, 
            on_success: opts.on_success
        });
    };

    /**
     * This is a generic write function that will take care of opening
     * a database, creating the table (if need be), and writing the given
     * data to it.
     * @function
     * @private
     * @member CROWDLOGGER.io.indexed_db
     *
     * @param {Object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{string} db_name:          The name of the database to open.
     *     <li>{Function} on_upgrade:     Invoked if the database needs to be 
     *                                    updated.
     *     <li>{int} db_version:          The version of the db.
     *     <li>{string} store_name:       The name of the table to create.
     *     <li>{string} data:             The data to write to the database.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{Function} on_success:      Invoked when writing is complete.
     *    <li>{Function} on_error:        Invoked if there's an error.
     * </ul>
     * @throws {Error} If the required opts fields are missing.
     */
    write_to_log = function( opts ){
        if( !opts || !opts.db_name || !opts.db_version || !opts.on_upgrade || 
                !opts.data || !opts.store_name ){ 
            opts = opts || {};
            return raise_error("Missing parameters in call to write_to_log.", 
                opts.on_error);
        }

        if( !db_connections[opts.db_name] ){
            return open_db({
                db_name: opts.db_name,
                db_version: opts.db_version,
                on_upgrade: opts.on_upgrade,
                on_error: opts.on_error,
                on_success: function(db){
                    db_connections[opts.db_name] = db;
                    write_to_log(opts);
                }
            });
        }

        var info = {
            db: db_connections[opts.db_name],
            stores: [opts.store_name],
            mode: READWRITE,
            f: function(t){
                var object_store = t.objectStore(opts.store_name);
                var i = 0;
                for (i=0; i < opts.data.length; i++) {
                    object_store.put(opts.data[i]);
                }
            },
            on_success: opts.on_success,
            on_error: opts.on_error
        }

        return run_transaction(info);
    }; 

    /**
     * This is a generic update function that will take care of opening
     * a database, creating the store (if need be), and updating all the
     * entries in it.
     * @function
     * @private
     * @member CROWDLOGGER.io.indexed_db
     *
     * @param {Object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{string} db_name:          The name of the database to open.
     *     <li>{Function} on_upgrade:     Invoked if the database needs to be 
     *                                    updated.
     *     <li>{int} db_version:          The version of the db.
     *     <li>{string} store_name:       The name of the table to create.
     *     <li>{Function} foreach:        A function to run on each entry. It
     *                                    should take an entry object as its
     *                                    only parameter and optionally return
     *                                    an object with three optional fields:
     *                                    entry (new data, ids must match),
     *                                    stop (true or false),
     *                                    delete (true or false).
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{Function} on_success:      Invoked when updating is complete.
     *    <li>{Function} on_error:        Invoked if there's an error.
     * </ul>
     * @throws {Error} If the required opts fields are missing.
     */
    update_log = function( opts ){
        if( !opts || !opts.db_name || !opts.db_version || !opts.on_upgrade || 
                !opts.foreach || !opts.store_name ){ 
            opts = opts || {};
            return raise_error("Missing parameters in call to update_log.", 
                opts.on_error);
        }

        if( !db_connections[opts.db_name] ){
            return open_db({
                db_name: opts.db_name,
                db_version: opts.db_version,
                on_upgrade: opts.on_upgrade,
                on_error: opts.on_error,
                on_success: function(db){
                    db_connections[opts.db_name] = db;
                    update_log(opts);
                }
            });
        }

        // Iterate over the entries.
        return foreach_entry({
            db: db_connections[opts.db_name],
            store_name: opts.store_name,
            on_entry: opts.foreach,
            mode: READWRITE,
            on_success: opts.on_success,
            on_error: opts.on_error
        });
    }; 

    /**
     * This is a generic read function that will take care of opening
     * a database, creating the table (if need be), and reading the given
     * data from it.
     * @function
     * @private
     * @member CROWDLOGGER.io.indexed_db
     *
     * @param {Object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} db_name:        The database name.
     *    <li>{Function} on_upgrade:   Invoked if the database needs to be 
     *                                 updated.
     *    <li>{int} db_version:        The version of the db.
     *    <li>{string} store_name:     The name of the store to read.
     *    <li>{Function} on_chunk:     Invoked per chunk (see below). Chunks
     *                                 are processed asynchronously.
     * </ul>             
     * OPTIONAL:
     * <ul>                      
     *    <li>{Function} on_success:   Invoked when everything has been read.
     *    <li>{Function} on_error:     Invoked if there's an error.
     *    <li>{int} chunk_size:        The size of the chunks to process. E.g.,
     *                                 chunk_size = 50 will cause 50 entries to
     *                                 be read, stored in an array, and then
     *                                 passed to the on_chunk function. If <=0,
     *                                 all entries will be read in before 
     *                                 calling on_chunk. This is approximate
     *                                 because ranges are used and therefore
     *                                 deleted items within that range will not
     *                                 be read (their id's are not reused). 
     *                                 Default: 0.
     *    <li>{bool} reverse:          If true, the data will be read in reverse
     *                                 order of id. Default is 'false'.
     *    <li>{int} lower_bound:       The smallest id to retrieve; default: 0
     *    <li>{int} upper_bound:       The largest id to retrieve; default: -1
     *                                 (all ids >= lower_bound are retrieved).
     * </ul>
     *
     * @throws {Error} If required opts fields are missing.
     */
    read_log = function( opts ){
        opts = copy_obj(opts);
        if( !opts.db_name || !opts.db_version || !opts.on_upgrade ||
                !opts.store_name || !opts.on_chunk ){ 
            return raise_error("Missing parameters in call to read_log.", 
                opts.on_error);
        }

        if( db_connections[opts.db_name] ){
            opts.chunk_size = opts.chunk_size===undefined ? 0 : opts.chunk_size;
            opts.db = db_connections[opts.db_name];
            return read_from_db(opts);
        } else {
            return open_db({
                db_name: opts.db_name,
                db_version: opts.db_version,
                on_upgrade: opts.on_upgrade,
                on_error: opts.on_error,
                on_success: function(db){
                    db_connections[opts.db_name] = db;
                    read_log(opts);
                }
            });
        }
    };

    /**
     * Reads the given store. 
     * @function
     * @private
     * @member CROWDLOGGER.io.indexed_db
     *
     * @param {Object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{Object} db:            The database.
     *     <li>{string} store_name:    The name of the store to read.
     *     <li>{Function} on_chunk:    Invoked per chunk (see below). Chunks
     *                                 are processed asynchronously. Should 
     *                                 expect the data and a 'next' function
     *                                 which, when invoked, will retrieve
     *                                 the next chunk.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{Function} on_success:   Invoked when everything has been read
     *                                 and processed by on_chunk.
     *                                 Note that the 'next' function needs to
     *                                 be invoked from the on_chunk function
     *                                 in order for this to trigger.
     *    <li>{Function} on_error:     Invoked if there's an error.
     *    <li>{int} chunk_size:        The size of the chunks to process. E.g.,
     *                                 chunk_size = 50 will cause 50 entries to
     *                                 be read, stored in an array, and then
     *                                 passed to the on_chunk function. If <=0,
     *                                 all entries will be read in before 
     *                                 calling on_chunk. This is approximate
     *                                 because ranges are used and therefore
     *                                 deleted items within that range will not
     *                                 be read (their id's are not reused).
     *    <li>{bool} reverse:          If true, the data will be read in reverse
     *                                 order of id. Default is 'false'.
     *    <li>{int} lower_bound:       Smallest id to retrieve. Default: 0
     *    <li>{int} upper_bound:       Largest id to retrieve. Default:undefined
     *                                 (all ids > lower_bound are retrieved).
     * </ul>
     * 
     * @throws {Error} If required opts fields are missing.
     */
    read_from_db = function( opts ){
        if( !opts || !opts.db || !opts.store_name || !opts.on_chunk ){
            opts = opts || {};
            return raise_error("Missing parameters in call to read_from_db.", 
                opts.on_error);
        }

        var upper_bound = opts.upper_bound, 
            lower_bound = opts.lower_bound,
            finished = false;

        // Figure out the range of ids to iterate over.
        function get_range(upper, lower) {
            var range;
            if( lower === undefined ){
                if( upper === undefined ){
                    range = IDBKeyRange.lowerBound(0);
                } else {
                    range = IDBKeyRange.upperBound(upper);
                }
            } else if( upper === undefined ){
                range = IDBKeyRange.lowerBound(lower);
            } else { 
                range = IDBKeyRange.bound(lower, upper);
            }

            return range;
        }

        // This is a wrapper to assist with the issue of closures. If we just
        // pass batch to opts.on_chunk, then opts.on_chunk will get whatever
        // version of the buffer exists at the time of its execution, not
        // invocation. This wrapper freezes it, so to speak, so that the version
        // at invocation is the same as the version at execution.
        function on_chunk(b){
            return function(){ opts.on_chunk(b, next_chunk); }
        }

        // Process one chunk.
        function next_chunk(){
            // Just in case this gets called after everything has been read.
            if( finished ){ 
                if( opts.on_success ){
                    setTimeout(opts.on_success, T);
                }
                return; 
            }

            // This will hold the batches of items. It's essentially a buffer.
            var batch = [];

            // Iterate over the entries.
            return foreach_entry({
                db: opts.db,
                store_name: opts.store_name,
                on_entry: function(entry){
                    batch.push(entry);

                    // If the buffer is at capacity (chunk_size), then empty it
                    // by invoking on_chunk.
                    if( opts.chunk_size > 0 && batch.length >= opts.chunk_size){
                        // This sync call is okay, because it's execution has 
                        // nothing to do with the advancement of the cursor.
                        setTimeout(on_chunk(batch), T);
                        if( opts.reverse ){
                            upper_bound = entry.id-1;
                        } else {
                            lower_bound = entry.id+1;
                        }
                        return {stop: true};
                    }
                    return {stop: false};
                },
                mode: READONLY,
                range: get_range(upper_bound, lower_bound),
                direction: opts.reverse ? PREV : NEXT,
                on_success: function(){
                    // At the end, check if we need to empty the buffer one last 
                    // time.
                    if( !opts.chunk_size || batch.length < opts.chunk_size ){
                        finished = true;
                        
                        if( batch.length > 0 ){
                            setTimeout(on_chunk(batch), T);
                        }
                    }
                },
                on_error: opts.on_error
            });
        }

        // Read in the first chunk.
        return next_chunk();
    };

    /**
     * Runs the on_entry function on every item within the specified range
     * (opts.range or all if not defined) for the specific db/store_name combo.
     * The on_entry function must not be asynchronous or the transaction will
     * cease, disrupting the iteration.
     *
     * @param {Function} opts      A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{Object} db:         The database.
     *     <li>{String} store_name: The store name.
     *     <li>{Function} on_entry: The function to apply to each entry. Can 
     *                              return an object with two keys:
     *                                stop: true | false (default: false) If
     *                                    true, stops iterating.
     *                                updated_entry: the updated entry     
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{String} mode:       The mode; readwrite (default) or readonly.
     *    <li>{IDBKeyRange} range: The range (default: all). 
     *                             E.g. IDBKeyRange.lowerBound(1)
     *    <li>{String} direction:  The direction, i.e., 'next', 'nextunique',
     *                             'prev', 'prevunique',
     *    <li>{Function} on_success: What to call at the end.
     *    <li>{Function} on_error:  What to call when there's an error. 
     * </ul>
     * 
     * @throws {Error} If there are missing required opts fields.
     */
    foreach_entry = function( opts ){
        if( !opts || !opts.db || !opts.store_name || !opts.on_entry ){
            opts = opts || {};
            return raise_error("Missing parameters in call to foreach_entry.", 
                opts.on_error);
        }

        // Set defaults.
        opts.mode = opts.mode || READWRITE;
        opts.range = opts.range || IDBKeyRange.lowerBound(1);
        opts.direction = opts.direction || NEXT;

        // Run the transaction to iterate over the db entries, applying 
        // opts.on_entry to each entry.
        return run_transaction({
            db: opts.db,
            stores: [opts.store_name],
            mode: opts.mode ? opts.mode : READWRITE,
            f: function(t){
                var store = t.objectStore(opts.store_name);
                var request = store.openCursor(
                    opts.range, opts.direction); 
                request.onsuccess = function(){
                    var cursor = request.result;
                    if( cursor ){
                        var cur_request = store.get(cursor.key);
                        // After the data has been retrieved, send it to the
                        // on_entry function and see what needs to be done 
                        // (i.e., update, delete, and/or cease iteration).
                        cur_request.onsuccess = function (e) {
                            var info = opts.on_entry(cur_request.result) || 
                                {stop:false};
                            if( opts.mode == READWRITE && info.delete ){
                                cursor.delete();
                            } else if( opts.mode == READWRITE && info.entry && 
                                    info.entry.id === cursor.key){
                                cursor.update(info.entry);
                            }

                            if( !info.stop ){
                                // OK, now move the cursor to the next item. 
                                cursor.continue();
                            }
                        };
                    }
                };
            },
            on_success: opts.on_success,
            on_error: opts.on_error
        });
    };

    /**
     * Writes data to the given database and table. Each item in the
     * data is written as a single entry (i.e., no columns). The item's id field
     * will be used as the key. If it has no id field, then a new one will be
     * automatically generated. If the key is present, and an entry already 
     * exists with that id, that entry will be overwritten.
     *
     * @function
     * @private
     * @member CROWDLOGGER.io.indexed_db
     *
     * @param {Object} opts A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{Object} db:           The db to write to.
     *     <li>{string} store_name:   The store to write to.
     *     <li>{Array} data:          An array of objects to insert into the db.
     * </ul>
     * OPTIONAL
     * <ul>
     *     <li>{Function} on_error:   Invoked if there is an error. Should 
     *                                expect an object with two keys:
     *                                errorCode and event.
     *     <li>{Function} on_success: Invoked when the data has been written.
     * </ul>
     * @throws {Error} If the required opts fields are missing.
     */
    write_to_db = function( db, store_name, data, on_success, on_error ){
        if( !opts || !opts.db || !opts.store_name || !opts.data ){
            opts = opts || {};
            return raise_error("Missing parameters in call to write_to_db.", 
                opts.on_error);
        }

        return run_transaction({
            db: db,
            stores: [store_name],
            mode: READWRITE,
            f: function(t){
                var object_store = t.objectStore(store_name);
                for(var i = 0; i < data.length; i++) {
                    var request = object_store.put(data[i]);
                }
            },
            on_success: on_success,
            on_error: on_error
        });
    };

    /**
     * Opens the CROWDLOGGER database.
     * @function
     * @private
     * @member CROWDLOGGER.io.indexed_db
     *
     * @param {Object} opts A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{Function} on_upgrade: If the database has never been made or if
     *                                the version has changed, 
     *     <li>{String} db_name:      The name of the db to open.
     *     <li>{Int} db_version:      The version of the database.
     *     <li>{Function} on_success: Called when the database is successfully
     *                                opened. Should expect a database object
     *                                as its only parameter.
     * </ul>
     * OPTIONAL
     * <ul>
     *     <li>{Function} on_error:   Called when the database is unsuccessfully
     *                                opened. Should expect an object with two
     *                                keys: errorCode and event.
     * </ul>
     */
    open_db = function( opts ) {
        // Make sure we have the basic parameters. If there's opts.on_error is
        // not defined, this will throw an exception.
        if( !opts|| !opts.db_name || !opts.db_version || !opts.on_success ||
                !opts.on_upgrade){
            opts = opts || {};
            return raise_error("Missing parameters in call to open_db.", 
                opts.on_error);
        }

        // Open the database.
        var request = IndexedDB.open(opts.db_name, opts.db_version);

        // Invoked when there's an error.
        request.onerror = function(event){
            CROWDLOGGER.debug.log("Error opening database: "+ 
                event.target.errorCode);

            opts.on_error && opts.on_error({
                errorCode: event.target.errorCode, 
                event: event
            });
        };
        // Invoked if we were able to open the database.
        
        request.onsuccess = function(event){
            var db = request.result;

            // For older versions of chrome.
            if( parseInt(db.version) !== opts.db_version && db.setVersion ){
                var version_request = db.setVersion(opts.db_version);
                version_request.onsuccess = function(e){
                    opts.on_upgrade(db);
                    db.close();
                    open_db(opts);
                }
            } else {
                // Pass the db onto the caller.
                opts.on_success(db); 
            }

        };

        // Invoked if the database needs to be upgraded.
        request.onupgradeneeded = function(event){
            opts.on_upgrade(request.result);
        }; 

        return true;
    };

    /**
     * Creates a store in the given database. This can ONLY be called during
     * a database upgrade (i.e., in a function invoked by onupgradedneeded).
     * This sets the key path to "id" and turns on auto incrementing.
     *
     * @param {Object} opts  The options.
     * REQUIRED:
     * <ul>
     *     <li>{Object} db:             The database in which the table should 
     *                                  be created.
     *     <li>{string} store_name:     The name of the store.
     * </ul>
     * 
     * @return The created object store.
     *
     * @throws {Error} If the required opts fields are missing.
     */    
    create_store = function( opts ){
        if( !opts || !opts.db || !opts.store_name ){
            opts = opts || {};
            return raise_error("Missing parameters in call to create_store.", 
                opts.on_error);
        }

        return opts.db.createObjectStore(opts.store_name, 
            {keyPath: "id", autoIncrement: true});
    };

    /**
     * Truncates the given store in the database.
     *
     * @param {Object} opts  The options.
     * REQUIRED:
     * <ul>
     *     <li>{Object} db:             The database in which the table should 
     *                                  be created.
     *     <li>{string} store_name:     The name of the store.
     * </ul>
     * OPTIONAL:
     * <ul>
     *     <li>{function} on_error:     The function to call in the event of an
     *                                  error.
     *     <li>{function} on_success:   The function to call if the operation is
     *                                  successful.
     * </ul>
     * 
     * @throws {Error} If the required opts fields are missing.
     */
    truncate_store = function( opts ){
        if( !opts || !opts.db || !opts.store_name ){
            opts = opts || {};
            return raise_error("Missing parameters in call to truncate_store.", 
                opts.on_error);
        }

        return run_transaction({
            db: opts.db,
            stores: [opts.store_name],
            mode: READWRITE,
            f: function(t){
                t.objectStore(opts.store_name, READWRITE).clear();
            },
            on_error: function(event){
                CROWDLOGGER.debug.log("Error clearing "+ store_name +": "+ 
                    event.target.errorCode);

                if(opts.on_error){
                    opts.on_error({
                        errorCode: event.target.errorCode, 
                        event: event
                    });
                }
            },
            on_success: opts.on_success
        });
    };

    /**
     * Performs a transaction using the options specified.
     *
     * @example
     * data = {  }; // an item you want to store
     * open_db(on_error, function(db){
     *     var opts = {
     *         db: db,
     *         stores: [ACTIVITY_LOG_STORE_NAME],
     *         mode: "readwrite",
     *         f: function(t){
     *             var objectStore = t.objectStore(ACTIVITY_LOG_STORE_NAME);
     *             for (var i in data) {
     *                 var request = objectStore.put(data[i]);
     *                 request.onsuccess = function(event) {
     *                     // Do something.
     *                 };
     *             }
     *         },
     *         on_success: function(e){
     *             // Do something.
     *         }
     *     };
     *     run_transaction(opts);
     * });
     *
     * @param {Object} opts   A map of options. Options are:
     * REQUIRED:
     * <ul>
     *    <li>{Object} db:    The database object.
     *    <li>{Array} stores: The stores that the transaction will operate over.
     *    <li>{String} mode:  One of "readonly", "readwrite", or "versionchange".
     *    <li>{Function} f:   The function to invoke during the transaction.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{Function} on_success: Invoked when the transaction has finished.
     *    <li>{Function} on_error:   Invoked if an error occurs.
     * </ul>  
     * Note that f should expect a transaction object and should not make any 
     * async calls, otherwise the transaction will close.
     * @throws {Error} If the required opts fields are missing.
     */
    run_transaction = function( opts ){
        if( !opts || !opts.db || !opts.stores || !opts.mode || !opts.f ){
            opts = opts || {};
            return raise_error("Missing parameters in call to run_transaction.",
                opts.on_error);
        }

        var transaction = opts.db.transaction(opts.stores, opts.mode);

        // Invoked when the transaction has completed.
        transaction.oncomplete = function(event) {
          if( opts.on_success ){ opts.on_success(event); }
        };
        
        // Invoked when the transaction has errored.
        transaction.onerror = function(event) {
          if( opts.on_error){ opts.on_error(event); }
        };

        opts.f(transaction);

        return true;
    };

    /**
     * Deals with reporting an error either through an error handler (if it
     * exits) or by throwing an exception.
     * 
     * @param  {string} msg              The error message.
     * @param  {Function} error_handler  The error_handler (optional).
     * @throws {Error} If error_handler is not a function.
     */
    raise_error = function(msg, error_handler){
        if( error_handler ){
            error_handler({errorCode: msg});
        } else {
            throw new Error(msg);
        }
        return false;
    }

    /**
     * Makes a copy of the given object.
     * 
     * @param  {Object} obj  The object to copy.
     * @return {Object} A copy of obj.
     */
    copy_obj = function(obj){
        var new_obj = {}, i;
        if( obj ){
            for(i in obj){
                new_obj[i] = obj[i];
            }
        }
        return new_obj;
    };
    // ******* END PRIVATE FUNCTIONS ********* //    
};
}
