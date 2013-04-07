/**
 * @fileOverview Provides the Storage API for CrowdLogger remote modules
 * (CLRMs). There are two parts -- the CrowdLogger-side interface (CLI) and
 * the sandbox- side interface (SBI). CRMs communicate with the SBI, which in
 * turn communicates with the CLI, which has access to the CROWDLOGGER
 * object.
 *
 * %%LICENSE%%
 * 
 * @author hfeild
 * 
 * @version %%VERSION%%
 */

CLI.prototype.Storage = function(crowdlogger, cli){
    // Private variables.
    var callbacks, storeOps = {};

    // Private function declarations.

    // Public variables.
    
    // Public function declarations.
     
    // Private function definitions.

    // Provides several wrappers for common callback functions.
    callbacks = {
        // Called when each chunk is ready to be processed.
        on_chunk: function(callbackID){ 
            return function(data, next, abort){
                console.log('(in cli.user.history) in on_chunk; data.length: '+
                    data.length );

                // Serves as a wrapper for the 'next' function. The wrapper is
                // what gets registered in the function registry, not 'next'.
                var nextWrapper = function(options, id){
                    // Unregister the nextWrapper callback.
                    cli.base.unregisterCallback(id);
                    next();
                };

                var abortWrapper = function(options, id){
                    cli.base.unregisterCallback(id);
                    abort( options.is_error, options.err_msg );
                }

                // Register the callbacks.
                var nextCallbackID = cli.base.registerCallback(nextWrapper);
                var abortCallbackID = cli.base.registerCallback(abortWrapper);

                // Call the callback.
                cli.base.invokeCLRMICallback({
                    callbackID: callbackID, 
                    options: {
                        event: 'on_chunk',
                        data:   data,
                        nextCallbackID: nextCallbackID,
                        abortCallbackID: abortCallbackID
                    }
                });
            }
        },

        // Called when there is an error.
        on_error: function(callbackID){ 
            return function(error){
                // Call the callback.
                cli.base.invokeCLRMICallback({
                    callbackID: callbackID, 
                    options: {
                        event: 'on_error',
                        error: error
                    }
                });
            };
        },

        // Called when reading is finished.
        on_success: function(callbackID){ 
            return function(data){
                // Call the callback.
                cli.base.invokeCLRMICallback({
                    callbackID: callbackID, 
                    options: {
                        event: 'on_success',
                        data: data
                    }
                });
            };
        }
    };

    /**
     * Generates a function (to be used as an upgradeneeded function) that
     * adds each store in a list of stores to the database.
     *
     * @param {object} opts  A map of options.
     * REQUIRED:
     * <ul>
     *    <li>{array of strings} storeNames  The names of the stores to add.
     * </ul>
     */
    storeOps.addStores = function(opts){
        var stores = opts.storeNames;
        return function(db){
            var i;
            for(i = 0; i < stores.length; i++){
                if( !db.objectStoreNames.contains(stores[i]) ){
                    db.createObjectStore(stores[i], 
                        {keyPath: "id", autoIncrement: true});
                }
            }
            return true;
        }
    };

    /**
     * Generates a function (to be used as an upgradeneeded function) that
     * adds each store in a list of stores to the database.
     *
     * @param {object} opts  A map of options.
     * REQUIRED:
     * <ul>
     *    <li>{array of strings} storeNames  The names of the stores to add.
     *    <li>{string} indexName             The name of the index to create.
     *    <li>{string} keyName               The name of the key to index.
     * </ul>
     * @throws CLIException if required options are missing.
     */
    storeOps.createIndexStore = function(opts){
        crowdlogger.util.check_args(opts, 
            ['storeNames', 'indexName', 'keyName'],
            'api.cli.storage.upgradeDB', cli.CLIException, 
            storeOps[opts.storeOp] );
        var stores = opts.storeNames;

        return function(db){
            var i;
            for(i = 0; i < stores.length; i++){
                if( !db.objectStoreNames.contains(stores[i]) ){
                    var store = db.createObjectStore(stores[i], 
                        {keyPath: opts.keyName});
                    store.createIndex(opts.indexName,
                        opts.keyName,{unique: true});
                }
            }
            return true;
        }
    }

    /**
     * Generates a function (to be used as an upgradeneeded function) that
     * removes each store in a list of stores from the database.
     *
     * @param {object} opts  A map of options.
     * REQUIRED:
     * <ul>
     *    <li>{array of strings} storeNames  The names of the stores to add.
     * </ul>
     */
    storeOps.removeStores = function(opts){
        var stores = opts.storeNames;
        return function(db){
            var i;
            for(i = 0; i < stores.length; i++){
                if( db.objectStoreNames.contains(stores[i]) ){
                    db.deleteObjectStore(stores[i]);
                }
            }
            return true;
        }
    };

        
    // Public function definitions.
    
    /**
     * The main interface for dealing with store operations (add, clear, remove
     * and list stores).
     *
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{int} callbackID:        The id of the CLRMI function to invoke.
     *                                 This is invoked for the following
     *                                 events (stored in 'event') along with
     *                                 their parameters ('params'):
     *        <ul>
     *            <li>{function} on_success:   Invoked when everything is read.
     *            <li>{function} on_error:     Invoked if there's an error.
     *        </ul>
     *    <li>{string} dbName          The name of the database to open.
     *    <li>{string} storeNames      The names of the stores to work with.
     *    <li>{string} storeOp         One of:
     *                                 <ul>
     *                                    <li>'removeStores'
     *                                    <li>'addStores'
     *                                    <li>'createIndexStore'
     *                                 </ul>
     * </ul>
     * REQUIRED FOR storeOp == 'createIndexStore':
     * <ul>
     *    <li>{string} indexName       The name of the index to create.
     *    <li>{string} keyName         The name of the key to index.
     * </ul>
     * @throws CLIException if required options are missing.
     */
    this.upgradeDB = function(opts){
        crowdlogger.util.check_args(opts, 
            ['callbackID', 'dbName', 'storeNames', 'storeOp'],
            'api.cli.storage.upgradeDB', cli.CLIException, 
            storeOps[opts.storeOp] );


        crowdlogger.io.log.upgrade_db({
            db_name:     opts.dbName,
            on_upgrade:  storeOps[opts.storeOp](opts),
            on_success:  callbacks.on_success(opts.callbackID),
            on_error:    callbacks.on_error(opts.callbackID)
        });
    };

    /**
     * Clears each of the given stores.
     *
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{int} callbackID:        The id of the CLRMI function to invoke.
     *                                 This is invoked for the following
     *                                 events (stored in 'event') along with
     *                                 their parameters ('params'):
     *        <ul>
     *            <li>{function} on_success:   Invoked when everything is read.
     *            <li>{function} on_error:     Invoked if there's an error.
     *        </ul>
     *    <li>{string} dbName          The name of the database to open.
     *    <li>{string} storeNames      The names of the stores to work with.
     * </ul>
     * @throws CLIException if required options are missing.
     */
    this.clearStores = function(opts){
        crowdlogger.util.check_args(opts,['callbackID', 'dbName', 'storeNames'],
            'api.cli.storage.clearStore', cli.CLIException, true);

        crowdlogger.io.log.clear_extension_log({
            db_name:     opts.dbName,
            store_names: opts.storeNames,
            on_success:  callbacks.on_success(opts.callbackID),
            on_error:    callbacks.on_error(opts.callbackID)
        });
    };

    /**
     * Retrieves a list of stores associated with the given database.
     *
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{int} callbackID:        The id of the CLRMI function to invoke.
     *                                 This is invoked for the following
     *                                 events (stored in 'event') along with
     *                                 their parameters ('params'):
     *        <ul>
     *            <li>{function} on_success:   Invoked when everything is read.
     *            <li>{function} on_error:     Invoked if there's an error.
     *        </ul>
     *    <li>{string} dbName          The name of the database to open.
     * </ul>
     * @throws CLIException if required options are missing.
     */
    this.listStores = function(opts){
        crowdlogger.util.check_args(opts,['callbackID', 'dbName'],
            'api.cli.storage.listStores', cli.CLIException, true);

        crowdlogger.io.log.list_stores({
            db_name: opts.dbName,
            on_success: callbacks.on_success(opts.callbackID),
            on_error: callbacks.on_error(opts.callbackID)
        });
    };

    /**
     * Saves data to the given database/store.
     *
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{int} callbackID:        The id of the CLRMI function to invoke.
     *                                 This is invoked for the following
     *                                 events (stored in 'event') along with
     *                                 their parameters ('params'):
     *        <ul>
     *            <li>{function} on_success:   Invoked when everything is read.
     *            <li>{function} on_error:     Invoked if there's an error.
     *        </ul>
     *    <li>{string} dbName          The name of the database to open.
     *    <li>{string} storeName       The name of the store to save data to.
     *    <li>{array of objects} data  The data to save.
     * </ul>
     * @throws CLIException if required options are missing.
     */
    this.save = function(opts){
        crowdlogger.util.check_args(opts,
            ['callbackID','dbName','storeName','data'],
            'api.cli.storage.save', cli.CLIException, true);

        crowdlogger.io.log.write_to_extension_log({
            db_name:     opts.dbName,
            store_name:  opts.storeName,
            data:        opts.data,
            on_success:  callbacks.on_success(opts.callbackID),
            on_error:    callbacks.on_error(opts.callbackID)
        });
    };

    /**
     * Reads the specified database/store.
     *
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{int} callbackID:        The id of the CLRMI function to invoke.
     *                                 This is invoked for the following
     *                                 events (stored in 'event') along with
     *                                 their parameters ('params'):
     *    <ul>
     *        <li>{function} on_chunk:     Invoked per chunk (see below). Chunks
     *                                     are processed asynchronously. Should
     *                                     expect an array of db entries 
     *                                     ('data')and a callback function id
     *                                     ('nextCallbackID').
     *        <li>{function} on_success:   Invoked when everything is read.
     *        <li>{function} on_error:     Invoked if there's an error.
     *    </ul>
     *    <li>{string} dbName          The name of the database to open.
     *    <li>{string} storeName       The name of the store to read.
     * </ul>
     * OPTIONAL:
     * <ul>
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
     * @throws Exception if required options are missing.
     */
    this.read = function(opts){
        crowdlogger.util.check_args(opts,
            ['callbackID','dbName','storeName'],
            'api.cli.storage.save', cli.CLIException, true);

        // Read the log.
        crowdlogger.io.log.read_extension_log({
            db_name:     opts.dbName,
            store_name:  opts.storeName,
            chunk_size:  opts.chunk_size,
            reverse:     opts.reverse,
            lower_bound: opts.lower_bound,
            upper_bound: opts.upper_bound,
            on_chunk:    callbacks.on_chunk(opts.callbackID),
            on_success:  callbacks.on_success(opts.callbackID),
            on_error:    callbacks.on_error(opts.callbackID)
        });
    };

    /**
     * Gets the entry associated with the key (or undefined if not found). This
     * should only be used with stores that have an index that is indexed on the
     * given key. 
     *
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{int} callbackID:        The id of the CLRMI function to invoke.
     *                                 This is invoked for the following
     *                                 events (stored in 'event') along with
     *                                 their parameters ('params'):
     *    <ul>
     *        <li>{function} on_success:   Invoked when everything is read.
     *                                     Should expect the entry.
     *        <li>{function} on_error:     Invoked if there's an error.
     *    </ul>
     *    <li>{string} key:            The key value to lookup.
     *    <li>{string} indexName:      The index to look at in the store.
     *    <li>{string} dbName          The name of the database to open.
     *    <li>{string} storeName       The name of the store to read.
     * </ul>
     * @throws Exception if required options are missing.
     */
    this.getFromIndex = function(opts){
        crowdlogger.util.check_args(opts,
            ['callbackID','dbName','storeName','indexName','key'],
            'api.cli.storage.save', cli.CLIException, true);

        // Read the log.
        crowdlogger.io.log.get_indexed_entry({
            db_name:     opts.dbName,
            store_name:  opts.storeName,
            index_name:  opts.indexName,
            key:         opts.key,
            on_success:  callbacks.on_success(opts.callbackID),
            on_error:    callbacks.on_error(opts.callbackID)
        });
    };

    /**
     * Deletes/updates entries from the given database/store.
     *
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{int} callbackID:        The id of the CLRMI function to invoke.
     *                                 This is invoked for the following
     *                                 events (stored in 'event') along with
     *                                 their parameters ('params'):
     *        <ul>
     *            <li>{function} on_success:   Invoked when everything is read.
     *            <li>{function} on_error:     Invoked if there's an error.
     *        </ul>
     *    <li>{string} dbName          The name of the database to open.
     *    <li>{string} storeName       The store to update data in.
     *    <li>{map of entries} entries The entries to update; the keys should
     *                                 be the id and the value should be an
     *                                 object with one of two optional fields:
     *                                 <ul>
     *                                    <li>entry (new data, ids must match)
     *                                    <li>delete (true or false)
     *                                 </ul>
     *                                 e.g., {5: {delete: true}, 
     *                                        10: {entry: {id:10, name:'foo'}}
     *                                       }
     * </ul>
     * @throws CLIException if required options are missing.
     */
    this.updateEntries = function(opts){
        crowdlogger.util.check_args(opts,
            ['callbackID','dbName','storeName','entries'],
            'api.cli.storage.updateEntries', cli.CLIException, true);

        var minID, maxID, isFirst = true, id;

        // Find the min/max ids.
        for(id in opts.entries){
            if( isFirst ){
                isFirst = false;
                minID = id;
                maxID = id;
            } else {
                minID = Math.min(minID, id);
                maxID = Math.max(maxID, id);
            }
        }

        crowdlogger.io.log.update_extension_log({
            db_name:     opts.dbName,
            store_name:  opts.storeName,
            foreach:  function(entry){
                crowdlogger.debug.log('In updateEntries: id:'+ entry.id);
                return opts.entries[entry.id] || {};
            },
            on_success:  callbacks.on_success(opts.callbackID),
            on_error:    callbacks.on_error(opts.callbackID),
            lower_bound: minID-1,
            upper_bound: maxID+1
        });
    };

    /**
     * Removes the given database.
     *
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{int} callbackID:        The id of the CLRMI function to invoke.
     *                                 This is invoked for the following
     *                                 events (stored in 'event') along with
     *                                 their parameters ('params'):
     *        <ul>
     *            <li>{function} on_success:   Invoked when everything is read.
     *            <li>{function} on_error:     Invoked if there's an error.
     *        </ul>
     *    <li>{string} dbName          The name of the database to remove.
     * </ul>
     * @throws CLIException if required options are missing.
     */
    this.removeDB = function(opts){
        crowdlogger.util.check_args(opts,['callbackID', 'dbName'],
            'api.cli.storage.removeDB', cli.CLIException, true);

        crowdlogger.io.log.remove_database({
            db_name:     opts.dbName,
            on_success:  callbacks.on_success(opts.callbackID),
            on_error:    callbacks.on_error(opts.callbackID)
        });
    };
};
