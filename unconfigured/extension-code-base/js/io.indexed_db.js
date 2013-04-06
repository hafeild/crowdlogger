/**
 * @fileOverview Provides functions to access to data stored in IndexedDB 
 * databases.
 * 
 * See the  CROWDLOGGER.io.log namespace.<p>
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
 * @return {object} An object with several publicly accessible functions for 
 *   reading from
 *         and writing to IndexedDB databases.
 */
CROWDLOGGER.io.IndexedDB = function(crowdlogger){
    // Private functions.
    var create_table, clear_log, write_to_db, read_from_db, open_db, 
        write_to_log, read_log, run_transaction, foreach_entry,
        raise_error, on_crowlogger_db_upgraded, on_extension_db_upgraded,
        create_store, truncate_store, update_log, get_range, read_log_cursor,
        db_cursor_chunk, get_entry_from_index;

    // Some constants
    const DATABASE_NAME = 'crowdlogger',
        EXTENSION_DATABASE_NAME = 'crowdlogger_extensions',
        EXTENSION_STORE_NAME = 'data',
        ACTIVITY_LOG_STORE_NAME = 'activity_log',
        ERROR_LOG_STORE_NAME = 'error_log',
        CLRM_STORE_NAME = 'clrms',
        CLRM_INDEX_NAME = 'clrmid'
        CLRM_INDEX_KEY = 'clrmid'
        DATABASE_SIZE = 10 * 1024 * 1024, // 10 MB
        VERSION = 2,
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
        MAX_CHUNK_SIZE = 200,
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
    this.write_to_error_log;
    this.write_to_activity_log;
    this.log;
    this.write_to_extension_log;
    this.write_to_clrm_db;

    // Updaters. For modifying or deleting batches of entries.
    this.update_error_log;
    this.update_activity_log;
    this.update_extension_log;
    this.update_clrm_db;

    // Readers. For reading all or subsets of entries.
    this.read_error_log;
    this.read_activity_log;
    this.read_extension_log;
    this.read_clrm_db;
    this.get_clrm_entry;

    // Clearers. For dropping entire tables.
    this.clear_error_log;
    this.clear_activity_log;
    this.clear_extension_log
    this.clear_clrm_db;

    // Accessors.
    this.get_version;
    this.list_stores;
    this.remove_database;
    this.remove_cl_database;
    this.upgrade_db;

    this.IOLogException;

    // Public variables.
    this.version = VERSION;

    // ******* BEGIN PUBLIC FUNCTIONS ********* //

    /**
     * A wrapper for an error message; to be thrown and invoked with new.
     *
     * @param {string} message  The error message.
     */
    this.IOLogException = function(message){
        this.message = message;
    };

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
     *    <li>{function} on_success:      Invoked when writing is complete.
     *    <li>{function} on_error:        Invoked if there's an error.
     * </ul>  
     * 
     * @throws {Error} If the required opts fields are not present.
     */
    this.write_to_error_log = function( opts ){
        if( opts && typeof opts === "string" ){
            opts = {data: opts};
        }

        opts = crowdlogger.util.copy_obj(opts);
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
     *    <li>{function} on_success:      Invoked when writing is complete.
     *    <li>{function} on_error:        Invoked if there's an error.
     * </ul>  
     * 
     * @throws {Error} If the required opts fields are not present.
     */
    this.write_to_activity_log = function( opts ){
        opts = crowdlogger.util.copy_obj(opts);
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
     *     <li>{string} data:             An array of data objects to write to 
     *                                    the database.
     * </ul> 
     * OPTIONAL:
     * <ul>
     *     <li>{int} db_version:          The version of the db.
     *     <li>{string} store_name:       The name of the table to create.
     *     <li>{function} on_upgrade:     Invoked if the database needs to be 
     *                                    updated.
     *    <li>{function} on_success:      Invoked when writing is complete.
     *    <li>{function} on_error:        Invoked if there's an error.
     * </ul>  
     * 
     * @throws {Error} If the required opts fields are not present.
     */
    this.write_to_extension_log = function( opts ){
        opts = crowdlogger.util.copy_obj(opts);
        if( !opts.db_name || !opts.data ){
            return raise_error(
                "Missing parameters in call to write_to_extension_log.", 
                opts.on_error);
        }
        opts.on_upgrade = opts.on_upgrade || on_extension_db_upgraded;
        opts.store_name = opts.store_name || EXTENSION_STORE_NAME;

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
     *    <li>{function} on_success:      Invoked when writing is complete.
     *    <li>{function} on_error:        Invoked if there's an error.
     * </ul>  
     * 
     * @throws {Error} If the required opts fields are not present.
     */
    this.write_to_clrm_db = function( opts ){
        opts = crowdlogger.util.copy_obj(opts);
        if( !opts.data ){
            return raise_error(
                "Missing parameters in call to write_to_clrm_db.", 
                opts.on_error);
        }

        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_name = CLRM_STORE_NAME;

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
     * @param {object} opts     A map consisting of several options, including:
     * REQUIRED:
     * <ul>
     *    <li>{function} foreach:         A function to run on each entry. It
     *                                    should take an entry object as its
     *                                    only parameter and optionally return
     *                                    an object with three optional fields:
     *                                    entry (new data, ids must match),
     *                                    stop (true or false),
     *                                    delete (true or false).
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success:      A function to call when all data
     *                                    has been processed.
     *    <li>{function} on_error:        Invoked when an error occurs.
     * </ul>
     */
    this.update_activity_log = function( opts ){
        opts = crowdlogger.util.copy_obj(opts);
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
     * @param {object} opts     A map consisting of several options, including:
     * REQUIRED:
     * <ul>
     *    <li>{function} foreach:         A function to run on each entry. It
     *                                    should take an entry object as its
     *                                    only parameter and optionally return
     *                                    an object with three optional fields:
     *                                    entry (new data, ids must match),
     *                                    stop (true or false),
     *                                    delete (true or false).
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success:      A function to call when all data
     *                                    has been processed.
     *    <li>{function} on_error:        Invoked when an error occurs.
     * </ul>
     */
    this.update_error_log = function( opts ){
        opts = crowdlogger.util.copy_obj(opts);
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
     * @param {object} opts     A map consisting of several options, including:
     * REQUIRED:
     * <ul>
     *    <li>{string} db_name:           The database name.
     *    <li>{function} foreach:         A function to run on each entry. It
     *                                    should take an entry object as its
     *                                    only parameter and optionally return
     *                                    an object with three optional fields:
     *                                    entry (new data, ids must match),
     *                                    stop (true or false),
     *                                    delete (true or false).
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{int} db_version:           The version of the db.     
     *    <li>{function} on_upgrade:      Invoked if the database needs to be 
     *                                    updated.
     *    <li>{string} store_name:        The name of the store to read.     
     *    <li>{function} on_success:      A function to call when all data
     *                                    has been processed.
     *    <li>{function} on_error:        Invoked when an error occurs.
     *    <li>{int} lower_bound:          Smallest id to retrieve. Default: 0
     *    <li>{int} upper_bound:          Largest id to retrieve. 
     *                                    Default:undefined (all ids > 
     *                                    lower_bound are retrieved).
     * </ul>
     */
    this.update_extension_log = function( opts ){
        opts = crowdlogger.util.copy_obj(opts);
        if( !opts.foreach  || !opts.db_name ){
            return raise_error(
                'Missing parameters in call to update_extension_log.',
                opts.on_error)
        }
        opts.on_upgrade = opts.on_upgrade || on_extension_db_upgraded;
        opts.store_name = opts.store_name || EXTENSION_STORE_NAME;

        // Read the data and send it to callback.
        return update_log( opts );
    }

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
     * @param {object} opts     A map consisting of several options, including:
     * REQUIRED:
     * <ul>
     *    <li>{function} foreach:         A function to run on each entry. It
     *                                    should take an entry object as its
     *                                    only parameter and optionally return
     *                                    an object with three optional fields:
     *                                    entry (new data, ids must match),
     *                                    stop (true or false),
     *                                    delete (true or false).
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success:      A function to call when all data
     *                                    has been processed.
     *    <li>{function} on_error:        Invoked when an error occurs.
     * </ul>
     */
    this.update_clrm_db = function( opts ){
        opts = crowdlogger.util.copy_obj(opts);
        if( !opts.foreach ){
            return raise_error(
                'Missing parameters in call to update_clrm_db.',
                opts.on_error)
        }
        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_name = CLRM_STORE_NAME;

        // Read the data and send it to callback.
        return update_log( opts );
    };

    // ** CLEARERS ** //
    /**
     * Truncates the activity log store.
     * 
     * @param {object} opts        A map of options:
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success:   Invoked when everything has been read.
     *    <li>{function} on_error:     Invoked if there's an error.
     * </ul>     
     */
    this.clear_activity_log = function( opts ) {
        opts = crowdlogger.util.copy_obj(opts);
        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_names = [ACTIVITY_LOG_STORE_NAME];

        // Clear the log.
        return clear_log( opts );
    };    

    /**
     * Truncates the error log store.
     * 
     * @param {object} opts        A map of options:
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success:   Invoked when everything has been read.
     *    <li>{function} on_error:     Invoked if there's an error.
     * </ul>     
     */
    this.clear_error_log = function( opts ) {
        opts = crowdlogger.util.copy_obj(opts);
        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_names = [ERROR_LOG_STORE_NAME];

        // Clear the log.
        return clear_log( opts );
    };

    /**
     * Truncates an extension store.
     * 
     * @param {object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} db_name:        The database name.
     *    <li>{string} store_names:    The names of the stores to clear.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{int} db_version:        The version of the db.
     *    <li>{function} on_upgrade:   Invoked if the database needs to be 
     *                                 updated.
     *    <li>{function} on_success:   Invoked when everything has been cleared.
     *    <li>{function} on_error:     Invoked if there's an error.
     * </ul>
     * 
     * @throws {Error} If required opts fields are missing.
     */
    this.clear_extension_log = function( opts ) {
        opts = crowdlogger.util.copy_obj(opts);
        crowdlogger.util.check_args(opts, ['db_name', 'store_names'], 
            'clear_extension_log', that.IOLogException, true);

        opts.on_upgrade = opts.on_upgrade || on_extension_db_upgraded;
        //opts.store_name = opts.store_name || EXTENSION_STORE_NAME;

        // Read the data and send it to callback.
        return clear_log( opts );
    };

    /**
     * Truncates the CLRM store.
     * 
     * @param {object} opts        A map of options:
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success:   Invoked when everything has been read.
     *    <li>{function} on_error:     Invoked if there's an error.
     * </ul>     
     */
    this.clear_clrm_db = function( opts ) {
        opts = crowdlogger.util.copy_obj(opts);
        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_names = [CLRM_STORE_NAME];

        // Clear the log.
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
     * @param {object} opts        A map of additional options:
     * REQUIRED:
     * <ul>
     *    <li>{function} on_chunk:     Invoked per chunk (see below). Chunks
     *                                 are processed asynchronously.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success:   Invoked when everything has been read.
     *    <li>{function} on_error:     Invoked if there's an error.
     *    <li>{int} chunk_size:        The size of the chunks to process. E.g.,
     *                                 chunk_size = 50 will cause 50 entries to
     *                                 be read, stored in an array, and then
     *                                 passed to the on_chunk function. Max is
     *                                 200.
     *    <li>{bool} reverse:          If true, the data will be read in reverse
     *                                 order of id. Default is 'false'.
     *    <li>{int} lower_bound:       The smallest id to retrieve; default: 0
     *    <li>{int} upper_bound:       The largest id to retrieve; default: -1
     *                                 (all ids >= lower_bound are retrieved).
     * </ul>
     */
    this.read_error_log = function( opts ){
        opts = crowdlogger.util.copy_obj(opts);
        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_name = ERROR_LOG_STORE_NAME;
        opts.chunk_size = Math.min( (opts.chunk_size || MAX_CHUNK_SIZE), 
            MAX_CHUNK_SIZE);

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
     * @param {object} opts        A map of additional options:
     * REQUIRED:
     * <ul>
     *    <li>{function} on_chunk:     Invoked per chunk (see below). Chunks
     *                                 are processed asynchronously.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success:   Invoked when everything has been read.
     *    <li>{function} on_error:     Invoked if there's an error.
     *    <li>{int} chunk_size:        The size of the chunks to process. E.g.,
     *                                 chunk_size = 50 will cause 50 entries to
     *                                 be read, stored in an array, and then
     *                                 passed to the on_chunk function. Max size
     *                                 is 200.
     *    <li>{bool} reverse:          If true, the data will be read in reverse
     *                                 order of id. Default is 'false'.
     *    <li>{int} lower_bound:       The smallest id to retrieve; default: 0
     *    <li>{int} upper_bound:       The largest id to retrieve; default: -1
     *                                 (all ids >= lower_bound are retrieved).
     * </ul>
     */
    this.read_activity_log = function( opts ){
        opts = crowdlogger.util.copy_obj(opts);
        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_name = ACTIVITY_LOG_STORE_NAME;
        opts.chunk_size = Math.min( (opts.chunk_size || MAX_CHUNK_SIZE), 
            MAX_CHUNK_SIZE);        

        // Read the data and send it to callback.
        return read_log( opts );
    };   

    /**
     * Reads the CLRM store and sends the data to the given callback
     * (on_chunk) function. The callback should expect an array of data db
     * entries and a next callback. If chunk_size > 0, then invoking 'next' will
     * cause the next chunk of data to be read in.
     *
     * @function
     * @member CROWDLOGGER.io.indexed_db
     *
     * @param {object} opts        A map of additional options:
     * REQUIRED:
     * <ul>
     *    <li>{function} on_chunk:     Invoked per chunk (see below). Chunks
     *                                 are processed asynchronously.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success:   Invoked when everything has been read.
     *    <li>{function} on_error:     Invoked if there's an error.
     *    <li>{int} chunk_size:        The size of the chunks to process. E.g.,
     *                                 chunk_size = 50 will cause 50 entries to
     *                                 be read, stored in an array, and then
     *                                 passed to the on_chunk function. Max size
     *                                 200.
     *    <li>{bool} reverse:          If true, the data will be read in reverse
     *                                 order of id. Default is 'false'.
     *    <li>{int} lower_bound:       The smallest id to retrieve; default: 0
     *    <li>{int} upper_bound:       The largest id to retrieve; default: -1
     *                                 (all ids >= lower_bound are retrieved).
     * </ul>
     */
    this.read_clrm_db = function( opts ){
        opts = crowdlogger.util.copy_obj(opts);
        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_name = CLRM_STORE_NAME;
        opts.chunk_size = Math.min( (opts.chunk_size || MAX_CHUNK_SIZE), 
            MAX_CHUNK_SIZE);

        // Read the data and send it to callback.
        return read_log( opts );
    }; 


    /**
     * Reads the activity log store and sends the data to the given callback
     * (on_chunk) function. The callback should expect an array of data db
     * entries and a next callback. If chunk_size > 0, then invoking 'next' will
     * cause the next chunk of data to be read in. This is different from 
     * read_activity_log in that the caller can easily go forwards, backwards,
     * and jump to an id with this function. Moreover, reaching the end does
     * not mean that the on_success function will be invoked.
     *
     *
     * @function
     * @member CROWDLOGGER.io.indexed_db
     *
     * @param {object} opts        A map of additional options:
     * REQUIRED:
     * <ul>
     *    <li>{function} on_chunk:     Invoked per chunk (see below). Chunks
     *                                 are processed asynchronously.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success:   Invoked when everything has been read.
     *    <li>{function} on_error:     Invoked if there's an error.
     *    <li>{int} chunk_size:        The size of the chunks to process. E.g.,
     *                                 chunk_size = 50 will cause 50 entries to
     *                                 be read, stored in an array, and then
     *                                 passed to the on_chunk function. If <=0,
     *                                 100 entries will be read in before 
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
    this.cursor_activity_log = function( opts ){
        opts = crowdlogger.util.copy_obj(opts);
        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_name = ACTIVITY_LOG_STORE_NAME;

        return read_log_cursor( opts );
    } ;

    /**
     * Reads data from a CrowdLogger extension file. This is pretty extensible,
     * allowing the caller to have control over how a new database is
     * constructed, though a default is supplied.
     *
     * @function
     * @member CROWDLOGGER.io.indexed_db
     *
     * @param {object} opts        A map of additional options:
     * REQUIRED:
     * <ul>
     *    <li>{string} db_name:        The database name.
     *    <li>{function} on_chunk:     Invoked per chunk (see below). Chunks
     *                                 are processed asynchronously.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{int} db_version:        The version of the db.
     *    <li>{function} on_upgrade:   Invoked if the database needs to be 
     *                                 updated.
     *    <li>{string} store_name:     The name of the store to read.
     *    <li>{function} on_success:   Invoked when everything has been read.
     *    <li>{function} on_error:     Invoked if there's an error.
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
        opts = crowdlogger.util.copy_obj(opts);
        if( !opts.db_name || !opts.on_chunk ){
            return raise_error(
                "Missing parameters in call to read_extension_log.",
                opts.on_error);
        }

        opts.on_upgrade = opts.on_upgrade || on_extension_db_upgraded;
        opts.store_name = opts.store_name || EXTENSION_STORE_NAME;

        // Read the data.
        return read_log( opts );
    }; 

    /**
     * Retrieves the CLRM entry with the specified clrmid name, if it exists.
     * 
     * @param {object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} clrmid:       The id of the CLRM entry to get.
     *    <li>{function} on_success: Invoked when everything has been read.
     *                               Should expect the matching entry.
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_error:   Invoked if there's an error.
     * </ul>     
     */
    this.get_clrm_entry = function( opts ){
        opts = crowdlogger.util.copy_obj(opts);
        if( !opts.on_success || !opts.clrmid ){
            return raise_error(
                "Missing parameters in call to get_clrm_entry.",
                opts.on_error);
        }

        opts = crowdlogger.util.copy_obj(opts);
        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_name = CLRM_STORE_NAME;
        opts.key = opts.clrmid;
        opts.index_name = CLRM_INDEX_NAME;

        // Read the data.
        return get_entry_from_index( opts );
    };

    /**
     * Retrieves an entry from a store with an index.
     *
     * @param {function} opts      A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{object} db_name:    The name of the database.
     *     <li>{String} store_name: The store name.
     *     <li>{function} on_success: Called with the entry as a parameter. 
     *     <li>{string} index_name: The name of the index.
     *     <li>{string} key:        The key of the entry to look up.
     *     <li>{function} on_upgrade: Invoked if the database needs to be 
     *                              updated.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_error:  What to call when there's an error. 
     * </ul>
     * 
     * @throws {Error} If there are missing required opts fields.
     */
    this.get_indexed_entry = function( opts ){
        opts = crowdlogger.util.copy_obj(opts);
        if( !opts.db_name || !opts.on_success || !opts.key || !opts.index_name
                || !opts.store_name ){
            return raise_error(
                "Missing parameters in call to get_indexed_entry.",
                opts.on_error);
        }

        opts = crowdlogger.util.copy_obj(opts);

        // Read the data.
        return get_entry_from_index( opts );
    };

    /**
     * Gets the version of the specified database.
     * 
     * @param {object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} db_name:        The name of the database whose version
     *                                 should be retrieved.
     *    <li>{function} on_success:   Invoked when everything has been read.
     *                                 Should expect the version number as a
     *                                 parameter.
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_error:     Invoked if there's an error.
     * </ul>     
     */
    this.get_version = function( opts ){
        if( !opts || !opts.db_name  || !opts.on_success ){
            return raise_error(
                "Missing parameters in call to get_version.",
                opts.on_error);
        }

        if( is_database_opened(opts.db_name) ){
            opts.on_success(db_connections[opts.db_name].version);
        } else {
            open_db({ 
                on_success: function(){
                    opts.on_success(db_connections[opts.db_name].version);
                },
                on_error: opts.on_error,
                db_name: opts.db_name
            });
        }
    };

    /**
     * Gets the stores contained in the specified database.
     * 
     * @param {object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} db_name:        The name of the database whose stores
     *                                 should be retrieved.
     *    <li>{function} on_success:   Invoked when everything has been read.
     *                                 Should expect the array of store names 
     *                                 as a parameter.
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_error:     Invoked if there's an error.
     * </ul>     
     */
    this.list_stores = function( opts ){
        if( !opts || !opts.db_name  || !opts.on_success ){
            return raise_error(
                "Missing parameters in call to list_stores.",
                opts.on_error);
        }

        if( is_database_opened(opts.db_name) ){
            opts.on_success(crowdlogger.util.copy(
                    db_connections[opts.db_name].objectStoreNames) || []);
        } else {
            open_db({ 
                on_success: function(){
                    opts.on_success(crowdlogger.util.copy(
                            db_connections[opts.db_name].objectStoreNames));
                },
                on_error: opts.on_error,
                db_name: opts.db_name
            });
        }
    };

    /**
     * Removes the specified database.
     * 
     * @param {object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} db_name:        The name of the database to delete.
     *                                 This cannot be the name of the primary
     *                                 CrowdLogger database.
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success:   Invoked when everything has been read.
     *                                 Should expect the array of store names 
     *                                 as a parameter.
     *    <li>{function} on_error:     Invoked if there's an error.
     * </ul>     
     */
    this.remove_database = function(opts){
        if( !opts || !opts.db_name ){
            return raise_error(
                "Missing parameters in call to remove_database.",
                opts.on_error);
        }

        //if( opts.db_name !== DATABASE_NAME ){
            if(db_connections[opts.db_name]){
                db_connections[opts.db_name].close();
                delete db_connections[opts.db_name];
            }

            var request = IndexedDB.deleteDatabase(opts.db_name);
            request.onsuccess = function(){
                if(opts.on_success){ opts.on_success(); }
            };
            request.onerror = function(event){
                if(opts.on_error){ opts.on_error({
                    errorCode: event.target.errorCode}); }
            };
        //}
    }

    /**
     * Removes the CrowdLogger database (home of the activity log,
     * CLRM info, and error log).
     * 
     * @param {object} opts        A map of options:
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success:   Invoked when everything has been read.
     *                                 Should expect the array of store names 
     *                                 as a parameter.
     *    <li>{function} on_error:     Invoked if there's an error.
     * </ul>     
     */
    this.remove_cl_database = function(opts){
        opts = opts || {};
        that.remove_database({
            db_name: DATABASE_NAME,
            on_success: opts.on_success,
            on_error: opts.on_error
        });
    }


    /**
     * Upgrades a database. The version is automatically detected and 
     * incremented.
     *
     * @param {object} opts     A map of options.
     * REQUIRED:
     * <ul>
     *    <li>{string} db_name:        The name of the database to delete.
     *                                 This cannot be the name of the primary
     *                                 CrowdLogger database.
     *    <li>{function} on_success:   Invoked when everything has been read.
     *                                 Should expect the array of store names 
     *                                 as a parameter.
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_error:     Invoked if there's an error.
     * </ul>    
     *     
     */
    this.upgrade_db = function( opts ){
        if( !opts || !opts.db_name  || !opts.on_success ){
            return raise_error(
                "Missing parameters in call to list_stores.",
                opts.on_error);
        }


        if( is_database_opened(opts.db_name) ){
            var version = db_connections[opts.db_name].version;
            db_connections[opts.db_name].close();
            delete db_connections[opts.db_name];
            open_db({ 
                on_upgrade: opts.on_upgrade,
                on_success: function(){
                    opts.on_success();
                },
                on_error: opts.on_error,
                db_name: opts.db_name,
                db_version: version+1
            });
        } else {
            open_db({ 
                on_success: function(){
                    that.upgrade_db(opts);
                },
                on_error: opts.on_error,
                db_name: opts.db_name
            });
        }
    };
    // ******* END PUBLIC FUNCTIONS ********* //


    // ******* BEGIN PRIVATE FUNCTIONS ********* //

    is_database_opened = function(db_name, version){
        return  db_connections[db_name] && 
            (db_connections[db_name].version === version || !version ) 
    };

    add_database_connection = function(db){
        if( db_connections[db.name] ){
            db_connections[db.name].close;
        }

         db_connections[db.name] = db;
    };

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
        var store = create_store({
            db: db,
            store_name: CLRM_STORE_NAME
        });
        if( store ){
            store.createIndex(CLRM_INDEX_NAME, CLRM_INDEX_KEY, {unique: true});
        }        
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
     * @param {object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{string} db_name:          The name of the database to open.
     *     <li>{function} on_upgrade:     Invoked if the database needs to be 
     *                                    updated.
     *     <li>{string} store_names:      The names of the stores to clear.
     * </ul>
     * OPTIONAL:
     * <ul>
     *     <li>{int} db_version:          The version of the db.
     *     <li>{function} on_error:       Invoked on an error.
     *     <li>{function} on_success:     Invoked on success.
     * </ul>     
     *
     * @throws {Error} If required opts fields are missing.
     */
    clear_log = function( opts ) {
        if( !opts || !opts.db_name || !opts.store_names ){ 
            opts = opts || {};
            return raise_error("Missing parameters in call to clear_log.", 
                opts.on_error);
        }

        if( !is_database_opened(opts.db_name) ){
            return open_db({
                db_name: opts.db_name,
                db_version: opts.db_version,
                on_upgrade: opts.on_upgrade,
                on_error: opts.on_error,
                on_success: function(db){
                    // add_database_connection(db);
                    clear_log(opts);
                }
            });
        }

        return truncate_store({
            db: db_connections[opts.db_name], 
            store_names: opts.store_names,
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
     * @param {object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{string} db_name:          The name of the database to open.
     *     <li>{function} on_upgrade:     Invoked if the database needs to be 
     *                                    updated.
     *     <li>{string} store_name:       The name of the table to create.
     *     <li>{string} data:             The data to write to the database.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{int} db_version:          The version of the db.
     *    <li>{function} on_success:      Invoked when writing is complete.
     *    <li>{function} on_error:        Invoked if there's an error.
     * </ul>
     * @throws {Error} If the required opts fields are missing.
     */
    write_to_log = function( opts ){
        if( !opts || !opts.db_name || !opts.on_upgrade || 
                !opts.data || !opts.store_name ){ 
            opts = opts || {};
            return raise_error("Missing parameters in call to write_to_log.", 
                opts.on_error);
        }

        if( !is_database_opened(opts.db_name, opts.db_version) ){
            return open_db({
                db_name: opts.db_name,
                db_version: opts.db_version,
                on_upgrade: opts.on_upgrade,
                on_error: opts.on_error,
                on_success: function(db){
                    // add_database_connection(db);
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
     * @param {object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{string} db_name:          The name of the database to open.
     *     <li>{function} on_upgrade:     Invoked if the database needs to be 
     *                                    updated.
     *     <li>{string} store_name:       The name of the table to create.
     *     <li>{function} foreach:        A function to run on each entry. It
     *                                    should take an entry object as its
     *                                    only parameter and optionally return
     *                                    an object with three optional fields:
     *                                    entry (new data, ids must match),
     *                                    stop (true or false),
     *                                    delete (true or false).
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{int} db_version:          The version of the db.
     *    <li>{function} on_success:     Invoked when updating is complete.
     *    <li>{function} on_error:       Invoked if there's an error.
     *    <li>{int} lower_bound:         Smallest id to retrieve. Default: 0
     *    <li>{int} upper_bound:         Largest id to retrieve. 
     *                                   Default:undefined (all ids > 
     *                                   lower_bound are retrieved).
     * </ul>
     * @throws {Error} If the required opts fields are missing.
     */
    update_log = function( opts ){
        if( !opts || !opts.db_name || !opts.on_upgrade || 
                !opts.foreach || !opts.store_name ){ 
            opts = opts || {};
            return raise_error("Missing parameters in call to update_log.", 
                opts.on_error);
        }

        if( !is_database_opened(opts.db_name, opts.db_version) ){
            return open_db({
                db_name: opts.db_name,
                db_version: opts.db_version,
                on_upgrade: opts.on_upgrade,
                on_error: opts.on_error,
                on_success: function(db){
                    // add_database_connection(db);
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
            on_error: opts.on_error,
            range: get_range(opts.upper_bound, opts.lower_bound)
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
     * @param {object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} db_name:        The database name.
     *    <li>{function} on_upgrade:   Invoked if the database needs to be 
     *                                 updated.
     *    <li>{string} store_name:     The name of the store to read.
     *    <li>{function} on_chunk:     Invoked per chunk (see below). Chunks
     *                                 are processed asynchronously.
     * </ul>             
     * OPTIONAL:
     * <ul>
     *    <li>{int} db_version:        The version of the db.                      
     *    <li>{function} on_success:   Invoked when everything has been read.
     *    <li>{function} on_error:     Invoked if there's an error.
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
        opts = crowdlogger.util.copy_obj(opts);
        if( !opts.db_name|| !opts.on_upgrade ||
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
                    // add_database_connection(db);
                    read_log(opts);
                }
            });
        }
    };

    /**
     * Generates an IDBKeyRange for the given bounds.
     *
     * @param {int} upper The upper bound id. Defaults to 0 if undefined.
     * @param {int} lower The lower bound id. Defaults to infinity if undefined.
     *
     * @return An IDBKeyRank for the given range.
     */
    get_range = function(upper, lower) {
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
    };

    /**
     * Reads the given store. 
     * @function
     * @private
     * @member CROWDLOGGER.io.indexed_db
     *
     * @param {object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{object} db:            The database.
     *     <li>{string} store_name:    The name of the store to read.
     *     <li>{function} on_chunk:    Invoked per chunk (see below). Chunks
     *                                 are processed asynchronously. Should 
     *                                 expect the data, a 'next' function
     *                                 which, when invoked, will retrieve
     *                                 the next chunk, and an 'abort' function,
     *                                 which will close things up and invoke the
     *                                 on_success function if passed nothing,
     *                                 on_error if passed 'true, errorMsg'.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success:   Invoked when everything has been read
     *                                 and processed by on_chunk.
     *                                 Note that the 'next' function needs to
     *                                 be invoked from the on_chunk function
     *                                 in order for this to trigger.
     *    <li>{function} on_error:     Invoked if there's an error.
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


        // This is a wrapper to assist with the issue of closures. If we just
        // pass batch to opts.on_chunk, then opts.on_chunk will get whatever
        // version of the buffer exists at the time of its execution, not
        // invocation. This wrapper freezes it, so to speak, so that the version
        // at invocation is the same as the version at execution.
        function on_chunk(b){
            return function(){ opts.on_chunk(b, next_chunk, abort); }
        }

        function abort(is_error, error_msg){
            finished = true;
            if( is_error && opts.on_error ){
                setTimeout( function(){opts.on_error( error_msg );}, T );
            } else if( !is_error && opts.on_success ){
                setTimeout( opts.on_success, T );
            }
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
                        } else if( opts.on_success ){
                            setTimeout(opts.on_success, T);
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
     * This is a generic read function that will take care of opening
     * a database, creating the table (if need be), and reading the given
     * data from it.
     * @function
     * @private
     * @member CROWDLOGGER.io.indexed_db
     *
     * @param {object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} db_name:        The database name.
     *    <li>{function} on_upgrade:   Invoked if the database needs to be 
     *                                 updated.
     *    <li>{string} store_name:     The name of the store to read.
     *    <li>{function} on_chunk:     Invoked per chunk. Chunks
     *                                 are processed asynchronously. Gives
     *                                 options to move forward, backwards, or
     *                                 abort.
     * </ul>             
     * OPTIONAL:
     * <ul>
     *    <li>{int} db_version:        The version of the db.                      
     *    <li>{function} on_success:   Invoked when everything has been read.
     *    <li>{function} on_error:     Invoked if there's an error.
     *    <li>{int} chunk_size:        The size of the chunks to process. E.g.,
     *                                 chunk_size = 50 will cause 50 entries to
     *                                 be read, stored in an array, and then
     *                                 passed to the on_chunk function. If <=0,
     *                                 100 entries will be read in before 
     *                                 calling on_chunk. This is approximate
     *                                 because ranges are used and therefore
     *                                 deleted items within that range will not
     *                                 be read (their id's are not reused). 
     *                                 Default: 100.
     *    <li>{bool} reverse:          If true, the data will be read in reverse
     *                                 order of id. Default is 'false'.
     *    <li>{int} lower_bound:       The smallest id to retrieve; default: 0
     *    <li>{int} upper_bound:       The largest id to retrieve; default: -1
     *                                 (all ids >= lower_bound are retrieved).
     * </ul>
     *
     * @throws {Error} If required opts fields are missing.
     */
    read_log_cursor = function( opts ){
        opts = crowdlogger.util.copy_obj(opts);
        if( !opts.db_name|| !opts.on_upgrade ||
                !opts.store_name || !opts.on_chunk ){ 
            return raise_error("Missing parameters in call to read_log_cursor.", 
                opts.on_error);
        }

        if( db_connections[opts.db_name] ){
            opts.chunk_size = opts.chunk_size===undefined? 100:opts.chunk_size;
            opts.db = db_connections[opts.db_name];
            return db_cursor_chunk(opts);
        } else {
            return open_db({
                db_name: opts.db_name,
                db_version: opts.db_version,
                on_upgrade: opts.on_upgrade,
                on_error: opts.on_error,
                on_success: function(db){
                    // add_database_connection(db);
                    read_log_cursor(opts);
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
     * @param {object} opts        A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{object} db:            The database.
     *     <li>{string} store_name:    The name of the store to read.
     *     <li>{function} on_chunk:    Invoked per chunk (see below). Chunks
     *                                 are processed asynchronously. Should 
     *                                 expect an object:
     *                                 <ul>
     *                                    <li>{array} batch:  the entries
     *                                    <li>{function} forward: moves to the
     *                                            next chunk
     *                                    <li>{function} backward: moves to the
     *                                            previous chunk
     *                                    <li>{function} jump(id): moves to the
     *                                            given id
     *                                    <li>{function} abort: will close 
     *                                            things up and invoke the
     *                                            on_success function if passed 
     *                                            nothing, on_error if passed 
     *                                            'true, errorMsg'.
     *                                </ul>
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success:   Invoked when everything has been read
     *                                 and processed by on_chunk.
     *                                 Note that the 'next' function needs to
     *                                 be invoked from the on_chunk function
     *                                 in order for this to trigger.
     *    <li>{function} on_error:     Invoked if there's an error.
     *    <li>{int} chunk_size:        The size of the chunks to process. E.g.,
     *                                 chunk_size = 50 will cause 50 entries to
     *                                 be read, stored in an array, and then
     *                                 passed to the on_chunk function. If <=0,
     *                                 100 entries will be read in before 
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
    db_cursor_chunk = function( opts ){
        if( !opts || !opts.db || !opts.store_name || !opts.on_chunk ){
            opts = opts || {};
            return raise_error("Missing parameters in call to read_from_db.", 
                opts.on_error);
        }

        const FORWARD = 0,
              BACKWARD = 1,
              JUMP = 2;

        var upper_bound = opts.upper_bound, 
            lower_bound = opts.lower_bound,
            resent = false,
            last_call = FORWARD,
            nothing_sent = false,
            end_reached = false;
            aborted = false;


        // This is a wrapper to assist with the issue of closures. If we just
        // pass batch to opts.on_chunk, then opts.on_chunk will get whatever
        // version of the buffer exists at the time of its execution, not
        // invocation. This wrapper freezes it, so to speak, so that the version
        // at invocation is the same as the version at execution.
        function on_chunk(b){
            var f;
            var params = {
                batch: b,
                abort: abort,
                jump: jump
            };

            nothing_sent = b.length === 0;

            // If there's nothing to send, we're in one of two cases:
            //  1. we've run off the end
            //  2. there's nothing in the db
            // This top part takes care of case 1. Case 2 is handled below --
            // we send nothing and don't set the 'sent_upper/lower_bound' 
            // variables.
            if( nothing_sent && sent_upper_bound !== undefined ){
                lower_bound = sent_lower_bound;
                upper_bound = sent_upper_bound;
                resent = true;
                f = function(){ next_chunk(opts.reverse) };
            } else {
                end_reached = b.length < opts.chunk_size;
                // Decide whether to provide forward/backward capabilities.
                if( resent || end_reached ){
                    if( last_call !== FORWARD ){
                        params.forward = forward;
                    } else if( last_call !== BACKWARD ){
                        params.backward = backward
                    }
                } else {
                    params.forward = forward;
                    params.backward = backward;
                }

                resent = false;
                f = function(){ opts.on_chunk(params) };
                if( !nothing_sent ){
                    sent_upper_bound = Math.max(b[0].id,b[b.length-1].id);
                    sent_lower_bound = Math.min(b[0].id,b[b.length-1].id);
                }
            }
            return f;
        }

        function abort(is_error, error_msg){
            aborted = true;
            if( is_error && opts.on_error ){
                setTimeout( function(){opts.on_error( error_msg );}, T );
            } else if( !is_error && opts.on_success ){
                setTimeout( opts.on_success, T );
            }
        }

        function forward(){
            crowdlogger.debug.log('In forward;');
            last_call = FORWARD;
            if( opts.reverse ){
                upper_bound = sent_lower_bound-1;
                lower_bound = 0;
                next_chunk(true);
            } else {
                upper_bound = undefined;
                lower_bound = sent_upper_bound+1;
                next_chunk(false);
            }            
        }

        function backward(){
            crowdlogger.debug.log('In backward;');
            last_call = BACKWARD;
            if( opts.reverse ){
                upper_bound = undefined;
                lower_bound = sent_upper_bound+1;
                next_chunk(false, true);
            } else {
                upper_bound = sent_lower_bound-1;
                lower_bound = 0;
                next_chunk(true, true);
            }
        }

        function jump(id){
            crowdlogger.debug.log('In jump;');
            last_call = JUMP;
            if( opts.reverse ){
                upper_bound = id;
                lower_bound = 0;
            } else {
                upper_bound = undefined;
                lower_bound = id;
            }
            next_chunk(opts.reverse);
        }

        // Process one chunk.
        function next_chunk(reverse, unshift){
            if( aborted ){
                if( opts.on_success ){
                    setTimeout(opts.on_success, T);
                }
                return;                
            }

            // This will hold the batches of items. 
            var batch = [],
                sent = false;

            crowdlogger.debug.log('In next_chunk; '+
                'upper_bound: '+ upper_bound +'; '+
                'lower_bound: '+ lower_bound +'; '+
                'reverse: '+ reverse +'; '+
                'unshift: '+ unshift);

            // Iterate over the entries.
            return foreach_entry({
                db: opts.db,
                store_name: opts.store_name,
                on_entry: function(entry){
                    if(!entry){
                        return {stop: false};
                    }
                    if( unshift ){
                        batch.unshift(entry);
                    } else {
                        batch.push(entry);
                    }

                    // If the buffer is at capacity (chunk_size), then empty it
                    // by invoking on_chunk.
                    if( opts.chunk_size > 0 && batch.length >= opts.chunk_size){

                        // This sync call is okay, because it's execution has 
                        // nothing to do with the advancement of the cursor.
                        setTimeout(on_chunk(batch), T);
                        sent = true;
                        if( reverse ){
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
                direction: reverse ? PREV : NEXT,
                on_success: function(){
                    console.log('In on_success');
                    // At the end, check if we need to empty the buffer one last 
                    // time.                    
                    if( !sent ){
                        setTimeout(on_chunk(batch), T);
                    }
                },
                on_error: opts.on_error
            });
        }

        // Read in the first chunk.
        return next_chunk(opts.reverse);
    };



    /**
     * Runs the on_entry function on every item within the specified range
     * (opts.range or all if not defined) for the specific db/store_name combo.
     * The on_entry function must not be asynchronous or the transaction will
     * cease, disrupting the iteration.
     *
     * @param {function} opts      A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{object} db:         The database.
     *     <li>{String} store_name: The store name.
     *     <li>{function} on_entry: The function to apply to each entry. Can 
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
     *    <li>{function} on_success: What to call at the end.
     *    <li>{function} on_error:  What to call when there's an error. 
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
     * Reads an entry from an index.
     *
     * @param {function} opts      A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{object} db_name:    The name of the database.
     *     <li>{String} store_name: The store name.
     *     <li>{function} on_success: Called with the entry as a parameter. 
     *     <li>{string} index_name: The name of the index.
     *     <li>{string} key:        The key of the entry to look up.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_error:  What to call when there's an error. 
     * </ul>
     * 
     * @throws {Error} If there are missing required opts fields.
     */
    get_entry_from_index = function(opts){
        if( !opts || !opts.db_name || !opts.store_name || !opts.on_success ||
                 !opts.index_name || !opts.key ){
            opts = opts || {};
            return raise_error(
                "Missing parameters in call to get_entry_from_index.", 
                opts.on_error);
        }

        if( db_connections[opts.db_name] ){
            return run_transaction({
                db: db_connections[opts.db_name],
                stores: [opts.store_name],
                mode: READONLY,
                f: function(t){
                    var store = t.objectStore(opts.store_name);
                    var request = store.index(opts.index_name).get(opts.key);
                    request.onsuccess = function(event){
                        opts.on_success(request.result);
                    };
                    request.onerror = function(e){
                        if( opts.on_error ){ opts.on_error(e.target.errorCode);}
                    }
                },
                on_error: opts.on_error
            });
        } else {
            return open_db({
                db_name: opts.db_name,
                db_version: opts.db_version,
                on_upgrade: opts.on_upgrade,
                on_error: opts.on_error,
                on_success: function(db){
                    get_entry_from_index(opts);
                }
            });
        }
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
     * @param {object} opts A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{object} db:           The db to write to.
     *     <li>{string} store_name:   The store to write to.
     *     <li>{Array} data:          An array of objects to insert into the db.
     * </ul>
     * OPTIONAL
     * <ul>
     *     <li>{function} on_error:   Invoked if there is an error. Should 
     *                                expect an object with two keys:
     *                                errorCode and event.
     *     <li>{function} on_success: Invoked when the data has been written.
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
     * @param {object} opts A map of options:
     * REQUIRED:
     * <ul>
     *     <li>{String} db_name:      The name of the db to open.
     *     <li>{function} on_success: Called when the database is successfully
     *                                opened. Should expect a database object
     *                                as its only parameter.
     * </ul>
     * OPTIONAL
     * <ul>
     *     <li>{function} on_upgrade: If the database has never been made or if
     *                                the version has changed, this gets called
     *                                before on_success.
     *     <li>{Int} db_version:      The version of the database.
     *     <li>{function} on_error:   Called when the database is unsuccessfully
     *                                opened. Should expect an object with two
     *                                keys: errorCode and event.
     * </ul>
     */
    open_db = function( opts ) {
        // Make sure we have the basic parameters. If there's opts.on_error is
        // not defined, this will throw an exception.
        if( !opts|| !opts.db_name || !opts.on_success ){
            opts = opts || {};
            return raise_error("Missing parameters in call to open_db.", 
                opts.on_error);
        }

        crowdlogger.debug.log('Opening DB...');

        // Open the database.
        var request = opts.db_version ?
            IndexedDB.open(opts.db_name, opts.db_version) :
            IndexedDB.open(opts.db_name);


        // CROWDLOGGER.debug.log('The request:');
        // CROWDLOGGER.debug.log(request);

        // setTimeout(function(){
        //     CROWDLOGGER.debug.log('The request after timeout:');
        //     CROWDLOGGER.debug.log(request);
        // }, 500);

        // Invoked when there's an error.
        request.onerror = function(event){
            crowdlogger.debug.log("Error opening database: "+ 
                event.target.errorCode);

            if( opts.on_error ) {
                opts.on_error({
                    errorCode: event.target.errorCode
                });
            }
        };

        // Invoked if we were able to open the database.
        request.onsuccess = function(event){
            var db = request.result;

            crowdlogger.debug.log('DB opened; version: '+ db.version);
            // For older versions of chrome.
            if( opts.db_version && 
                    parseInt(db.version) !== opts.db_version && db.setVersion ){
                var version_request = db.setVersion(opts.db_version);
                version_request.onsuccess = function(e){
                    if( opts.on_upgrade ){ opts.on_upgrade(db); }
                    db.close();
                    open_db(opts);
                }
                version_request.onerror = function(e){
                    crowdlogger.debug.log('Error while upgrading db:');
                    crowdlogger.debug.log(e);
                }
            } else {
                add_database_connection(db);
                // Pass the db onto the caller.
                opts.on_success(db); 
            }

        };

        request.onblocked = function(event){
            crowdlogger.debug.log('DB blocked!');
        };

        // Invoked if the database needs to be upgraded.
        request.onupgradeneeded = function(event){
            crowdlogger.debug.log('Upgrading DB; current version: '+ 
                request.result.version);
            if( opts.on_upgrade ){ opts.on_upgrade(request.result); }
        }; 

        return true;
    };

    /**
     * Creates a store in the given database. This can ONLY be called during
     * a database upgrade (i.e., in a function invoked by onupgradedneeded).
     * This sets the key path to "id" and turns on auto incrementing.
     *
     * @param {object} opts  The options.
     * REQUIRED:
     * <ul>
     *     <li>{object} db:             The database in which the table should 
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

        if( !opts.db.objectStoreNames.contains(opts.store_name) ){
            return opts.db.createObjectStore(opts.store_name, 
                {keyPath: "id", autoIncrement: true});
        } else {
            return false;
        }
    };

    /**
     * Truncates the given store in the database.
     *
     * @param {object} opts  The options.
     * REQUIRED:
     * <ul>
     *     <li>{object} db:             The database in which the table should 
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
        if( !opts || !opts.db || !opts.store_names ){
            opts = opts || {};
            return raise_error("Missing parameters in call to truncate_store.", 
                opts.on_error);
        }

        return run_transaction({
            db: opts.db,
            stores: opts.store_names,
            mode: READWRITE,
            f: function(t){
                var i;
                for(i = 0; i < opts.store_names.length; i++){
                    t.objectStore(opts.store_names[i], READWRITE).clear();
                }
            },
            on_error: function(event){
                crowdlogger.debug.log("Error clearing "+ store_name +": "+ 
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
     * @param {object} opts   A map of options. Options are:
     * REQUIRED:
     * <ul>
     *    <li>{object} db:    The database object.
     *    <li>{Array} stores: The stores that the transaction will operate over.
     *    <li>{String} mode: One of "readonly", "readwrite", or "versionchange".
     *    <li>{function} f:   The function to invoke during the transaction.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success: Invoked when the transaction has finished.
     *    <li>{function} on_error:   Invoked if an error occurs.
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
          if( opts.on_success ){ opts.on_success(); }//event); }
        };
        
        // Invoked when the transaction has errored.
        transaction.onerror = function(event) {
          if( opts.on_error){ opts.on_error(); } //event); }
        };

        opts.f(transaction);

        return true;
    };

    /**
     * Deals with reporting an error either through an error handler (if it
     * exits) or by throwing an exception.
     * 
     * @param  {string} msg              The error message.
     * @param  {function} error_handler  The error_handler (optional).
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

    // ******* END PRIVATE FUNCTIONS ********* //    
};
}
