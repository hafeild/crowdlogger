/**
 * @fileOverview The search task assistant (STA) controller. 
 * Listens for browsing events from CrowdLogger and updates the STA box's 
 * view and model. 
 *
 * <p><i>
 * Copyright (c) 2010-2013      <br>
 * University of Massachusetts  <br>
 * All Rights Reserved
 * </i></p>
 * 
 * @author hfeild
 */


/**
 * The controller. Use as follows:
 *
 *      var myController = new Controller(mySta, myView);
 *
 * @param {obj} sta    a pointer to the Search Task Assistant backend.
 * @param {obj} view     The view to use.
 */
var Controller = function(sta, view){
    'use strict';

    // Private variables.
    var EVENT = 0,
        FUNC = 1,
        winId = -1,
        history = [],
        curUrl = '',
        that = this,
        queryId = 0,
        messagesListeners = [],
        doc = jQuery(document),
        model = sta.searchTaskModel;

    // Private function declarations.
    var initializeHistory, handleNewSearch, updateCurrentTasks, 
        updateRelatedQueriesAndTasks, updateRelatedSearches,
        updateRelatedTasks, handleNewTask, handleDeletedTask,
        handleDeletedSearch,
        handleUpdatedTask, handleNewPage, handleUpdatedPage,
        processView, processQueryHistory, processTaskHistory,
        deleteTask, deleteSearch, queryHistory, mergeSearchAndTask, mergeTasks,
        onClose, addListeners, addMessageListener, removeListeners, 
        showDetails, initStorage, createTask; 

    // Public variables.
    this.MIN_SIM_SCORE = 0.4;
    this.T = 2;

    // Public function declarations.
    this.init; this.destroy;

    // Private function definitions.

    initializeHistory = function(event, data){
        view.hideInitializationLoader();
        setTimeout(processQueryHistory, that.T);
        setTimeout(processTaskHistory, that.T);
        setTimeout(updateCurrentTasks, that.T);
        // var w = window.open();
        // w.document.write(JSON.stringify({
        //     searches:   model.searches,
        //     chronologicallyOrderedSearchIds: model.chronologicallyOrderedSearchIds,
        //     tasks:      model.tasks,
        // }));
    };

    handleNewSearch = function(event, data){
        sta.log('New search! '+ JSON.stringify(data));

        //'new-search', {searchId: data.id}
        view.processing();

        updateRelatedQueriesAndTasks(model.searches[data.searchId]);
        //updateCurrentTasks();

        view.addSearches([data.searchId], {
            searchHistory: true, 
            format: "abbreviated",
            prepend: true
        });
    };

    handleDeletedSearch = function(event, data){
        view.removeSearch(data.searchId);
    };


    updateCurrentTasks = function(){
        var tasks = [],
            taskLookup = {},
            searches = model.getCurrentSearches(10),
            i, taskId;

        for( i = 0; i < searches.length; i++ ){
            taskId = model.searches[searches[i]].getTaskId();

            if( !taskLookup[taskId] ){
                tasks.push(taskId);
                taskLookup[taskId] = true;
            }
        }

        // sta.log('Adding the following tasks and searches:');
        // sta.log(tasks);
        // sta.log(searches);

        view.addTasks(tasks, {
            currentTasks: true, 
            format: 'abbreviated',
            searchWhitelist: sta.util.arrayToObject(searches)
        });
    };

    updateRelatedQueriesAndTasks = function(currentSearch){
        model.sti.rankSearchesBySameTaskness(currentSearch, model.searches, 
            function(relatedSearches){
                sta.log(relatedSearches);
                updateRelatedSearches(relatedSearches, function(){
                    model.sti.rankTasksBySameTaskness( currentSearch, 
                        relatedSearches, model.tasks, 
                            updateRelatedTasks );
                });
            });
    };

    updateRelatedSearches = function(relatedSearches, callback){
        var searchesToShow = [];

        jQuery.each(relatedSearches.slice(-10,-1).reverse(), function(i,elm){
            searchesToShow.push(elm[0]);
        });

        view.addSearches(
           searchesToShow,
            {relatedSearches:true, format:"full", prepend: false});


        if(callback){
            setTimeout(callback, that.T);
        }
    };

    updateRelatedTasks = function(relatedTasks, callback){
        var tasksToShow = [];

        jQuery.each(relatedTasks.slice(-10,-1).reverse(), function(i,elm){
            tasksToShow.push(elm[0]);
        });



        view.addTasks(
           tasksToShow,
            {relatedTasks:true, format:"full"});
        if(callback){
            setTimeout(callback, that.T);
        }
    };

    handleNewTask = function(event, data){
        sta.log('New task! '+ JSON.stringify(data));
        updateCurrentTasks();
        view.addTasks([data.taskId], {
            taskHistory: true, 
            format: "abbreviated",
            prepend: true
        });
    };

    handleDeletedTask = function(event, data){
        // sta.messages.trigger('deleted-task', {
        //                 taskId: deletedTask,
        //                 mergedWith: id
        //             });
        sta.log('Deleted task! '+ JSON.stringify(data));
        if( data.mergedWith ){
            view.updateTask(data.taskId, data);
        } else {
            view.removeTask(data.taskId, data);
        }
    };

    handleUpdatedTask = function(event, data){
        // sta.messages.trigger('updated-task', {
        //             taskId: id
        //         });
        sta.log('Updated task! '+ JSON.stringify(data));

        view.updateTask(data.taskId, data);
        updateCurrentTasks();
    };

    handleNewPage = function(event, data){
        // sta.messages.trigger('new-page', {
        //     pageUrl: data.targetUrl,
        //     searchId: search.getId()
        // });
        sta.log('New page! '+ JSON.stringify(data));
        view.updateTask(data.taskId, data);
        updateCurrentTasks();
    };

    handleUpdatedPage = function(event, data){
        // sta.messages.trigger('updated-page', {
        //         pageUrl: data.url,
        //         searchId: search.getId(),
        //         updated: ['initialAccess', 'title', 'favicon', 'dwellTime']
        //     });
        sta.log('Updated page! '+ JSON.stringify(data));
        view.updateTask(data.taskId, data);
        updateCurrentTasks();
    };

    processView = function(event, view){
        view.addSearch(view);
    };

    processQueryHistory = function(){
        view.addSearches(
            model.chronologicallyOrderedSearchIds,
            {searchHistory:true, format:"abbreviated", prepend: false});
    };

    processTaskHistory = function(){
        var tasks = [],
            usedTasks = {};
        jQuery.each(model.chronologicallyOrderedSearchIds,
            function(i,searchId){
                var taskId = model.searches[searchId].getTaskId();
                if( usedTasks[taskId] === undefined ){
                    tasks.push(taskId);
                    usedTasks[taskId] = true;
                }
            });
        view.addTasks(tasks, {taskHistory:true, format:"abbreviated"});
    };

    deleteTask = function(event, data){
        model.tasks[data.taskId].delete();
        // sta.messages.trigger('deleted-task', {taskId: data.taskId});
    };

    createTask = function(event, data){
        var search = model.searches[data.searchId];

        // Remove the search from its current task.
        model.tasks[search.getTaskId()].removeSearch(data.searchId);

        // Create the new task.        
        model.maxTaskId++;
        new sta.Task({
            startTimestamp: search.getTimestamp(),
            endTimestamp: search.getTimestamp(),
            id: model.maxTaskId,
            searchIds: [search.getId()],
            displayName: search.getText().toLowerCase()
        }, sta, true);
    };

    deleteSearch = function(event, data){
        model.searches[data.searchId].delete();
        // sta.messages.trigger('deleted-task', {taskId: data.taskId});
    };

    queryHistory = function(event, data){
        var pattern = new RegExp(data.query, 'i'),
            matchedSearches = [],
            matchedTasks = [],
            matchedSearchLookup = {},
            seenTaskLookup = {};

        view.processing({queryHistory: true});

        jQuery.each(model.chronologicallyOrderedSearchIds, 
            function(i,searchId){
                var search = model.searches[searchId],
                    task = model.tasks[search.getTaskId()],
                    matches;
                if( seenTaskLookup[task.getId()] === undefined ){
                    matches = task.matches(pattern);

                    if( matches.taskMatches ){
                        matchedTasks.push(task);
                    }

                    if( matches.searchMatches.length > 0 ){
                        //sta.log(matches.searchMatches);

                        jQuery.each(matches.searchMatches, function(i,sId){
                            matchedSearchLookup[sId] = true;
                        });
                    }
                }

                if( matchedSearchLookup[searchId] ){
                    matchedSearches.push(search);
                }
                seenTaskLookup[task.getId()] = true;
            }
        );

        view.addSearches(
           matchedSearches,
           {matchedSearches:true, format:"full", prepend: false,
           detailsAvailable:true});

        view.addTasks(
            matchedTasks,
            {matchedTasks: true, format:"full", prepend: false});

    };

    mergeSearchAndTask = function(event, data){
        var srcTask= model.tasks[model.searches[data.searchId].getTaskId()],
            targetTask = model.tasks[data.taskId];

        srcTask.removeSearch(data.searchId);

        targetTask.addSearchIds([data.searchId]);

        if(srcTask.getSearchIds().length === 0){
            srcTask.delete();
            // sta.messages.trigger('deleted-task', {
            //     taskId: srcTask.getId(), 
            //     mergedWith: targetTask.getId()
            // });
        } //else {
            // sta.messages.trigger('updated-task', 
            //     {taskId: srcTask.getId()});
        // }
        // sta.messages.trigger('updated-task', {
        //     taskId: targetTask.getId() });
    };

    mergeTasks = function(event, data){
        console.log('Merging; data:');
        console.log(data);

        var task1 = model.tasks[data.task1Id];
        task1.mergeWith([data.task2Id]);

        sta.messages.trigger('deleted-task', {
            taskId: data.task2Id,
            mergedWith: data.task1Id
        });

        sta.messages.trigger('updated-task', {
            taskId: data.task1Id
        });
    };

    /**
     * Called whenever a window closes. Checks if the closed window is the
     * STA window; if so, cleans things up -- removes unneeded listeners and
     * saves any necessary data.
    *
     * @param {int} id  The window id that was closed.
     */
    onClose = function(id){
        if( id === winId ){
            removeListeners();
        }
    };

    /**
     * Adds listeners, e.g., for when the window changes, is resized, when
     * new data is made available, etc.
     */
    addListeners = function(){
        // Set the cleanup listener -- this will ensure that the listeners
        // we attach on resources external to this window are removed and
        // the user's most recent data is saved.
        // chrome.windows.getCurrent({}, function(win){
        //     winId = win.id;
        //     chrome.windows.onRemoved.addListener(onClose);
        // });
        window.addEventListener('unload', removeListeners, false);

        // Listens for new queries.
        //sta.messages.bind('query-entered', processQuery);
        addMessageListener('new-search', handleNewSearch);
        addMessageListener('deleted-search', handleDeletedSearch);
        addMessageListener('new-task', handleNewTask);
        addMessageListener('deleted-task', handleDeletedTask);
        addMessageListener('updated-task', handleUpdatedTask);
        addMessageListener('new-page', handleNewPage);
        addMessageListener('updated-page', handleUpdatedPage);

        doc.delegate(document, 'details-requested', showDetails);
        doc.delegate(document, 'delete-task', deleteTask);
        doc.delegate(document, 'delete-search', deleteSearch);
        doc.delegate(document, 'query-history', queryHistory);
        doc.delegate(document, 'merge-search-and-task', mergeSearchAndTask);
        doc.delegate(document, 'merge-tasks', mergeTasks);
        doc.delegate(document, 'create-new-task', createTask);
    };

    addMessageListener = function(event, func){
        messagesListeners.push([event, func]);
        sta.messages.bind(event, func);
    };

    /**
     * Removes listeners.
     */
    removeListeners = function(){
        //chrome.windows.onRemoved.removeListener(onClose);
        //sta.messages.unbind('query-entered', processQuery);
        jQuery.each(messagesListeners, function(i,listener){
            sta.messages.unbind(listener[EVENT], listener[FUNC]);
        });
        messagesListeners = [];
    };

    showDetails = function(event, data){
        view.showDetails(data);
    };


    // Public definitions.
    
    /**
     * Initializes the data and sets the necessary listeners.
     */
    this.init = function(){
        winId = sta.windowId;
        view.init(winId);

        if( model.hasInitializationLock() ){
            addMessageListener('search-model-initialized', function(){
                addListeners();
                initializeHistory();
            });
        } else {
            initializeHistory();
            addListeners();
        }

        //queryId = model.queries.length;
    };

    this.destroy = function(){
        // Save state.

        // Remove listeners.
        removeListeners();
    };
 };