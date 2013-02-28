/**
 * @fileOverview Handles modeling a user's search behavior. Listens for 
 * browsing events and updates the current search model.
 *
 * <p><i>
 * Copyright (c) 2010-2012      <br>
 * University of Massachusetts  <br>
 * All Rights Reserved
 * </i></p>
 * 
 * @author hfeild
 */

RemoteModule.prototype.SearchModel = function(sta){
    // Private variables.
    var that = this,
        TIMEOUT = 2,
        QUERY_FLUSH_TIMEOUT = 3000,
        MIN_QUERY_DIFF = 3000,
        MAX_SIZE_OF_RECENTLY_ACCESSED = 20,
        clicks = {},
        mostRecentClick = {},
        searches = {},
        tasks = {},
        mostRecentTimestamp = 0,
        chronologicallyOrderedSearchIds = [],
        mostRecentlyAccessedSearchIds = [],
        initializationLock = true,
        overflowQueue = [],
        maxSearchId = 0,
        maxTaskId = 0,
        focusedPage = undefined,
        pageLookup = [],
        urlPatternBlacklist = [
            new RegExp('google.mail'),
            new RegExp('www.google.com/(search)|(url)'),
            new RegExp('^chrome'),
            new RegExp('bing.com')
        ],
        prevQuery = undefined,
        flushPrevQueryTimeout = undefined;

    // Private function declarations.
    var init,loadSearchesAndTasks, queueEventIfNeeded,
        createNewSearch, identifyTask, isUrlBlacklisted, processPageLoad,
        flushQueuedQueries, queueQuery;

    // Either don't need or requires some updating.
    var addListeners, parseSearches, parseTasks, populateFromActivityLog,
        processClick, processSearch, processPageFocus;

    // Public variables.
    this.searches = searches, this.tasks = tasks, 
    this.sti = sta.searchTaskIdentifier,
    this.chronologicallyOrderedSearchIds = chronologicallyOrderedSearchIds;

    // Public function declarations.
    this.hasInitializationLock, this.getCurrentSearches;

    // Private function definitions.

    /**
     * Initializes the search model. If there is a saved search model state (in the
     * search and task logs), these are loaded. Otherwise, the activity log is
     * processed to build the model.
     */
    init = function(){
        var emptyQueue;

        // Add listeners.
        addListeners();

        // Load the search and task logs; if they're empty, process the events
        // in the activity log.
        loadSearchesAndTasks(function(){
            console.log('In init; '+
                    'heard back from loadSearchesAndTasks; searches.length: '+
                    Object.keys(searches).length);

            if( Object.keys(searches).length === 0 ){
                populateFromActivityLog(emptyQueue);
            } else {
                emptyQueue();
            }
        });


        // Empty the queue when everything is finished being initialized.
        emptyQueue = function(){
            if( overflowQueue.length === 0 ){
                console.log('overflowQueue is 0, removing lock.');
                setTimeout(function(){
                    CROWDLOGGER.messages.trigger('search-model-initialized');
                }, TIMEOUT );
                initializationLock = false;
            } else {
                var event = overflowQueue.shift();
                //console.log(event[1]);
                //console.log(event[2]);
                //event[1].overrideLock = true;
                event[0]({overrideLock:true}, event[2], emptyQueue);
            }
        };
    };

    /**
     * UPDATE
     * Adds listeners for each of the events of interest.
     */
    addListeners = function(){
        CROWDLOGGER.messages.bind(
            //'query-entered', processSearch);
            'query-entered', queueQuery);

        CROWDLOGGER.messages.bind(
            'page-loaded', processPageLoad);
        
        CROWDLOGGER.messages.bind(
            'link-clicked', processClick);
        
        CROWDLOGGER.messages.bind(
            'page-focused', processPageFocus);
        
    };

    /**
     * UPDATE
     * Loads the stored searches and tasks. This populates the tasks and searches
     * members of this.
     *
     * @param {function} callback  A function to be called once all of the data has
     *      been read in.
     */
    loadSearchesAndTasks = function(callback){
        console.log('In loadSearchesAndTasks');

        // CROWDLOGGER.io.log.readSearchLog(function(searchEntries){
        //     console.log('In loadSearchesAndTasks; '+
        //         'heard back from readSearchLog; searchEntries: '+
        //         JSON.stringify(searchEntries) );

        //     parseSearches(searchEntries, function(){
        //         console.log('In loadSearchesAndTasks; '+
        //             'heard back from parseSearches');
        //         CROWDLOGGER.io.log.readTaskLog(function(taskEntries){
        //             console.log('In loadSearchesAndTasks; '+
        //                 'heard back from readSearchLog');
        //             parseTasks(taskEntries, callback);
        //         });
        //     });
        // });
    };

    /**
     * Deserializes the list of JSON search entries. 
     *
     * @param {array of objects} searchEntires  A list of serialized search 
     *                                          entries.
     */
    parseSearches = function(searchEntries){
        while( searchEntries.length > 0 ) {
            var entry = searchEntries.shift();

            if( entry.id !== null ) {
                var search = new sta.Search(entry.data, true);
                maxSearchId = entry.id > maxSearchId ? entry.id : maxSearchId;
                chronologicallyOrderedSearchIds.unshift(entry.id);
                searches[entry.id] = search;
            }
        }
    };

    /**
     * Deserializes the list of JSON task entries. 
     *
     * @param {array of objects} taskEntires  A list of serialized task entries.
     */
    this.parseTasks = function(taskEntries){
        while( taskEntries.length > 0 ) {
            var entry = taskEntries.shift();        

            if( entry.id !== null ) {
                var task = new sta.Task(entry.data, true);
                maxTaskId = 
                    entry.id > maxTaskId ? entry.id :
                    maxTaskId;
                tasks[entry.id] = task;
            }
        }
    };

    /**
     * UPDATE
     * Reads and processes the activity log.
     * 
     * @param {function} callback The function to call when the log is finished 
     *      being read in.
     */
    populateFromActivityLog = function(callback){
        var entries = [], processing = false, processEntries;

        console.log('In populateFromActivityLog');

        // Read in the activity log and pass each event to the corresponding 
        // processor.
        CROWDLOGGER.io.log.readActivityLog( function(e){ 
            entries = e; //entries.concat(e); 
            //if( !processing ){
            //    processing = true;
                processEntries();
            //}
        }, {asArray: true});

        processEntries = function(){
            // console.log('In processEntries; entries: ');
            // console.log(entries);

            if( entries.length === 0 && callback !== undefined ) {
                console.log('Finished processing from log!');
                setTimeout(callback, this.TIMEOUT);
            } else if(entries.length > 0 ) {
                var entry = entries.shift().data.split(/\t/);
                // console.log('Processing entry: '+ JSON.stringify(entry));

                // Click.
                if( entry[0] === 'Click' ){
                    this.processClick(
                        {overrideLock: true},
                        CROWDLOGGER.logging.parseClick(entry, true),
                        processEntries
                    );
                // Page load.
                } else if( entry[0] === 'Load') {
                    this.processPageLoad(
                        {overrideLock: true},
                        CROWDLOGGER.logging.parsePageLoaded(entry, true),
                        processEntries
                    );
                // Focus.
                } else if( entry[0] === 'Focus' ){
                    this.processPageFocus(
                        {overrideLock: true},
                        CROWDLOGGER.logging.parsePageFocused(entry, true),
                        processEntries
                    );
                // Search (well, query...).
                } else if( entry[0] === 'Search' ){

                    this.queueQuery(
                        {overrideLock: true},
                        CROWDLOGGER.logging.parseSearch(entry, true),
                        processEntries
                    );
                    //entries = [];
                // Any other events (tabs added, removed, etc.).
                } else {
                    processEntries();
                }
            }
        };
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
        if(this.initializationLock && 
                e.overrideLock !== true ){
            this.overflowQueue.push([f,e,d,callback]);
            return true;
        }
        return false;
    };

    /**
     * Creates a new search from the given data with a unique id and updates the
     * necessary structures: chronologicallyOrderedSearchIds (assumes the
     * new searches are given in chronological order) and searches. A 'new-search'
     * event will be triggered on the CROWDLOGGER.messages element. The created  
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
        this.maxSearchId++;
        data.id = this.maxSearchId;

        // Create the search.
        search = new sta.Search(data, false);
        
        // Update the necessary structures.
        this.chronologicallyOrderedSearchIds.
            unshift(search.getId());
        this.updateMostRencentlyAccessedSearchIds(
            search.getId());
        this.searches[search.getId()] = search;

        // Trigger the 'new-search' event.
        if( !this.initializationLock ){
            setTimeout(function(){
                CROWDLOGGER.messages.trigger('new-search', {searchId: data.id});
            }, this.TIMEOUT );
        }

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

            var id, toTrigger = [];

            // This is a new task.
            if( relatedTasks.length === 0 ){
                // Get a new id.
                maxTaskId++;
                id = maxTaskId;

                // Create the new task.
                var task = new sta.Task({
                    timestamp: search.timestamp,
                    id: id,
                    searchIds: [search.getId()],
                    displayName: search.getText().toLowerCase()
                }, true);

                // Update the task map.
                tasks[id] = task;

                // Add a trigger for an 'updated-task' event.
                toTrigger.push(['new-task', {taskId: id}]);

            // There are existing tasks that need to be updated.
            } else {
                // console.log('Task ids: '+ JSON.stringify(relatedTasks));

                // Add the search to the first task.
                id = parseInt(relatedTasks.shift()); //.getId();
                var task = tasks[id], deletedTask;

                // console.log('Identified task; id: '+ id +'; task: '+task);


                task.addSearchIds([search.getId()]);

                // Merge all of the other tasks in with the first one.
                if( relatedTasks.length > 0 ){
                    task.mergeWith(relatedTasks);
                }

                // Send out 'task deleted' messages.
                while( relatedTasks.length > 0 ){
                    deletedTask = relatedTasks.shift();
                    toTrigger.push(['deleted-task', {
                        taskId: deletedTask,
                        mergedWith: id
                    }]);
                }

                // Add trigger for an 'updated-task' event.
                toTrigger.push(['updated-task',{taskId: id}]);
            }

            // Update the search.
            // search.setTaskId(id);

            // Invoke the callback with the task id if it exists.
            if( callback ) {
                setTimeout( function(){ callback(id); }, TIMEOUT );
            }

            // Trigger whatever event is required.
            if( !initializationLock ){
                for( i = 0; i < toTrigger.length; i++ ){
                    var event = toTrigger[i][0];
                    var data = toTrigger[i][1];
                    setTimeout( function(){
                        CROWDLOGGER.messages.trigger(event, data);
                    }, TIMEOUT ); 
                }
            }
        };

        // Identify the related tasks.
        setTimeout( function(){
            sti.identifyTask(
                search, 
                tasks, 
                searches,
                onIdentification )
        }, TIMEOUT ); 
    };

    /**
     * Processes a click event.
     */
    this.processClick = function(event, data, callback){
        if(queueEventIfNeeded(processClick, event, data, callback)){ return; }

        if(prevQuery!==undefined){
            flushQueuedQueries(function(){
                processClick(event, data, callback);
            });
            return;
        }

        var srcUrl = data.isSerp ?
            CROWDLOGGER.util.truncateUrl(data.sourceUrl) + data.query :
            data.sourceUrl;
        //var srcUrl = CROWDLOGGER.util.truncateUrl(data.sourceUrl);

        console.log('In proc. click; srcUrl: '+ srcUrl );
        var search = pageLookup[srcUrl];
        if( search !== undefined ){
            console.log('In proc. click; targetUrl: '+ data.targetUrl );
            
            pageLookup[data.targetUrl] = search;
            clicks[
                sta.util.truncateUrl(data.targetUrl)] = search
            mostRecentClick = search;

            search.addPages([{
                isSerpClick: data.isSerp,
                url: data.targetUrl
            }]);

            // Trigger an event indicating a new page has been added.
            if( !initializationLock ){
                setTimeout(function(){
                    CROWDLOGGER.messages.trigger('new-page', {
                        pageUrl: data.targetUrl,
                        searchId: search.getId()
                    });
                }, TIMEOUT);
            }
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
        // if(this.queueEventIfNeeded(
        //     this.processSearch, event, data, callback)){
        //     return;
        // }

        // TODO: add a search black list (should include G+ searches, too).
        if( data.query === "Search" && data.url.match(/news.yahoo.com/) !== null ){
            if(callback){ setTimeout(callback, TIMEOUT) };
            return;
        }

        // console.log('processSearch data:');
        // console.log(data);

        // Create a new search object with an id.
        var search = createNewSearch({
            timestamp: data.time,
            url: data.url,
            isQuery: true,
            se: data.searchEngine,
            text: data.query
        });

        var url = CROWDLOGGER.util.truncateUrl(data.url);
        this.pageLookup[url+data.query] = search;
        this.pageLookup[data.url] = search;
        console.log('In proc. search; url: '+ url+data.query );

        // Classify the search and update the tasks.
        this.identifyTask(search, callback);
    };

    queueQuery = function(event, data, callback){
        if(queueEventIfNeeded(
            queueQuery, event, data, callback)){
            return;
        }

        if( flushPrevQueryTimeout !== undefined ){
            clearTimeout( flushPrevQueryTimeout );
            flushPrevQueryTimeout = undefined;
        }

        if( prevQuery !== undefined &&
            ( prevQuery.query !== data.query.slice(0, 
                    prevQuery.query.length) ||
                    prevQuery.time - data.time > 
                    MIN_QUERY_DIFF)){
                var prevQuery = prevQuery;
                prevQuery = data;
                processSearch(event,prevQuery,callback);
            
        } else {
            prevQuery = data;
            if( callback ){
                setTimeout(callback, TIMEOUT);
            }
        }

        setTimeout( this.flushQueuedQueries, 
            this.QUERY_FLUSH_TIMEOUT );
    };

    flushQueuedQueries = function(callback){
        if(prevQuery !== undefined){
            var prevQuery = prevQuery;
            prevQuery = undefined;
            processSearch(
                {overrideLock:true}, prevQuery, callback);

        } else if( callback ) {
            //setTimeout(callback, TIMEOUT);
            callback();
        }
    };

    processPageLoad = function(event, data, callback){
        console.log('In load, fyi. data: '+ JSON.stringify(data));

        if(queueEventIfNeeded(
            processPageLoad, event, data, callback)){
            return;
        }
        if(prevQuery!==undefined){
            flushQueuedQueries(function(){
                processPageLoad(event, data, callback);
            });
            return;
        }

        // // TODO: Add a load blacklist.
        // if( data.url.match(/www.google.com\/url/) !== null ){
        //     if(callback){ setTimeout(callback, TIMEOUT) };
        //     return;
        // }

        if( isUrlBlacklisted(data.url) ){
            console.log('On blacklist :(');
            if(callback){ 
                setTimeout(callback, TIMEOUT); 
            };
            return;
        }
        console.log('In proc. page load; url: '+ data.url);

        var fullUrl = data.url; //CROWDLOGGER.util.truncateUrl(data.url);
        var truncatedUrl = CROWDLOGGER.util.truncateUrl(data.url);
        var search;

        //if( clicks[truncatedUrl] !== undefined ){
        if( mostRecentClick !== undefined ){
            console.log('Found in clicks: '+ truncatedUrl);
            // search = clicks[truncatedUrl];
            // delete clicks[truncatedUrl];
            search = mostRecentClick;
            mostRecentClick = undefined;
            pageLookup[fullUrl] = search;
        } else {
            search = pageLookup[fullUrl];
        }

        if( search === undefined || 
                !CROWDLOGGER.util.areSameDay(search.getTimestamp(), data.time) ){
            console.log('Search is undefined');

            console.log('Not on blacklist!');

            var text = data.title;
             // === "" ? 
             //    data.url.replace(/(^https{0,1}:\/\/(www\.){0,1})/g, "").
             //        replace(/[\W_]+/g, " ") : data.title;

            // Create a new search object with an id.
            var search = createNewSearch({
                timestamp: data.time,
                url: data.url,
                isQuery: false,
                se: "",
                text: text
            });

            pageLookup[data.url] = search;

            search.addPages([{
                isSerpClick: false,
                url: data.url,
                initialAccess: data.time,
                title: data.title,
                favicon: data.faviconUrl
            }]);

            // Send out a 'page updated' event.
            if( !initializationLock ){
                setTimeout(function(){
                    CROWDLOGGER.messages.trigger('new-page', {
                        pageUrl: data.url,
                        searchId: search.getId()
                    });
                }, TIMEOUT);
            }

            // Classify the search and update the tasks.
            identifyTask(search, callback);
        } else {
            console.log('Search IS defined: '+ search.getId() +' : '+
                search.getText());

            var page = search.getPage(data.url);
            console.log(page);
            if( page === undefined || page.initialAccess > -1 ){
                console.log('Adding page');
                search.addPages([{
                    isSerpClick: false,
                    url: data.url,
                    initialAccess: data.time,
                    title: data.title,
                    favicon: data.faviconUrl
                }]);
                if( !initializationLock ){
                    setTimeout(function(){
                        CROWDLOGGER.messages.trigger('new-page', {
                            pageUrl: data.url,
                            searchId: search.getId()
                        });
                    }, TIMEOUT);
                }
            } else {
                console.log('Updating page');
                search.updatePage(data.url, {
                    initialAccess: data.time,
                    title: data.title,
                    favicon: data.faviconUrl
                });
                // Send out a 'page updated' event.
                if( !initializationLock ){
                    setTimeout(function(){
                        CROWDLOGGER.messages.trigger('updated-page', {
                            pageUrl: data.url,
                            searchId: search.getId(),
                            taskId: search.getTaskId(),
                            updated: ['initialAccess', 'title', 'favicon']
                        });
                    }, TIMEOUT );
                }
            }

            // Updated the list of recently accessed searches.
            updateMostRencentlyAccessedSearchIds(
                search.getId());

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

    processPageFocus = function(event, data, callback){
        if(queueEventIfNeeded(
            processPageFocus, event, data, callback)){
            return;
        }

        if(prevQuery!==undefined){
            flushQueuedQueries(function(){
                processPageFocus(event, data, callback);
            });
            return;
        }

        console.log('In page focus for '+ data.url);

        if( focusedPage !== undefined ){
            var focusedPage = focusedPage;
            var page = focusedPage.search.getPage(focusedPage.url);
            if( page !== undefined ){
                focusedPage.search.updatePage(focusedPage.url, {
                    dwellTime: page.dwellTime + 
                        (data.time - focusedPage.startFocus)
                });

                // Send out a 'page updated' event.
                if( !initializationLock ){
                    setTimeout(function(){
                        CROWDLOGGER.messages.trigger('updated-page', {
                            pageUrl: data.url,
                            searchId: search.getId(),
                            updated: ['dwellTime']
                        });
                    }, TIMEOUT);
                }
            }
        }

        var search = pageLookup[data.url];
        console.log('Is this part of an existing search?')
        if( search !== undefined ){
            console.log('yes!');
            focusedPage = {
                url: data.url,
                search: search,
                startFocus: data.time
            };
            // Updated the list of recently accessed searches.
            updateMostRencentlyAccessedSearchIds(
                search.getId());

            if( !initializationLock ){
                setTimeout(function(){
                    CROWDLOGGER.messages.trigger('updated-page', {
                        pageUrl: data.url,
                        searchId: search.getId()
                    });
                }, TIMEOUT);
            }
        } else {
            console.log('no :(');
            focusedPage = undefined;
        }

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
        var oldIndex = mostRecentlyAccessedSearchIds.
            indexOf(searchId);
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

    // Public function definitions.

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
        n = n === undefined ? 10 : n;
        return mostRecentlyAccessedSearchIds.slice(0,n);
    };
}