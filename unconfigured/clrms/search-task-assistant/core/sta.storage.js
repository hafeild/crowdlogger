/**
 * @fileOverview Handles modeling a user's search behavior. Listens for 
 * browsing events and updates the current search model.
 *
 * <p><i>
 * Copyright (c) 2010-2013      <br/>
 * University of Massachusetts  <br/>
 * All Rights Reserved
 * </i></p>
 * 
 * @author hfeild
 */
RemoteModule.prototype.SearchTaskAssistant.prototype.Storage = 
        function(sta, clrmAPI){

    'use strict';
    // Private members.
    var UPDATE_TIMEOUT = 500,
        SEARCH_STORE = 'searches',
        TASK_STORE = 'tasks',
        that = this,
        searchesUpdated = {},
        tasksUpdated = {},
        timer,
        model = sta.searchTaskModel;

    // Private functions.
    var updateStoredTasks, updateStoredSearches, initStorage, parseSearches,
        parseTasks, setUpdateTimeout, updateTimestamps;

    // Public members.
    this.updatingLock = false;

    // Public functions.
    this.update; this.searchUpdated; this.taskUpdated; this.initStorage;

    // Private function definitions.
    /**
     * Deserializes the list of JSON search entries. 
     *
     * @param {array of objects} searchEntires  A list of serialized search 
     *                                          entries.
     */
    parseSearches = function(searchEntries){
        while( searchEntries.length > 0 ) {
            var entry = searchEntries.shift(),
                search = new sta.Search(entry, sta, false);

            model.maxSearchId = Math.max(entry.id, model.maxSearchId);
            //model.chronologicallyOrderedSearchIds.unshift(entry.id);
            //model.searches[entry.id] = search;
        }
    };

    /**
     * Deserializes the list of JSON task entries. 
     *
     * @param {array of objects} taskEntires  A list of serialized task entries.
     */
    parseTasks = function(taskEntries){
        while( taskEntries.length > 0 ) {
            var entry = taskEntries.shift(),
                task = new sta.Task(entry, sta, false);

            model.maxTaskId = Math.max(model.maxTaskId, entry.id);
            // model.tasks[entry.id] = task;
            model.maxTimestamp =
                Math.max(model.maxTimestamp, entry.endTimestamp);
            model.minTimestamp =
                Math.min(model.minTimestamp, entry.startTimestamp);

            if( isNaN(model.maxTimestamp) ){
                sta.log('Found NaN timestamp for task: '+ JSON.stringify(entry));
            }
        }
    };

    /**
     * Saves all marked tasks.
     *
     * @param {object} tasks            A map of task ids to task pointers.
     * @param {function} onsuccess      Invoked on success.
     * @param {function} onerror        Invoked if there was an error.
     */
    updateStoredTasks = function( tasks, onsuccess, onerror ){
        sta.log('[sta.storage.js] Updating stored tasks...');
        var formattedTasks = {}, numTasksToUpdate = 0, newTasks = [], 
            id, updateExisting;

        // Figure out which tasks are new and which are modifications of 
        // existing tasks.
        for(id in tasks){
            if( tasks[id].isNew ){
                tasks[id].isNew = false;
                newTasks.push( tasks[id].getData() );
            } else if( tasks[id].isDeleted() ){
                formattedTasks[id] = {'delete': true};
                numTasksToUpdate += 1;
            } else {
                formattedTasks[id] = {entry: tasks[id].getData()};
                numTasksToUpdate += 1;
            }
        }

        // Try updating existing tasks, if there are any that need to be 
        // updated.
        updateExisting = function(){
            sta.log('[sta.storage.js] Updating existing tasks ('+ 
                numTasksToUpdate +' of them)');
            sta.log(formattedTasks);

            if( numTasksToUpdate > 0 ){
                clrmAPI.storage.update({
                    store: TASK_STORE,
                    entries: formattedTasks,
                    on_success: onsuccess,
                    on_error: onerror
                });
            } else if( onsuccess ){
                // There were no tasks to update.
                onsuccess();
            }
        };

        sta.log('[sta.storage.js] Saving new tasks ('+ 
            newTasks.length +' of them)');

        // Save any new tasks then update existing ones.
        if( newTasks.length > 0 ){
            clrmAPI.storage.save({
                store: TASK_STORE,
                data: newTasks,
                on_success: updateExisting,
                on_error: onerror
            });
        } else {
            // No new tasks.
            updateExisting();
        }
    };

    /**
     * Saves the marked searches.
     *
     * @param {object} searches         A map of search ids to search pointers.
     * @param {function} onsuccess      Invoked on success.
     * @param {function} onerror        Invoked if there was an error.
     */
    updateStoredSearches = function( searches, onsuccess, onerror ){
        sta.log('[sta.storage.js] Updating stored searches...');

        var formattedSearches = {}, numSearchesToUpdate = 0, newSearches = [], 
            id, updateExisting;

        // Figure out which searches are new and which are modifications of 
        // existing tasks.
        for(id in searches){
            if( searches[id].isNew ){
                searches[id].isNew = false;
                newSearches.push( searches[id].getData() );
            } else {
                formattedSearches[id] = searches[id].isDeleted() ?
                    {'delete': true} : {entry: searches[id].getData()};
                numSearchesToUpdate += 1;
            }
        }

        // Try updating existing searches, if there are any that need to be 
        // updated.
        updateExisting = function(){
            sta.log('[sta.storage.js] Updating existing searches ('+ 
                numSearchesToUpdate +' of them)');
            sta.log(formattedSearches);

            if( numSearchesToUpdate > 0 ){
                clrmAPI.storage.update({
                    store: SEARCH_STORE,
                    entries: formattedSearches,
                    on_success: onsuccess,
                    on_error: onerror
                });
            } else if( onsuccess ){
                // There were no tasks to update.
                onsuccess();
            }
        };

        // Save any new searches, then update existing ones.
        if( newSearches.length > 0 ){
            clrmAPI.storage.save({
                store: SEARCH_STORE,
                data: newSearches,
                on_success: updateExisting,
                on_error: onerror
            });
        } else if(onsuccess) {
            updateExisting();
        }
    };

    /**
     * Updates the timestamps.
     */
    updateTimestamps = function(onsuccess, onerror){
        clrmAPI.storage.preferences.set({
            prefs: {
                maxTimestamp: model.maxTimestamp,
                minTimestamp: model.minTimestamp
            },
            on_success: onsuccess,
            on_error: onerror
        });
    };

    // Public function definitions.
    /**
     * Checks if we already have storage allocated; if not, allocates it.
     * 
     * @param {function} oncomplete Invoked once storage has been allocated or
     *                              it is discovered that we've already 
     *                              allocated storage.
     */
    this.initStorage = function(oncomplete){
        sta.log('[sta.storage.js] Initializing storage...');
        // Create some stores where we can save data.
        clrmAPI.storage.listStores({
            on_success: function(stores){
                if( stores.indexOf(SEARCH_STORE) < 0 || 
                        stores.indexOf(TASK_STORE) < 0 ){
                    sta.log('[sta.storage.js] Stores don\'t exist; upgrading.');
                    clrmAPI.storage.addStores({
                        stores: [SEARCH_STORE, TASK_STORE],
                        on_success: function(){
                            sta.log('[sta.storage.js] '+
                                'Finished initializing storage...');
                            if(oncomplete){ oncomplete(); }
                        }
                    });
                } else {
                    sta.log('[sta.storage.js] '+
                        'Finished initializing storage...');
                    if(oncomplete){ oncomplete(); }
                }
            }
        });
    };

    /**
     * Loads the stored searches and tasks. 
     *
     * @param {function} callback  A function to be called once all of the data has
     *      been read in.
     */
    this.loadSearchesAndTasks = function(onsuccess, onerror){
        sta.log('[sta.storage.js] In loadSearchesAndTasks');
        var loadTasks, loadSearches;

        loadTasks = function(){
            sta.log('[sta.storage.js] Loading tasks...');
            clrmAPI.storage.read({
                store: TASK_STORE,
                on_chunk: function(taskEntries, next, abort){
                    parseTasks(taskEntries);
                    next();
                },
                on_error: onerror,
                on_success: onsuccess
            });
        };

        loadSearches = function(){
            sta.log('[sta.storage.js] Loading searches...');
            clrmAPI.storage.read({
                store: SEARCH_STORE,
                on_chunk: function(searchEntries, next, abort){
                    parseSearches(searchEntries);
                    next();
                },
                on_error: onerror,
                on_success: loadTasks
            });
        };

        loadSearches();
    };

    /**
     * Updates all modified searches and tasks.
     * @param {function} onsuccess      Invoked on success.
     * @param {function} onerror        Invoked if there was an error.
     */
    this.update = function(onsuccess, onerror){
        var onerrorIntermediate, onsuccessIntermediate, 
            tasksToUpdate, searchesToUpdate;

        timer = undefined;
        if( that.updatingLock ){
            setUpdateTimeout();
            return;
        }

        that.updatingLock = true;

        onerrorIntermediate = function(e){ 
            sta.log('[sta.storage.js] '+
                'Error while updating stored searches/tasks:');
            sta.log(e);

            model.emptyQueue(function(){
                that.updatingLock = false;
                if(onerror){ onerror(e); }
            }, {overrideUpdatingLock: true});
        };

        onsuccessIntermediate = function(){
            sta.log('[sta.storage.js] '+
                'Finished updating stored searches/tasks...');

            model.emptyQueue(function(){
                that.updatingLock = false;
                if(onsuccess){ onsuccess(); }
            }, {overrideUpdatingLock: true});
        };

        tasksToUpdate = tasksUpdated;
        searchesToUpdate = searchesUpdated;
        searchesUpdated = {};
        tasksUpdated = {};

        updateStoredSearches(searchesToUpdate, function(){
            updateStoredTasks(tasksToUpdate, function(){
                updateTimestamps(onsuccessIntermediate, onerrorIntermediate);
            }, onerrorIntermediate);
        }, onerrorIntermediate);
    };

    /**
     * Sets a update timeout.
     *
     * @param {boolean} force  If <code>true</code>, ignores the current state
     *                         of <code>model.hasInitializationLock()</code>.
     */
    this.setUpdateTimeout = function(force){
        if( (force || !model.hasInitializationLock()) && !timer ){ 
            timer = setTimeout(function(){
                that.update();
            }, UPDATE_TIMEOUT);
        }
    };

    /**
     * Adds the given task to the list of tasks to update.
     *
     * @param {Task} task  The task that has been updated.
     */
    this.taskUpdated = function(task){
        tasksUpdated[task.getId()] = task;
        that.setUpdateTimeout();
    };

    /**
     * Adds the given search to the list of searches to update.
     *
     * @param {Search} search  The search that has been updated.
     */
    this.searchUpdated = function(search){
        searchesUpdated[search.getId()] = search;
        that.setUpdateTimeout();
    };
};