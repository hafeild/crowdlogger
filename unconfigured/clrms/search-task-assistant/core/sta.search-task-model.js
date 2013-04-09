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

RemoteModule.prototype.SearchTaskAssistant.prototype.SearchTaskModel = 
        function(sta, clrmAPI) {

    'use strict';

    // Private variables.
    var TIMEOUT = 2,
        QUERY_FLUSH_TIMEOUT = 3000,
        MIN_QUERY_DIFF = 3000,
        MAX_SIZE_OF_RECENTLY_ACCESSED = 20,
        that = this,
        clicks = {},
        mostRecentClick,
        searches = {},
        tasks = {},
        mostRecentTimestamp = 0,
        chronologicallyOrderedSearchIds = [],
        mostRecentlyAccessedSearchIds = [],
        initializationLock = true,
        overflowQueue = [],
        focusedPage,
        pageLookup = {},
        urlPatternBlacklist = [
            new RegExp('google.mail'),
            new RegExp('www.google.com/(search)|(url)'),
            new RegExp('^chrome'),
            new RegExp('bing.com')
        ],
        prevQuery,
        flushPrevQueryTimeout;

    // Private function declarations.
    var loadSearchesAndTasks, queueEventIfNeeded,
        createNewSearch, identifyTask, isUrlBlacklisted, processPageLoad,
        flushQueuedQueries, queueQuery, initStorage, updateStoredTasks,
        updateStoredSearches, updateMostRencentlyAccessedSearchIds,
        removeListeners;

    // Either don't need or requires some updating.
    var addListeners, parseSearches, parseTasks, populateFromActivityLog,
        processClick, processSearch, processPageFocus, processPageBlur;

    // Public variables.
    this.searches = searches; this.tasks = tasks;
    this.sti = sta.searchTaskIdentifier;
    this.chronologicallyOrderedSearchIds = chronologicallyOrderedSearchIds;
    this.mostRecentlyAccessedSearchIds = mostRecentlyAccessedSearchIds;
    this.maxSearchId = 0;  
    this.maxTaskId = 0; 
    this.maxTimestamp = 0;
    this.minTimestamp = Number.MAX_VALUE; 
    this.sta = sta;
    this.storage;
    this.pageLookup = pageLookup;
    this.clrmAPI = clrmAPI;

    // Public function declarations.
    this.hasInitializationLock; this.getCurrentSearches; this.save; 
    this.emptyQueue; this.init; this.chronologicalSearchComp; 
    this.unload;

    // Private function definitions.
    /**
     * Adds listeners for each of the events of interest.
     */
    addListeners = function(){
        clrmAPI.user.realTime.addActivityListeners({
            'query-entered': queueQuery,
            'page-loaded': processPageLoad,
            'link-clicked': processClick,
            'page-focused': processPageFocus,
            'page-blurred': processPageBlur
        });
    };

    /**
     * UPDATE
     * Reads and processes the activity log.
     * 
     * @param {function} callback The function to call when the log is finished 
     *      being read in.
     */
    populateFromActivityLog = function(minTime, maxTime, onsuccess, onerror){
        var entries = [], processing = false, processEntries;

        sta.log('[sta.search-task-model.js] '+
            'Populating from the activity log...maxTime='+maxTime +
            ', minTime='+ minTime);

        processEntries = function(data, next, abort){
            var processNextEntry = function(){
                if( data.length === 0 ){
                    sta.log('[sta.search-task-model.js] Calling "next()"');
                    next();
                    return;
                }
                var entry = data.shift();

                sta.log('[sta.search-task-model.js] Processing log entry:');
                sta.log(entry);

                if( maxTime && entry.t > maxTime ){
                    sta.log('[sta.search-task-model.js] Skipping...');
                    setTimeout(processNextEntry, TIMEOUT);
                    return;
                }

                if( entry.t < minTime ) {
                    sta.log('[sta.search-task-model.js] '+
                        'passed min time, aborting...');
                    abort();
                    return;
                }

                switch(entry.e){
                    // Click.
                    case 'click':
                        processClick({overrideInitializationLock: true}, 
                            entry, processNextEntry );
                        break;
                    // Page load.
                    case 'pageload':
                        processPageLoad({overrideInitializationLock: true}, 
                            entry, processNextEntry );
                        break;
                    // Focus.
                    case 'pagefocus':
                        processPageFocus({overrideInitializationLock: true}, 
                            entry, processNextEntry );
                        break;
                    case 'pageblur':
                        processPageBlur({overrideInitializationLock: true}, 
                            entry, processNextEntry );
                        break;
                    // Search (well, query...).
                    case 'search':
                        queueQuery({overrideInitializationLock: true}, 
                            entry, processNextEntry );
                        break;
                    default: 
                        processNextEntry();
                }
            };
            processNextEntry();
        };

       // Read in the activity log and pass each event to the corresponding 
       // processor.
       clrmAPI.user.history.getInteractionHistory({
           reverse: true,
           on_chunk: processEntries,
           on_error: onerror,
           on_success: onsuccess
        });
    };

    /**
     * Checks if it is necessary to queue up an event because initialization is
     * underway. If so, this takes care of adding the event to the queue.
     *
     * @param {function} f        The event processing function to call.
     * @param {object}   e        The event object.
     * @param {object}   d        The data associated with the event.
     * @param {function} callback The function to call when f is finished running.
     */
    queueEventIfNeeded = function(f, e, d, callback){
        if( (initializationLock && !e.overrideInitializationLock) ||
                (that.storage.updatingLock && !e.overrideUpdatingLock) ){
            sta.log('[sta.search-task-model.js] Queuing '+ e.e);
            overflowQueue.push([f,e,d,callback]);
            return true;
        }
        if( e.t ){
            that.maxTimestamp = Math.max(that.maxTimestamp, e.t);
            that.minTimestamp = Math.min(that.minTimestamp, e.t);
            if( isNaN(that.maxTimestamp) ){
                sta.log('Found NaN timestamp in queryEventIfNeeded: '+ 
                    JSON.stringify(e));
            }
        }
        return false;
    };

    /**
     * Creates a new search from the given data with a unique id and updates the
     * necessary structures: chronologicallyOrderedSearchIds (assumes the
     * new searches are given in chronological order) and searches. A 'new-search'
     * event will be triggered on the sta.messages element. The created  
     * search will be marked as inconsistent with the DB. In other words, this 
     * should be used for new searches from the activity log or in real time, not 
     * from the searches log.
     *
     * @param {object} data The data required to create a new search. The possible
     *     fields and their default values are:
     * <ul>
     *    <li>timestamp: -1
     *    <li>id: -1
     *    <li>taskId: -1
     *    <li>pages: []
     *    <li>url: ""
     *    <li>text: ""
     *    <li>isQuery: false
     *    <li>se: ""
     * </ul>
     * @return The newly created search.
     */
    createNewSearch = function(data){
        var search;

        // Get an id.
        that.maxSearchId++;
        data.id = that.maxSearchId;

        // Create the search.
        search = new sta.Search(data, sta, true);
        
        // Update the necessary structures.
        // that.chronologicallyOrderedSearchIds.
        //     unshift(search.getId());

        // that.updateMostRencentlyAccessedSearchIds(
        //     search.getId());

        //that.searches[search.getId()] = search;

        // Trigger the 'new-search' event.
        // if( !that.initializationLock ){
        //     setTimeout(function(){
        //         sta.messages.trigger('new-search', {searchId: data.id});
        //     }, TIMEOUT );
        // }

        return search;
    };

    /**
     * Examines existing tasks to see if the given search belongs to one of them,
     * or creates a new task if it doesn't fit with any existing tasks. This 
     * function also takes care of merging existing tasks (in the event that the
     * search bridges multiple existing tasks) and updating the tasks structures and
     * all affected searches.
     *
     * @param {object} search The Search to classify.
     * @param {function} callback [Optional] A function to call when the 
     *     identification is completed and all structures have been updated. It
     *     should expect the id of the identified task.
     */
    identifyTask = function(search, callback){
        // This gets called once the identification has completed.
        var onIdentification = function(relatedTasks){

            var id, toTrigger = [], task, deletedTask, i;

            // This is a new task.
            if( relatedTasks.length === 0 ){
                // Get a new id.
                that.maxTaskId++;
                id = that.maxTaskId;

                // Create the new task.
                task = new sta.Task({
                    startTimestamp: search.getTimestamp(),
                    endTimestamp: search.getTimestamp(),
                    id: id,
                    searchIds: [search.getId()],
                    displayName: search.getText().toLowerCase()
                }, sta, true);

                // // Update the task map.
                // tasks[id] = task;

                // Add a trigger for an 'updated-task' event.
                // toTrigger.push(['new-task', {taskId: id}]);

            // There are existing tasks that need to be updated.
            } else {
                // sta.log('Task ids: '+ JSON.stringify(relatedTasks));

                // Add the search to the first task.
                id = parseInt(relatedTasks.shift()); //.getId();
                task = tasks[id];

                // sta.log('Identified task; id: '+ id +'; task: '+task);


                task.addSearchIds([search.getId()]);

                // Merge all of the other tasks in with the first one.
                if( relatedTasks.length > 0 ){
                    task.mergeWith(relatedTasks);
                }

                // // Send out 'task deleted' messages.
                // while( relatedTasks.length > 0 ){
                //     deletedTask = relatedTasks.shift();
                //     toTrigger.push(['deleted-task', {
                //         taskId: deletedTask,
                //         mergedWith: id
                //     }]);
                // }

                // // Add trigger for an 'updated-task' event.
                // toTrigger.push(['updated-task',{taskId: id}]);
            }

            // Update the search.
            // search.setTaskId(id);

            // Invoke the callback with the task id if it exists.
            if( callback ){ setTimeout( function(){ callback(id); }, TIMEOUT);}

            // Trigger whatever event is required.
            // if( !initializationLock ){
            //     for( i = 0; i < toTrigger.length; i++ ){
            //         var event = toTrigger[i][0],
            //             data = toTrigger[i][1];
            //         setTimeout( function(){
            //             sta.messages.trigger(event, data);
            //         }, TIMEOUT ); 
            //     }
            // }
        };

        // Identify the related tasks.
        setTimeout( function(){
            sta.searchTaskIdentifier.identifyTask(
                search, 
                tasks, 
                searches,
                onIdentification );
        }, TIMEOUT ); 
    };

    /**
     * Processes a click event.
     */
    processClick = function(event, data, callback){
        if(queueEventIfNeeded(processClick, event, data, callback)){ return; }

        // if( prevQuery ){
        //     flushQueuedQueries(function(){
        //         processClick(event, data, callback);
        //     });
        //     return;
        // }

        var srcUrl = data.isSerp ?
            sta.util.truncateUrl(data.sourceUrl) + data.query :
            data.sourceUrl;

        sta.log('In proc. click; srcUrl: '+ srcUrl );
        var search = pageLookup[srcUrl];
        if( search ){
            sta.log('In proc. click; targetUrl: '+ data.targetUrl );
            
            pageLookup[data.targetUrl] = search;
            clicks[sta.util.truncateUrl(data.targetUrl)] = search;
            mostRecentClick = search;

            search.addPages([{
                isSerpClick: data.isSerp,
                url: data.targetUrl
            }]);

            // // Trigger an event indicating a new page has been added.
            // if( !initializationLock ){
            //     setTimeout(function(){
            //         sta.messages.trigger('new-page', {
            //             pageUrl: data.targetUrl,
            //             searchId: search.getId()
            //         });
            //     }, TIMEOUT);
            // }
        } 
           
        if( callback ){ setTimeout(callback, TIMEOUT); }
    };

    /**
     * Creates a new search event and classifies it into a task. The callback is
     * invoked once the task classification has completed.
     *
     * @param {object} event The event object. Setting event.overrideLock = true
     *    will cause the given search to be processed even if initialization is
     *    underway...don't set that.
     * @param {object} data  The search data. Should have the following fields:
     * <ul>
     *    <li>time (integer)
     *    <li>query (string)
     *    <li>searchEngine (string)
     *    <li>url (string)
     * </ul>
     * @param {function} callback The function to invoke when the search's task has 
     *    been identified. It should expect the id of the task as a parameter.
     */
    processSearch = function(event, data, callback){
        if(queueEventIfNeeded(processSearch, event, data, callback)){ return; }

        sta.log('[sta.search-task-model.js] Processing search: '+
            JSON.stringify(data) );

        // Create a new search object with an id.
        var search = createNewSearch({
                timestamp: data.t,
                url: data.url,
                isQuery: true,
                se: data.se,
                text: data.q
            }),
            url = sta.util.truncateUrl(data.url);
        pageLookup[url+data.q] = search;
        pageLookup[data.url] = search;
        sta.log('In proc. search; url: '+ url+data.q );

        // Classify the search and update the tasks.
        identifyTask(search, callback);
    };

    queueQuery = function(event, data, callback){
        // if(queueEventIfNeeded(
        //     queueQuery, event, data, callback)){
        //     return;
        // }

        // if( flushPrevQueryTimeout !== undefined ){
        //     clearTimeout( flushPrevQueryTimeout );
        //     flushPrevQueryTimeout = undefined;
        // }
        // var localPrevQuery;

        // if( prevQuery && ( prevQuery.q !== data.q.slice(0, prevQuery.q.length)||
        //         prevQuery.t - data.t > MIN_QUERY_DIFF)){
        //     localPrevQuery = prevQuery;
        //     prevQuery = data;
        //     processSearch(event,localPrevQuery,callback);
            
        // } else {
        //     prevQuery = data;
        //     if( callback ){ setTimeout(callback, TIMEOUT); }
        // }

        // setTimeout( this.flushQueuedQueries, this.QUERY_FLUSH_TIMEOUT );
        processSearch(event, data, callback);
    };

    flushQueuedQueries = function(callback){
        // var localPrevQuery;
        // if(prevQuery){
        //     localPrevQuery = prevQuery;
        //     prevQuery = undefined;
        //     processSearch({overrideLock:true}, localPrevQuery, callback);

        // } else if( callback ) {
        //     //setTimeout(callback, TIMEOUT);
        //     callback();
        // }
        callback();
    };

    processPageLoad = function(event, data, callback){
        sta.log('[search-task-model.js] In load, fyi. data: '+ 
            JSON.stringify(data));

        if(queueEventIfNeeded(processPageLoad, event, data, callback)){return;}

        if( isUrlBlacklisted(data.url) ){
            sta.log('On blacklist :(');
            if(callback){ setTimeout(callback, TIMEOUT); }
            return;
        }
        sta.log('In proc. page load; url: '+ data.url);

        var fullUrl = data.url,
            truncatedUrl = sta.util.truncateUrl(data.url),
            search, text, page;

        //if( clicks[truncatedUrl] !== undefined ){
        if( mostRecentClick ){
            sta.log('Found in clicks: '+ truncatedUrl);
            // search = clicks[truncatedUrl];
            // delete clicks[truncatedUrl];
            search = mostRecentClick;
            mostRecentClick = undefined;
            pageLookup[fullUrl] = search;
        } else {
            search = pageLookup[fullUrl];
        }

        if( !search || !sta.util.areSameDay(search.getTimestamp(), data.t) ){
            sta.log('Search is undefined');

            sta.log('Not on blacklist!');

            text = data.ttl;

             // === "" ? 
             //    data.url.replace(/(^https{0,1}:\/\/(www\.){0,1})/g, "").
             //        replace(/[\W_]+/g, " ") : data.title;

            // Create a new search object with an id.
            search = createNewSearch({
                timestamp: data.t,
                url: data.url,
                isQuery: false,
                se: "",
                text: text
            });

            pageLookup[data.url] = search;

            search.addPages([{
                isSerpClick: false,
                url: data.url,
                initialAccess: data.t,
                title: data.ttl,
                favicon: sta.util.getFaviconURL(data.url, true) //clrmAPI.ui.getFaviconURL(data.url, true)
            }]);

            // Classify the search and update the tasks.
            identifyTask(search, callback);
        } else {
            sta.log('Search IS defined: '+ search.getId() +' : '+
                search.getText());

            page = search.getPage(data.url);
            sta.log(page);
            if( page === undefined || page.initialAccess > -1 ){
                sta.log('Adding page');
                search.addPages([{
                    isSerpClick: false,
                    url: data.url,
                    initialAccess: data.t,
                    title: data.ttl,
                    favicon: sta.util.getFaviconURL(data.url, true) // clrmAPI.ui.getFaviconURL(data.url, true)
                }]);
            } else {
                sta.log('Updating page');
                search.updatePage(data.url, {
                    initialAccess: data.t,
                    title: data.ttl,
                    favicon: sta.util.getFaviconURL(data.url, true) //clrmAPI.ui.getFaviconURL(data.url, true)
                });
            }

            // Updated the list of recently accessed searches.
            updateMostRencentlyAccessedSearchIds(search.getId());

            if(callback){ setTimeout(callback, TIMEOUT); }
        }
    };

    isUrlBlacklisted = function(url){
        var i;
        for(i = 0; i < urlPatternBlacklist.length; i++ ){
            if( urlPatternBlacklist[i].test(url) ){
                return true;
            }
        }
        return false;
    };

    /**
     * If another page was in focus, its dwell time is updated. Then updates the
     * global <code>focusedPage</code> object to point to the page currently in
     * focus.
     *
     * @param {DOM Event} event    The DOM event.
     * @param {object} data        The interaction event data.
     * @param {function} callback  The function to invoke when the everything
     *                             has been processed.
     */
    processPageFocus = function(event, data, callback){
        if(queueEventIfNeeded(processPageFocus, event, data, callback)){return;}

        var page, search;
        sta.log('In page focus for '+ data.url);

        if( focusedPage ){
            sta.log('>> focusedPage:');
            sta.log(focusedPage);
            page = focusedPage.search.getPage(focusedPage.url);
            if( page ){
                focusedPage.search.updatePage(focusedPage.url, {
                    dwellTime: page.dwellTime + (data.t-focusedPage.startFocus)
                });
            }
        }

        search = pageLookup[data.url];
        sta.log('Is this part of an existing search?');
        if( search ){
            sta.log('yes!');
            sta.log('>> search:');
            sta.log(search);

            if( data.ttl ){
                search.updateTextIfNecessary(data.ttl);
                search.updatePage(data.url, {
                    title: data.ttl
                });
            }

            focusedPage = {
                url: data.url,
                search: search,
                startFocus: data.t
            };
            // Updated the list of recently accessed searches.
            updateMostRencentlyAccessedSearchIds(search.getId());
        } else {
            sta.log('no :(');
            focusedPage = undefined;
        }

        if( callback ){ setTimeout(callback, TIMEOUT); }
    };

    processPageBlur = function(event, data, callback){
        if(queueEventIfNeeded(processPageBlur, event, data, callback)){return;}

        var page, search;
        sta.log('In page blur for '+ data.url);

        if( focusedPage ){
            sta.log('>> focusedPage:');
            sta.log(focusedPage);
            page = focusedPage.search.getPage(focusedPage.url);
            if( page ){
                focusedPage.search.updatePage(focusedPage.url, {
                    dwellTime: page.dwellTime + (data.t-focusedPage.startFocus)
                });
            }
        }

        focusedPage = undefined;

        if( callback ){ setTimeout(callback, TIMEOUT); }
    };

    /**
     * Adds the given search id to the list of most recently accessed searches. If
     * the id is already in the list, it is moved to the front. If the list of
     * search ids surpasses the maximum, it is truncated.
     *
     * @param {integer} searchId The id of the search to add to the front of the
     *     list.
     */
    updateMostRencentlyAccessedSearchIds = function(searchId) {
        var oldIndex = mostRecentlyAccessedSearchIds.indexOf(searchId);
        if( oldIndex === -1 ){
            if( mostRecentlyAccessedSearchIds.length >
                    MAX_SIZE_OF_RECENTLY_ACCESSED ){
                mostRecentlyAccessedSearchIds.pop();
            }
        } else {
            mostRecentlyAccessedSearchIds.splice(
                oldIndex, 1);
        }

        mostRecentlyAccessedSearchIds.
            unshift(searchId);
    };  

    /**
     * Removes listeners for each of the events of interest.
     */
    removeListeners = function(){
        clrmAPI.user.realTime.removeActivityListeners({
            'query-entered': queueQuery,
            'page-loaded': processPageLoad,
            'link-clicked': processClick,
            'page-focused': processPageFocus
        });
    };

    // Public function definitions.
    /**
     * Initializes the search model. If there is a saved search model state (in the
     * search and task logs), these are loaded. Otherwise, the activity log is
     * processed to build the model.
     */
    this.init = function(){
        var load, setMaxTimestamp, setMinTimestamp;

        sta.log('[sta.search-task-model.js] Initializing Search Model...');

        sta.log('[sta.search-task-model.js] Adding listeners...');
        // Add listeners.
        addListeners();

        sta.log('[sta.search-task-model.js] Creating the storage driver...');
        // Create the storage driver.
        that.storage = new sta.Storage(sta, clrmAPI);

        load = function(){
            sta.log('[sta.search-task-model.js] '+
                'Loading existing searches and tasks...');
            // Load the search and task logs.
            that.storage.loadSearchesAndTasks(function(){
                // There may be some gaps between what was stored previously and
                // what events have been queued up; read these in.
                if( that.maxSearchId > 0 ){
                    populateFromActivityLog(that.maxTimestamp, 
                        overflowQueue.length>0 ? overflowQueue[0].t : undefined,
                        function(){
                            sta.log('[sta.search-task-model.js] '+
                                'populateFromActivityLog finished!');
                            that.emptyQueue(function(){
                                initializationLock = false;
                                sta.messages.trigger('search-model-initialized');
                            }, {overrideInitializationLock: true});
                    });
                } else {
                    that.emptyQueue(function(){
                        initializationLock = false;
                        sta.messages.trigger('search-model-initialized');
                    }, {overrideInitializationLock: true});
                }
            });
        };

        setMinTimestamp = function(){
            clrmAPI.storage.preferences.get({
                pref: 'minTimestamp',
                defaultValue: Number.MAX_VALUE,
                on_success: function(val){
                    that.minTimestamp = val || 0;
                    load();
                },
                on_error: load
            });
        };

        setMaxTimestamp = function(){
            clrmAPI.storage.preferences.get({
                pref: 'maxTimestamp',
                defaultValue: 0,
                on_success: function(val){
                    that.maxTimestamp = val || 0;
                    setMinTimestamp();
                },
                on_error: setMinTimestamp
            });
        };

        // Initialize the storage. Once that's done, we can worry about
        // loading the other data.
        that.storage.initStorage(setMaxTimestamp);
    };

    // Empty the queue when everything is finished being initialized.
    this.emptyQueue = function(onsuccess, overrides){
        sta.log('[sta.search-task-model.js] Emptying the queue...');
        if( overflowQueue.length === 0 ){
            sta.log('[search-task-model.js] overflowQueue=0, removing lock.');
            if(onsuccess){ setTimeout(onsuccess, TIMEOUT); }
        } else {
            var event = overflowQueue.shift();
            if( event.t > that.maxTimestamp ){
                //sta.log(event[1]);
                //sta.log(event[2]);
                //event[1].overrideLock = true;
                event[0](overrides, event[2], function(){
                    that.emptyQueue(onsuccess, overrides);
                });
            } else {
                setTimeout(function(){
                    that.emptyQueue(onsuccess, overrides);
                }, 1);
            }
        }
    };

    /**
     * Returns whether or not initialization is under way.
     *
     * @return {boolean} True if the initialization lock is one.
     */
    this.hasInitializationLock = function(){return initializationLock;};

    /**
     * Returns the n most recent searches, sorted in chronological order.
     *
     * @param {integer} n The number of recent searches to return. Default: 10.
     * @return An array of the n most recent searches (Search objects).
     */
    this.getCurrentSearches = function(n){
        n = n || 10;
        //return mostRecentlyAccessedSearchIds.slice(0,n);
        return chronologicallyOrderedSearchIds.slice(0,n);
    };

    /**
     * For reverse lists.
     *
     * @param {int} sid2  The second search id.
     * @param {int} sid1  The first search id.
     * @return  The difference between the timestamp associated with sid2 
     *          and sid1.
     */
    this.chronologicalSearchComp = function(sid2, sid1){
        // sta.log('[chronologicalSearchComp] sid1: '+ sid1 +', sid2: '+ sid2 );
        return that.searches[sid1].getTimestamp() - 
               that.searches[sid2].getTimestamp();
    };

    /**
     * Unloads listeners and sets the major data structures to null.
     */
    this.unload = function(){
        removeListeners();
        this.searches = null;
        this.tasks = null;
        this.chronologicallyOrderedSearchIds = null;
    };
};