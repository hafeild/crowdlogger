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
        write_to_log, read_log, truncate_table, run_transaction, foreach_entry;


    // Some constants
    var DATABASE_NAME = 'crowdlogger',
        EXTENSION_DATABASE_NAME = 'crowdlogger_extensions',
        EXTENSION_STORE_NAME = 'data',
        ACTIVITY_LOG_STORE_NAME = 'activity_log',
        ERROR_LOG_STORE_NAME = 'error_log',
        DATABASE_SIZE = 10 * 1024 * 1024, // 10 MB
        VERSION = 1,
        VERSIONCHANGE = 'versionchange',
        READONLY = 'readonly',
        READWRITE = 'readwrite',
        NEXT = 'next',
        NEXTUNIQUE = 'nextunique',
        PREV = 'prev',
        PREVUNIQUE = 'prevunique',
        T = 5; // Default timeout.

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
     * Writes the given data to the error log table, followed by a new line.
     *
     * @param {string} data The data to write to the error log.
     */
    this.write_to_error_log = function( data ){
        //B_DEBUG
        CROWDLOGGER.debug.log( "\nTO ERROR LOG:\n\t" + data + "\n\n" );
        //E_DEBUG
        
        // Write the data.
        write_to_log( DATABASE_NAME, ERROR_LOG_STORE_NAME, data );
    };
    
    /**
     * Writes the given data to the activity log table, followed by a new
     * line.
     *
     * @param {string} data The data to write to the activity log.
     */
    this.write_to_activity_log = function( data ) {
        //B_DEBUG
        CROWDLOGGER.debug.log( "\nTO ACTIVITY LOG:\n\t" + data + "\n\n" );
        //E_DEBUG
        
        // Write the data.
        write_to_log( DATABASE_NAME, ACTIVITY_LOG_STORE_NAME, data );
    };

    /**
     * An alias for write_to_activity_log.
     *
     * @param {string} data The data to write to the activity log.
     */
    this.log = this.write_to_activity_log;    

    /**
     * Writes the given data to the specified table. 
     *
     * @param {string} store_name The name of the table to write to.
     * @param {string} data       The data to write to the log.
     */
    this.write_to_extension_log = function( store_name, data ) {
        // Write the data.
        write_to_log( EXTENSION_DATABASE_NAME, store_name, data );
    };

    // ** UPDATERS ** //
    /**
     * Updates entries in the activity log. 
     * @example
     * update_activity_log({
     *   ids: [46,47,48],
     *   foreach: function(info, callback){ 
     *        if(isOld(info)) callback({delete:true});
     *        else if(needsUpdating(info)) callback({data: update(info)});
     *        else callback(); // Do nothing.
     *   }
     * })
     *
     * @param {Object} opts     A map consisting of several options, including:
     * <ul>
     *    <li> ids -- an array of entry ids; "*" or undefined for all
     *    <li> foreach -- a function to run on each entry that matches the
     *                    list of ids. This function should data an info object,
     *                    consisting of an id and data key with values, and a
     *                    callback. The callback takes an object consisting of
     *                    whether the entry should be deleted (delete:true),
     *                    the new data to overwrite (data:newData), or empty
     *                    to just not do anything.
     *    <li> callback -- a function to call when every matching id has been
     *                     processed.
     * </ul>
     */
    this.update_activity_log = function( opts ){

    };

    /**
     * Updates entries in the error log. 
     * @example
     * update_activity_log({
     *   ids: [46,47,48],
     *   foreach: function(info, callback){ 
     *        if(isOld(info)) callback({delete:true});
     *        else if(needsUpdating(info)) callback({data: update(info)});
     *        else callback(); // Do nothing.
     *   }
     * })
     *
     * @param {Object} opts     A map consisting of several options, including:
     * <ul>
     *    <li> ids -- an array of entry ids; "*" or undefined for all
     *    <li> foreach -- a function to run on each entry that matches the
     *                    list of ids. This function should data an info object,
     *                    consisting of an id and data key with values, and a
     *                    callback. The callback takes an object consisting of
     *                    whether the entry should be deleted (delete:true),
     *                    the new data to overwrite (data:newData), or empty
     *                    to just not do anything.
     *    <li> callback -- a function to call when every matching id has been
     *                     processed.
     * </ul>
     */
    this.update_error_log = function( opts ){

    }

    /**
     * Updates entries in an extension's log. 
     * @example
     * update_activity_log({
     *   ids: [46,47,48],
     *   foreach: function(info, callback){ 
     *        if(isOld(info)) callback({delete:true});
     *        else if(needsUpdating(info)) callback({data: update(info)});
     *        else callback(); // Do nothing.
     *   }
     * })
     *
     * @param {Object} opts     A map consisting of several options, including:
     * <ul>
     *    <li> store_name -- the name of the table to access.
     *    <li> ids -- an array of entry ids; "*" or undefined for all
     *    <li> foreach -- a function to run on each entry that matches the
     *                    list of ids. This function should data an info object,
     *                    consisting of an id and data key with values, and a
     *                    callback. The callback takes an object consisting of
     *                    whether the entry should be deleted (delete:true),
     *                    the new data to overwrite (data:newData), or empty
     *                    to just not do anything.
     *    <li> callback -- a function to call when every matching id has been
     *                     processed.
     * </ul>
     */
    this.update_extension_log = function( opts ){

    }

    // ** CLEARERS ** //
    /**
     * Truncates the activity log table.
     */
    this.clear_activity_log = function() {
        clear_log( ACTIVITY_LOG_STORE_NAME );
    };    

    /**
     * Truncates the error log table.
     */
    this.clear_error_log = function() {
        clear_log( ERROR_LOG_STORE_NAME );
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
     *    <li>{bool} reverse:          If true, the data will be read in reverse
     *                                 order of id. Default is 'false'.
     *    <li>{int} lower_bound:       The smallest id to retrieve; default: 0
     *    <li>{int} upper_bound:       The largest id to retrieve; default: -1
     *                                 (all ids >= lower_bound are retrieved).
     * </ul>
     */
    CROWDLOGGER.io.indexed_db.read_error_log = function( callback ){
        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_name = ERROR_LOG_STORE_NAME;

        // Read the data and send it to callback.
        read_log( opts );
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
     *    <li>{bool} reverse:          If true, the data will be read in reverse
     *                                 order of id. Default is 'false'.
     *    <li>{int} lower_bound:       The smallest id to retrieve; default: 0
     *    <li>{int} upper_bound:       The largest id to retrieve; default: -1
     *                                 (all ids >= lower_bound are retrieved).
     * </ul>
     */
    CROWDLOGGER.io.indexed_db.read_activity_log = function( opts ){
        opts.db_name = DATABASE_NAME;
        opts.db_version = VERSION;
        opts.on_upgrade = on_crowlogger_db_upgraded;
        opts.store_name = ACTIVITY_LOG_STORE_NAME;

        // Read the data and send it to callback.
        read_log( opts );
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
     *    <li>{bool} reverse:          If true, the data will be read in reverse
     *                                 order of id. Default is 'false'.
     *    <li>{int} lower_bound:       The smallest id to retrieve; default: 0
     *    <li>{int} upper_bound:       The largest id to retrieve; default: -1
     *                                 (all ids >= lower_bound are retrieved).
     * </ul>
     */
    CROWDLOGGER.io.indexed_db.read_extension_log = function( opts ){
        opts.on_upgrade = opts.on_upgrade || on_extension_db_upgraded;
        opts.store_name = opts.store_name || EXTENSION_STORE_NAME;

        // Read the data.
        read_log( opts );
    }; 
    // ******* END PUBLIC FUNCTIONS ********* //


    // ******* BEGIN PRIVATE FUNCTIONS ********* //
    /**
     * Creates the stores in a CrowdLogger database.
     *
     * @param event     The event generated by creating a new database.
     */
    on_crowlogger_db_upgraded = function(event){
        create_store(event.target.result, ACTIVITY_LOG_STORE_NAME);
        create_store(event.target.result, ERROR_LOG_STORE_NAME);
    }

    /**
     * Creates the default store in a CrowdLogger extension database.
     *
     * @param event     The event generated by creating a new database.
     */
    on_extension_db_upgraded = function(event){
        create_store(event.target.result, EXTENSION_STORE_NAME);
    }

    /**
     * Truncates the given log store.
     *
     * @param {Object} opts        A map of additional options:
     * <ul>
     *     <li>{string} db_name:          The name of the database to open.
     *     <li>{Function} on_upgrade:     Invoked if the database needs to be 
     *                                    updated.
     *     <li>{int} db_version:          The version of the db.
     *     <li>{string} store_name:       The name of the store to clear.
     * </ul>     
     */
    clear_log = function(opts) {
        if( !opts.db_name || !opts.version ){ return; }

        if( !db_connections[opts.db_name] ){
            open_db({
                db_name: opts.db_name,
                version: opts.db_version,
                on_upgrade: opts.on_upgrade,
                on_error: opts.on_error,
                on_success: function(db){
                    db_connections[opts.db_name] = db;
                    clear_log(opts);
                }
            });
            return;
        }

        truncate_store(db_connections[opts.db_name], opts.store_name,
            opts.on_error, opts.on_success);
    };

    /**
     * This is a generic write function that will take care of opening
     * a database, creating the table (if need be), and writing the given
     * data to it.
     * @function
     * @private
     * @member CROWDLOGGER.io.indexed_db
     *
     * @param {Object} opts        A map of additional options:
     * <ul>
     *     <li>{string} db_name:          The name of the database to open.
     *     <li>{Function} on_upgrade:     Invoked if the database needs to be 
     *                                    updated.
     *     <li>{int} db_version:          The version of the db.
     *     <li>{string} store_name:       The name of the table to create.
     *     <li>{string} data:             The data to write to the database.
     * </ul>
     */
    write_to_log = function(opts){
        if( !opts.db_name || !opts.version ){ return; }

        if( !db_connections[opts.db_name] ){
            open_db({
                db_name: opts.db_name,
                version: opts.db_version,
                on_upgrade: opts.on_upgrade,
                on_error: opts.on_error,
                on_success: function(db){
                    db_connections[opts.db_name] = db;
                    write_to_log(opts);
                }
            });
            return;
        }

        var info = {
            stores: [opts.store_name],
            mode: READWRITE,
            f: function(t){
                var objectStore = t.objectStore(opts.store_name);
                for (var i in opts.data) {
                    var request = objectStore.put(data[i]);
                }
            },
            on_success: opts.on_success,
            on_error: opts.on_error
        }

        transaction(db_connections[opts.db_name], info);
    }; 

    /**
     * This is a generic read function that will take care of opening
     * a database, creating the table (if need be), and reading the given
     * data from it.
     * @function
     * @private
     * @member CROWDLOGGER.io.indexed_db
     *
     * @param {Object} opts        A map of additional options:
     * <ul>
     *    <li>{string} db_name:        The database name.
     *    <li>{Function} on_upgrade:   Invoked if the database needs to be 
     *                                 updated.
     *    <li>{int} db_version:        The version of the db.
     *    <li>{string} store_name:     The name of the store to read.
     *    <li>{Function} on_success:   Invoked when everything has been read.
     *    <li>{Function} on_error:     Invoked if there's an error.
     *    <li>{Function} on_chunk:     Invoked per chunk (see below). Chunks
     *                                 are processed asynchronously.
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
    read_log = function( opts ){
        if( !opts.db_name || !opts.version || !opts. !opts.on_chunk ){ return; }

        if( db_connections[opts.db_name] ){
            read_from_db(db_connections[opts.db_name], opts.store_name, opts);
        } else {
            open_db({
                db_name: opts.db_name,
                version: opts.db_version,
                on_upgrade: opts.on_upgrade,
                on_error: opts.on_error,
                on_success: function(db){
                    db_connections[opts.db_name] = db;
                    read_from_db(db, opts.store_name, opts);
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
     * @param {Object} opts        A map of additional options:
     * <ul>
     *     <li>{Object} db:            The database.
     *     <li>{string} store_name:    The name of the store to read.
     *    <li>{Function} on_success:   Invoked when everything has been read.
     *    <li>{Function} on_error:     Invoked if there's an error.
     *    <li>{Function} on_chunk:     Invoked per chunk (see below). Chunks
     *                                 are processed asynchronously. Should 
     *                                 expect the data and a 'next' function
     *                                 which, when invoked, will retrieve
     *                                 the next chunk.
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
    read_from_db = function( opts ){
        var upper_bound = opts.upper_bound, 
            lower_bound = opts.lower_bound,
            finished = false;

        // Figure out the range of ids to iterate over.
        function get_range(upper, lower) {
            var range;
            if( opts.lower_bound === undefined ){
                if( opts.upper_bound === undefined ){
                    range = IDBKeyRange.lowerBound(1);
                } else {
                    range = IDBKeyRange.upper_bound(opts.upper_bound);
                }
            } else if(opts.upper_bound === undefined){
                range = IDBKeyRange.lowerBound(opts.lower_bound);
            } else { 
                range = IDBKeyRange.bound(opts.lower_bound, opts.upper_bound);
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
            if( finished ){ return; }

            var range = get_range(upper_bound, lower_bound);
            // This will hold the batches of items. It's essentially a buffer.
            var batch = [];

            // Iterate over the entries.
            foreach_entry({
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
                            upper_bound = entry.id;
                        } else {
                            lower_bound = entry.id;
                        }
                        return {stop: true};
                    }
                },
                mode: READONLY,
                range: range,
                direction: opts.reverse ? PREV : NEXT,
                on_success: function(){
                    finished = true;
                    // At the end, check if we need to empty the buffer one last 
                    // time.
                    if( batch.length > 0 ){
                        setTimeout(on_chunk(batch), T);
                    }
                    setTimeout(opts.on_success, T);
                },
                on_error: opts.on_error
            });
        }

    };

    /**
     * Runs the on_entry function on every item within the specified range
     * (opts.range or all if not defined) for the specific db/store_name combo.
     * The on_entry function must not be asynchronous or the transaction will
     * cease, disrupting the iteration.
     *
     * @param {Function} opts      A map of options:
     * <ul>
     *     <li>{Object} db:         The database.
     *     <li>{String} store_name: The store name.
     *     <li>{Function} on_entry: The function to apply to each entry. Can 
     *                              return an object with two keys:
     *                                stop: true | false (default: false) If
     *                                    true, stops iterating.
     *                                updated_entry: the updated entry     
     *    <li>{String} mode:       The mode; readwrite (default) or readonly.
     *    <li>{IDBKeyRange} range: The range (default: all). 
     *                             E.g. IDBKeyRange.lowerBound(1)
     *    <li>{String} direction:  The direction, i.e., 'next', 'nextunique',
     *                             'prev', 'prevunique',
     *    <li>{Function} on_success: What to call at the end.
     *    <li>{Function} on_error:  What to call when there's an error. 
     * </ul>
     */
    foreach_entry = function(opts){
        var defaults = {
            mode: READWRITE,
            range: IDBKeyRange.lowerBound(1),
            direction: NEXT
        };
        opts = opts || defaults;
        var key;
        for(key in defaults){
            if(opts[key] === undefined){
                opts[key] = defaults[key];
            }
        }

        run_transaction({
            db: opts.db,
            stores: [store_name],
            mode: opts.mode ? opts.mode : READWRITE,
            f: function(t){
                var store = t.objectStore(opts.store_name);
                var request = store.openCursor(
                    opts.range, opts.direction); 
                request.onsuccess = function(){
                    var cursor = request.result;
                    if( cursor ){
                        var cur_request = store.get(cursor.key);
                        // After the data has been retrieved, show it.
                        curRequest.onsuccess = function (e) {
                            var info = opts.on_entry(cur_request.result) || 
                                {stop:false};
                            if( opts.mode == READWRITE && info.updatedEntry && 
                                    info.updated_entry.id === cursor.key){
                                cursor.update(info.updated_entry);
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
     * @param {Object} db  The database.
     * @param {string} store_name The name of the table to read.
     * @param {Array} data A list of objects to write to the database.
     * @param {Function} on_success Invoked when the data has been added 
     *                              successfully.
     * @parma {Function} on_error Invoked when there is an error.
     */
    write_to_db = function( db, store_name, data, on_success, on_error ){
        run_transaction({
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
        }
    };

    /**
     * Opens the CROWDLOGGER database.
     * @function
     * @private
     * @member CROWDLOGGER.io.indexed_db
     *
     * @param {Object} opts A map of options:
     * <ul>
     *     <li>{Function} on_error: Called when the database is unsuccessfully
     *                              opened. Should expect an object with two
     *                              keys: errorCode and event.
     *     <li>{Function} on_success: Called when the database is successfully
     *                                opened. Should expect a database object
     *                                as its only parameter.
     *     <li>{Function} on_upgrade: If the database has never been made or if
     *                                the version has changed, 
     *     <li>{String} db_name: The name of the db to open.
     *     <li>{Int} version: The version of the database.
     * </ul>
     */
    open_db = function(opts) {
        // Make sure we have the basic parameters. If there's opts.on_error is
        // not defined, this will throw an exception.
        if( opts === undefined || opts.db_name === undefined || 
                opts.version === undefined ){
            var msg "open_db requires database_name and version as "+
                  "keys in the opts map."
            if( opts && opts.on_error ){
                opts.on_error({errorCode: msg})
            } else {
                throw msg
            }
            return;
        }

        // Open the database.
        var request = window.indexedDB.open(opts.db_name, opts.version);

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
        opts.on_success && request.onsuccess = opts.on_success;

        // Invoked if the database needs to be upgraded.
        opts.on_upgrade && request.onupgradedneeded = opts.on_upgrade;

    };

    /**
     * Creates a store in the given database. This can ONLY be called during
     * a database upgrade (i.e., in a function invoked by onupgradedneeded).
     * This sets the key path to "id" and turns on auto incrementing.
     *
     * @param {Object} db The database in which the table should
     *      be created.
     * @param {string} store_name The name of the table.
     * @param The created object store.
     */    
    create_store = function( db, store_name ){
        return db.createObjectStore(store_name, 
            {keyPath: "id", autoIncrement: true});
    };

    /**
     * Truncates the given store in the database.
     *
     * @param {Object} db The database in which the table should
     *      be created.
     * @param {string} store_name The name of the store.
     * @param {function} on_error The function to call in the event of an error.
     * @param {function} on_success The function to call if the operation is
     *      successful.
     */
    truncate_store = function( db, store_name, on_error, on_success ){
        run_transaction({
            db: db,
            stores: [store_name],
            mode: READWRITE,
            f: function(t){
                t.objectStore(store_name, READWRITE).clear();
            },
            on_error: function(event){
                CROWDLOGGER.debug.log("Error clearing "+ store_name +": "+ 
                    event.target.errorCode);
                on_error({
                    errorCode: event.target.errorCode, 
                    event: event
                });
            },
            on_success: on_success
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
     * <ul>
     *    <li>{Object} db:    The database object.
     *    <li>{Array} stores: The stores that the transaction will operate over.
     *    <li>{String} mode:  One of "readonly", "readwrite", or "versionchange".
     *    <li>{Function} f:   The function to invoke during the transaction.
     *    <li>{Function} on_success: Invoked when the transaction has finished.
     *    <li>{Function} on_error:   Invoked if an error occurs.
     * </ul>  
     * Note that f should expect a transaction object and should not make any 
     * async calls, otherwise the transaction will close.
     */
    run_transaction = function(db, opts){
        var transaction = db.transaction(opts.stores, opts.mode);

        // Invoked when the transaction has completed.
        transaction.oncomplete = function(event) {
          if( opts.on_success ){ opts.on_success(event); }
        };
        
        // Invoked when the transaction has errored.
        transaction.onerror = function(event) {
          if( opts.on_error){ opts.on_error(event); }
        };

        opts.f(transaction);
    }
    // ******* END PRIVATE FUNCTIONS ********* //    
};
}
