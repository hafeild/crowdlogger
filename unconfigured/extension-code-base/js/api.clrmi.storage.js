/**
 * @fileOverview <p>Provides the storage API for the CrowdLogger Remote Modules 
 * (CLRMs)-side interface (CLRMI).</p>
 *
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

/**
 * Provides the storage API for the CrowdLogger Remote Modules (CLRMs)-side  
 * interface (CLRMI).
 */
CLRMI.prototype.Storage = function( api, id ){
    // Private variables.
    var that = this,
        dbName = 'db_'+id.replace(/\W/g, '_').toLowerCase(),
        upgrading = true,
        MIN_CHUNK_SIZE = 25,
        MAX_CHUNK_SIZE = 100;

    // Private function declarations.
    var init, wrapCallback, addUpgradeCheck, updateWithoutForeach, 
        updateWithForeach;

    // Public variables.
    

    // Public function declarations.
    this.addStores, this.removeStores, this.clearStores, this.listStores,
    this.save, this.read, this.update, this.removeDatabase, this.preferences,
    this.remove; 

    // Private function definitions.

    /**
     * Initializes the preferences store for this CLRM.
     */
    init = function(){
        that.preferences = new that.Preferences(api, {
            wrapCallback: wrapCallback,
            dbName: dbName
        }, function(){
            api.base.log('Storage.init heard back from storage.Preferences');
            upgrading = false;
        });

    };

    /**
     * Serves as a wrapper for callback. Given a set of options (e.g., to one
     * of the public methods below), this function will create and register a
     * callback wrapper that can support on_success, on_error, and on_chunk.
     *
     * @param {object} opts  A map of options.
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success  Called if the event field of the object 
     *                               passed to the callback is 'on_success'. The
     *                               value of the 'data' field will be passed
     *                               to this function.
     *    <li>{function} on_error    Called if the event field of the object
     *                               passed to the callback is 'on_error'. The
     *                               value of the 'error' field will be passed
     *                               to this function.
     *    <li>{function} on_chunk    Called if the event field of the object
     *                               passed to the callback is 'on_chunk'. The
     *                               value of the 'data' field will be passed
     *                               to this function as well as a 'next' and
     *                               'abort' function.
     * </ul>
     * @return The id of the registered callback.
     */
    wrapCallback = function(opts){
        var callbackID;
        var callback = function(params){
            api.base.log('(in clrmi.storage.callbackWrapper) '+
                'heard back! event: '+ params.event);
            if( params.event === 'on_chunk' && opts.on_chunk ){
                var next = function(){
                    api.base.log('(in clrmi.storage.callbackWrapper) '+
                        'invoking next');

                    api.base.invokeCLICallback({
                        callbackID: params.nextCallbackID
                    });
                };
                var abort = function(isError, errorMsg){
                    api.base.log('(in clrmi.storage.callbackWrapper) '+
                        'invoking abort');

                    api.base.invokeCLICallback({
                        callbackID: params.abortCallbackID, 
                        options: {
                            is_error: isError,
                            error_msg: errorMsg
                        }
                    });
                };

                // Invoke the original on_chunk function.
                opts.on_chunk(params.data, next, abort);
            } else {
                if( params.event === 'on_error' && opts.on_error ){
                    opts.on_error(params.error);
                } else if( params.event === 'on_success' && opts.on_success ) {
                    opts.on_success(params.data);
                }
                api.base.unregisterCallback(callbackID);
            }
        };

        callbackID = api.base.registerCallback(callback);
        return callbackID;
    }

    /**
     * Poll's the 'upgrading' lock until its available, then checks it out.
     * Creates intermediate functions to take care of removing the lock (either
     * on error or success). The given function is then invoked.
     *
     * @param {function} func     The function to invoke once the lock has been
     *                            acquired. It is assumed that this function
     *                            takes an object as its only parameter and that
     *                            it handles on_success and on_error keys in
     *                            that parameter.
     * @param {object} opts       A map of options to pass to func. Note that
     *                            the on_success and on_error keys will be
     *                            modified (replaced with intermediate functions
     *                            that eventually invoke the original ones, if
     *                            they exist).
     */
    addUpgradeCheck = function(func, opts){ 
        if( upgrading ){
            setTimeout( function(){addUpgradeCheck(func, opts);}, 100 );
            return;
        }
        opts = opts || {};

        upgrading = true;

        api.base.log('Acquired lock for '+ func);

        var newOpts = api.util.copyObj(opts||{});
        newOpts.on_success = function(data){
            api.base.log('Removing upgrading lock...');
            upgrading = false;
            if(opts.on_success){ opts.on_success(data); }
        }
        newOpts.on_error = function(e){
            api.base.log('Removing upgrading lock...');
            upgrading = false;
            if(opts.on_error){ opts.on_error(e); }
        }
        func(newOpts);
    };

    /**
     * Updates entries in the given database/store.
     * 
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} store:          The name of the store to update. 
     *    <li>{function} foreach:      A function to run on each entry. It 
     *                                 should take a log entry as its only 
     *                                 parameter and optionally return an object
     *                                 with three optional fields:
     *                                 <ul>
     *                                   <li>{object} entry: 
     *                                       If entry.id matches the id of the 
     *                                       original entry, the existing saved 
     *                                       entry is overwritten with entry. 
     *                                   <li>{boolean} stop
     *                                       Stops the traversal if true. 
     *                                   <li>{boolean} delete
     *                                       Deletes the stored entry if true. 
     *                                 </ul>
     * </ul>
     * OPTIONAL:
     * <ul>
     *     <li>{function} on_success:  Invoked when the traversal is complete 
     *                                 and everything has been successfully 
     *                                 updated. 
     *     <li>{function} on_error:    Invoked if there's an error. 
     *     <li>{bool} reverse:         If true, the data will be read in reverse
     *                                 order of id. Default is 'false'.
     *     <li>{int} lower_bound:      The smallest id to retrieve; default: 0
     *     <li>{int} upper_bound:      The largest id to retrieve; default: -1
     *                                 (all ids >= lower_bound are retrieved).
     * </ul>
     */
    updateWithForeach = function(opts){
        // This will throw an exception if there are missing arguments.
        api.util.checkArgs(opts, ['store','foreach'], 
            'clrmi.storage.updateWithForeach');

        opts.on_chunk = function(data, next, abort){
            var i, updatedEntries = {}, doAbort = false;
            for(i = 0; i < data.length; i++){
                var ret = opts.foreach(data[i]);
                if( ret && ret.stop ){
                    doAbort = true;
                    break;
                } else if( ret && (ret.delete || ret.entry) ){
                    updatedEntries[data[i].id] = ret;
                }
            }

            var updateOpts = {
                on_success: function(){
                    doAbort ? abort() : next();
                },
                on_error: opts.on_error,
                entries: updatedEntries,
                storeName: opts.store
            };

            var updateCallbackID = wrapCallback(opts);

            api.base.invokeCLIFunction({
                apiName: 'storage',
                functionName: 'updateEntries',
                options: {
                    callbackID: callbackID,
                    dbName: dbName,
                    storeName: updateOpts.store,
                    entries: updateOpts.entries
                }
            });
        };

        that.read(opts);
    };

    /**
     * Updates the given entries.
     * 
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} store:          The name of the store to update. 
     *    <li>{map of objects} entries: A map of objects to update. Each key
     *                                 should be an entry id and the value 
     *                                 should be an object with any of the
     *                                 following fields:
     *                                 <ul>
     *                                   <li>{object} entry: 
     *                                       If entry.id matches the id of the 
     *                                       original entry, the existing saved 
     *                                       entry is overwritten with entry. 
     *                                   <li>{boolean} stop
     *                                       Stops the traversal if true. 
     *                                   <li>{boolean} delete
     *                                       Deletes the stored entry if true. 
     *                                 </ul>
     * </ul>
     * OPTIONAL:
     * <ul>
     *     <li>{function} on_success:  Invoked when the traversal is complete 
     *                                 and everything has been successfully 
     *                                 updated. 
     *     <li>{function} on_error:    Invoked if there's an error. 
     * </ul>
     */
    updateWithoutForeach = function(opts){
        // This will throw an exception if there are missing arguments.
        api.util.checkArgs(opts, ['store','entries'], 
            'clrmi.storage.updateWithoutForeach');

        // Pass the data one to the CLI.
        api.base.invokeCLIFunction({
            apiName: 'storage',
            functionName: 'updateEntries',
            options: {
                callbackID: wrapCallback(opts),
                dbName: dbName,
                storeName: opts.store,
                entries: opts.entries
            }
        });
    };

    // Public function definitions.

    /**
     * Adds a store.
     *
     * @param {object} opts  A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{array of strings} stores:  The names of the stores to add. 
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success: Invoked when the stores have been 
     *                               successfully created. 
     *    <li>{function} on_error:   Invoked if there's an error. 
     * </ul>
     * @throws CLRMIException if required arguments are missing.
     */
    this.addStores = function(opts) {
        api.base.log('Adding stores '+ JSON.stringify(opts.stores));
        // This will throw an exception if there are missing arguments.
        api.util.checkArgs(opts, ['stores'], 'clrmi.storage.addStore');

        var run = function(newOpts){
            api.base.log('In addStores.run for '+ JSON.stringify(opts.stores));
            var callbackID = wrapCallback(newOpts);

            api.base.invokeCLIFunction({
                apiName: 'storage',
                functionName: 'upgradeDB',
                options: {
                    callbackID: callbackID,
                    dbName: dbName,
                    storeNames: opts.stores,
                    storeOp: 'addStores'
                }
            });
        }

        // If we're in the middle of an upgrade, we can't upgrade here, too.
        addUpgradeCheck(run, opts);
    };

    /**
     * Removes a store.
     *
     * @param {object} opts  A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{array of strings} stores:  The names of the stores to remove. 
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success: Invoked when the stores have been 
     *                               successfully created. 
     *    <li>{function} on_error:   Invoked if there's an error. 
     * </ul>
     */
    this.removeStores = function(opts) {
        // This will throw an exception if there are missing arguments.
        api.util.checkArgs(opts, ['stores'], 'clrmi.storage.removeStore');

        var run = function(newOpts){
            var callbackID = wrapCallback(newOpts);

            return api.base.invokeCLIFunction({
                apiName: 'storage',
                functionName: 'upgradeDB',
                options: {
                    callbackID: callbackID,
                    dbName: dbName,
                    storeNames: opts.stores,
                    storeOp: 'removeStores'
                }
            });
        }

        // If we're in the middle of an upgrade, we can't upgrade here, too.
        addUpgradeCheck(run, opts);
    };

    /**
     * Clears a store.
     *
     * @param {object} opts  A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{array of strings} stores:  The names of the stores to clear. 
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success: Invoked when the stores have been 
     *                               successfully created. 
     *    <li>{function} on_error:   Invoked if there's an error. 
     * </ul>
     */
    this.clearStores = function(opts) {
        // This will throw an exception if there are missing arguments.
        api.util.checkArgs(opts, ['stores'], 'clrmi.storage.clearStore');

        var callbackID = wrapCallback(opts);

        return api.base.invokeCLIFunction({
            apiName: 'storage',
            functionName: 'clearStores',
            options: {
                callbackID: callbackID,
                dbName: dbName,
                storeNames: opts.stores
            }
        });
    };

    /**
     * Lists a stores.
     *
     * @param {object} opts  A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{function} on_success: Invoked when the store has been 
     *                               successfully created. Should expect a list
     *                               of store names as its only argument.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_error:   Invoked if there's an error. 
     * </ul>
     */
    this.listStores = function(opts) {
        var run = function(newOpts){
            var callbackID = wrapCallback(newOpts);

            return api.base.invokeCLIFunction({
                apiName: 'storage',
                functionName: 'listStores',
                options: {
                    callbackID: callbackID,
                    dbName: dbName
                }
            });
        }

        // If we're in the middle of an upgrade, we can't upgrade here, too.
        addUpgradeCheck(run, opts);
    };

    /**
     * Saves data to a store.
     *
     * @param {object} opts  A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} store:          The name of the store to save to.
     *    <li>{array of objects} data: An array of entries to be added. If an 
     *                                 entry contains an id, and an entry with 
     *                                 that id exists, then it will be 
     *                                 overwritten by the new entry. 
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success: Invoked when the store has been 
     *                               successfully created. 
     *    <li>{function} on_error:   Invoked if there's an error. 
     * </ul>
     */
    this.save = function(opts) {
        // This will throw an exception if there are missing arguments.
        api.util.checkArgs(opts, ['store','data'], 'clrmi.storage.save');

        var callbackID = wrapCallback(opts);

        return api.base.invokeCLIFunction({
            apiName: 'storage',
            functionName: 'save',
            options: {
                callbackID: callbackID,
                dbName: dbName,
                storeName: opts.store,
                data: opts.data
            }
        });
    };

    /**
     * Reads all of the data from the given store in chunks.
     *
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} store:          The name of the store to save to.
     *    <li>{function} on_chunk:     Invoked per chunk (see below). Chunks
     *                                 are processed asynchronously. Should
     *                                 expect three parameters:
     *                                 <ul>
     *                                     <li>{array of object} data
     *                                         The DB entries.
     *                                     <li>{function} next 
     *                                         Gets the next chunk.
     *                                         Parameterless.
     *                                     <li>{function} abort
     *                                         Takes two params: 
     *                                             {boolean} is_error,
     *                                             {string} error_msg. 
     *                                         Stops reading and causes either
     *                                         the on_error (if is_error = true)
     *                                         or on_success (otherwise)
     *                                         functions to be invoked. 
     *                                 </ul>
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success:   Invoked when everything has been read.
     *    <li>{function} on_error:     Invoked if there's an error.
     *    <li>{int} chunk_size:        The size of the chunks to process. E.g.,
     *                                 chunk_size = 50 will cause 50 entries to
     *                                 be read, stored in an array, and then
     *                                 passed to the on_chunk function. This
     *                                 must fall into the range: 
     *                                     0 < chunk_size <= 500
     *                                 If not present or if <= 0, the default
     *                                 250 will be used; if > 500, the default
     *                                 500 will be used.
     *    <li>{bool} reverse:          If true, the data will be read in reverse
     *                                 order of id. Default is 'false'.
     *    <li>{int} lower_bound:       The smallest id to retrieve; default: 0
     *    <li>{int} upper_bound:       The largest id to retrieve; default: -1
     *                                 (all ids >= lower_bound are retrieved).
     * @throws Exception if on_chunk is not specified.
     */
    this.read = function(opts){
        // This will throw an exception if there are missing arguments.
        api.util.checkArgs(opts, ['store','on_chunk'], 'clrmi.storage.read');

        var callbackID = wrapCallback(opts), chunk_size;

        // Figure out the chunk_size to use.
        if( opts.chunk_size !== undefined && 
                opts.chunk_size > MIN_CHUNK_SIZE && 
                opts.chunk_size <= MAX_CHUNK_SIZE ){
            chunk_size = opts.chunk_size;
        } else if( opts.chunk_size && opts.chunk_size > MAX_CHUNK_SIZE ){
            chunk_size = MAX_CHUNK_SIZE;
        }

        return api.base.invokeCLIFunction({
            apiName: 'storage',
            functionName: 'read',
            options: {
                callbackID: callbackID,
                dbName: dbName,
                storeName: opts.store,
                reverse: opts.reverse,
                lower_bound: opts.lower_bound,
                upper_bound: opts.upper_bound
            }
        });
    };


    /**
     * Updates entries in the given database/store.
     * 
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} store:          The name of the store to update. 
     *    <ul>One of: 
     *       <li>{function} foreach:   A function to run on each entry. It 
     *                                 should take a log entry as its only 
     *                                 parameter and optionally return an object
     *                                 with three optional fields:
     *                                 <ul>
     *                                   <li>{object} entry: 
     *                                       If entry.id matches the id of the 
     *                                       original entry, the existing saved 
     *                                       entry is overwritten with entry. 
     *                                   <li>{boolean} stop
     *                                       Stops the traversal if true. 
     *                                   <li>{boolean} delete
     *                                       Deletes the stored entry if true. 
     *                                 </ul>
     *      <li>{map of objects} entries: A map of objects to update. Each key
     *                                 should be an entry id and the value 
     *                                 should be an object with any of the
     *                                 following fields:
     *                                 <ul>
     *                                   <li>{object} entry: 
     *                                       If entry.id matches the id of the 
     *                                       original entry, the existing saved 
     *                                       entry is overwritten with entry. 
     *                                   <li>{boolean} stop
     *                                       Stops the traversal if true. 
     *                                   <li>{boolean} delete
     *                                       Deletes the stored entry if true. 
     *                                 </ul>
     *    </ul>
     * </ul>
     * OPTIONAL:
     * <ul>
     *     <li>{function} on_success:  Invoked when the traversal is complete 
     *                                 and everything has been successfully 
     *                                 updated. 
     *     <li>{function} on_error:    Invoked if there's an error. 
     *     <ul> Only if 'foreach' is specified:
     *        <li>{bool} reverse:      If true, the data will be read in reverse
     *                                 order of id. Default is 'false'.
     *        <li>{int} lower_bound:   The smallest id to retrieve; default: 0
     *        <li>{int} upper_bound:   The largest id to retrieve; default: -1
     *                                 (all ids >= lower_bound are retrieved).
     *     </ul>
     * </ul>
     */
    this.update = function(opts){
        opts = opts || {};
        opts.foreach ? updateWithForeach(opts) : updateWithoutForeach(opts);
    };

    /**
     * Deletes one or more entries from the given database/store.
     * 
     * @param {object} opts     A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} store:          The name of the store to update. 
     *    <li>{array of ints} ids:     The ids to delete.
     * </ul>
     * OPTIONAL:
     * <ul>
     *     <li>{function} on_success:  Invoked when the traversal is complete 
     *                                 and everything has been successfully 
     *                                 updated. 
     *     <li>{function} on_error:    Invoked if there's an error. 
     * </ul>
     */
    this.remove = function(opts){
        // This will throw an exception if there are missing arguments.
        api.util.checkArgs(opts, ['store','ids'], 'clrmi.storage.remove');

        // Holds the entries to delete. 
        var entries = {}, i;

        // We need a special map for the update function on the CLI side.
        for(i = 0; i < opts.ids.length; i++){
            entries[opts.ids[i]] = {'delete': true};
        }

        updateWithoutForeach({
            store: opts.store,
            entries: entries,
            on_success: opts.on_success,
            on_error: opts.on_error
        });
    };

    /**
     * Removes the database associated with this CLRM.
     *
     * @param {object} opts     A map of options:
     * OPTIONAL:
     * <ul>
     *     <li>{function} on_success:  Invoked when the traversal is complete 
     *                                 and everything has been successfully 
     *                                 updated. 
     *     <li>{function} on_error:    Invoked if there's an error. 
     * </ul>
     */
    this.removeDatabase = function(opts){

        var run = function(newOpts){
            var callbackID = wrapCallback(newOpts);

            return api.base.invokeCLIFunction({
                apiName: 'storage',
                functionName: 'removeDB',
                options: {
                    callbackID: callbackID,
                    dbName: dbName
                }
            });
        }

        // If we're in the middle of an upgrade, we can't upgrade here, too.
        addUpgradeCheck(run, opts);
    };


    init();
};

/**
 * Provides an easy interface for setting or getting preferences. Values 
 * can be anything serializable. This uses the same IndexedDB instance as
 * is used for the Storage API.
 */
CLRMI.prototype.Storage.prototype.Preferences = function(api, storage,callback){
    var that = this;
    const PREFERENCE_STORE = '__preferences__',
          PREFERENCE_KEY_NAME = 'name',
          PREFERENCE_VALUE_NAME = 'value',
          PREFERENCE_INDEX_NAME = 'name';

    // Private method declarations.
    var init, setMany;

    // Public method declarations.
    this.get, this.set;

    // Private method definitions.
    /**
     * Initializes the preference storage.
     */
    init = function() {
        var callbackID = storage.wrapCallback({
            on_success: callback,
            on_error: callback
        });

        return api.base.invokeCLIFunction({
            apiName: 'storage',
            functionName: 'upgradeDB',
            options: {
                callbackID: callbackID,
                dbName: storage.dbName,
                storeNames: [PREFERENCE_STORE],
                keyName: PREFERENCE_KEY_NAME,
                indexName: PREFERENCE_INDEX_NAME,
                storeOp: 'createIndexStore'
            }
        });
    };

    /**
     * Sets a set of preference-value pairs.
     *
     * @param {object} opts A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} prefs         A map of preference names to values.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success  The function to invoke when the value has
     *                               been retrieved.
     *    <li>{function} on_error    Called on error.
     * </ul>
     */
    setMany = function(opts){
        api.util.checkArgs(opts, ['prefs'], 
            'clrmi.storage.preferences.get');
        var callbackID = storage.wrapCallback(opts), data = [], pref;

        for( pref in opts.prefs ){
            data.push({});
            data[data.length-1][PREFERENCE_KEY_NAME] = pref;
            data[data.length-1][PREFERENCE_VALUE_NAME] = opts.prefs[pref];
        }

        return api.base.invokeCLIFunction({
            apiName: 'storage',
            functionName: 'save',
            options: {
                callbackID: callbackID,
                dbName: storage.dbName,
                storeName: PREFERENCE_STORE,
                data: data
            }
        });
    };



    // Public method definitions.
    /**
     * Sets a preference.
     *
     * @param {object} opts A map of options:
     * REQUIRED:
     * <ul>
     *    One of:
     *    <ul>
     *      <li>{string} pref        The name of the preference to set.
     *      <li>{*} value            The value to set pref to. This can be
     *                               anything that can be serializable.
     *    </ul>
     *    OR
     *    <ul>
     *      <li>{object} prefs       A map of preferences to values.
     *    </ul>
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_success  The function to invoke when the value has
     *                               been retrieved.
     *    <li>{function} on_error    Called on error.
     * </ul>
     */
    this.set = function(opts) {
        opts = opts || {};
        if( opts.pref && opts.value ){
            opts.prefs = opts.prefs || {};
            opts.prefs[opts.pref] = opts.value;
        } 
        setMany(opts);
    };


    /**
     * Gets a preference value (or the default value if none is present.)
     *
     * @param {object} opts A map of options:
     * REQUIRED:
     * <ul>
     *    <li>{string} pref          The name of the preference whose value 
     *                               should be retrieved.
     *    <li>{function} on_success  The function to invoke when the value has
     *                               been retrieved.
     * </ul>
     * OPTIONAL:
     * <ul>
     *    <li>{function} on_error    Called on error.
     *    <li>{*} defaultValue       What to return if the value of the pref
     *                               has not been set.
     * </ul>
     */
    this.get = function(opts){
        api.util.checkArgs(opts, ['pref','on_success'], 
            'clrmi.storage.preferences.get');

        var newOpts = api.util.copyObj(opts);
        var addDefault = function(data){
            opts.on_success(data ? data.value : opts.defaultValue);
        }
        newOpts.on_success = addDefault;

        var callbackID = storage.wrapCallback(newOpts);

        return api.base.invokeCLIFunction({
            apiName: 'storage',
            functionName: 'getFromIndex',
            options: {
                callbackID: callbackID,
                dbName: storage.dbName,
                storeName: PREFERENCE_STORE,
                indexName: PREFERENCE_INDEX_NAME,
                key: opts.pref
            }
        });        
    };

    init();
};