/**
 * @fileOverview The search task assistant (STA) controller. 
 * Listens for browsing events from CrowdLogger and updates the STA box's 
 * view and model. 
 *
 * <p><i>
 * Copyright (c) 2010-2012      <br>
 * University of Massachusetts  <br>
 * All Rights Reserved
 * </i></p>
 * 
 * @author hfeild
 */


/**
 * The controller. Use as follows:
 *
 *      var myController = new Controller(myView, myModel);
 *
 * @param {obj} view     The view to use.
 * @param {obj} model    The model to use. Should have the same functionality
 *      as CROWDLOGGER.searchModel.
 */
Controller = function(view, model){
    // Private variables.
    var EVENT = 0,
        FUNC = 1,
        winId = -1,
        history = [],
        curUrl = '',
        that = this,
        queryId = 0,
        messagesListeners = [],
        doc = jQuery(document);

    // Private function declarations.
    var initializeHistory, handleNewSearch, updateCurrentTasks, 
        updateRelatedQueriesAndTasks, updateRelatedSearches,
        updateRelatedTasks, handleNewTask, handleDeletedTask,
        handleUpdatedTask, handleNewPage, handleUpdatedPage,
        processView, processQueryHistory, processTaskHistory,
        deleteTask, queryHistory, mergeSearchAndTask, mergeTasks,
        onClose, addListeners, addMessageListener, removeListeners, 
        showDetails, 

    // Public variables.
    this.MIN_SIM_SCORE = 0.4;
    this.T = 2;

    // Public function declarations.
    this.init, this.destroy;

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
    }

    handleNewSearch = function(event, data){
        console.log('New search! '+ JSON.stringify(data));

        //'new-search', {searchId: data.id}
        view.processing();

        updateRelatedQueriesAndTasks(model.searches[data.searchId]);
        //updateCurrentTasks();

        view.addSearches([data.searchId], {
            searchHistory: true, 
            format: "abbreviated",
            prepend: true
        });
    }

    updateCurrentTasks = function(){
        var tasks = [],
            taskLookup = {},
            searches = model.getCurrentSearches(10);

        for( i = 0; i < searches.length; i++ ){
            var taskId = 
                model.searches[searches[i]].getTaskId();

            if( taskLookup[taskId] === undefined ){
                tasks.push(taskId);
                taskLookup[taskId] = true;
            }
        }

        // console.log('Adding the following tasks and searches:');
        // console.log(tasks);
        // console.log(searches);

        view.addTasks(tasks, {
            currentTasks: true, 
            format: 'abbreviated',
            searchWhitelist: CROWDLOGGER.util.objectifyArray(searches)
        });
    }

    updateRelatedQueriesAndTasks = function(currentSearch){
        model.sti.rankSearchesBySameTaskness(currentSearch, model.searches, 
            function(relatedSearches){
                console.log(relatedSearches);
                updateRelatedSearches(relatedSearches, function(){
                    model.sti.rankTasksBySameTaskness( currentSearch, 
                        relatedSearches, model.tasks, 
                            updateRelatedTasks )
                });
            });
    }

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
    }

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
    }

    handleNewTask = function(event, data){
        console.log('New task! '+ JSON.stringify(data));
        updateCurrentTasks();
        view.addTasks([data.taskId], {
            taskHistory: true, 
            format: "abbreviated",
            prepend: true
        });
    }

    handleDeletedTask = function(event, data){
        // CROWDLOGGER.messages.trigger('deleted-task', {
        //                 taskId: deletedTask,
        //                 mergedWith: id
        //             });
        console.log('Deleted task! '+ JSON.stringify(data));
        view.updateTask(data.taskId, data);
    }

    handleUpdatedTask = function(event, data){
        // CROWDLOGGER.messages.trigger('updated-task', {
        //             taskId: id
        //         });
        console.log('Updated task! '+ JSON.stringify(data));

        view.updateTask(data.taskId, data);
        updateCurrentTasks();
    }

    handleNewPage = function(event, data){
        // CROWDLOGGER.messages.trigger('new-page', {
        //     pageUrl: data.targetUrl,
        //     searchId: search.getId()
        // });
        console.log('New page! '+ JSON.stringify(data));
        view.updateTask(data.taskId, data);
        updateCurrentTasks();
    }

    handleUpdatedPage = function(event, data){
        // CROWDLOGGER.messages.trigger('updated-page', {
        //         pageUrl: data.url,
        //         searchId: search.getId(),
        //         updated: ['initialAccess', 'title', 'favicon', 'dwellTime']
        //     });
        console.log('Updated page! '+ JSON.stringify(data));
        view.updateTask(data.taskId, data);
        updateCurrentTasks();

    }

    processView = function(event, view){

        view.addSearch(view);
    }

    processQueryHistory = function(){
        view.addSearches(
            model.chronologicallyOrderedSearchIds,
            {searchHistory:true, format:"abbreviated", prepend: false});
    }

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
    }

    deleteTask = function(event, data){
        model.tasks[data.taskId].delete();
        CROWDLOGGER.messages.trigger('deleted-task', {taskId: data.taskId});
    }

    queryHistory = function(event, data){
        var pattern = new RegExp(data.query, 'i');

        var matchedSearches = [],
            matchedTasks = [],
            matchedSearchLookup = {}
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
                        //console.log(matches.searchMatches);

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

    }

    mergeSearchAndTask = function(event, data){
        var srcTask= model.tasks[model.searches[data.searchId].getTaskId()];
        var targetTask = model.tasks[data.taskId];

        srcTask.removeSearch(data.searchId);

        targetTask.addSearchIds([data.searchId]);

        if(srcTask.getSearchIds().length === 0){
            srcTask.delete();
            CROWDLOGGER.messages.trigger('deleted-task', {
                taskId: srcTask.getId(), 
                mergedWith: targetTask.getId()
            });
        } else {
            CROWDLOGGER.messages.trigger('updated-task', 
                {taskId: srcTask.getId()});
        }
        CROWDLOGGER.messages.trigger('updated-task', {
            taskId: targetTask.getId() });
    }

    mergeTasks = function(event, data){
        var task1 = model.tasks[data.task1Id];
        task1.mergeWith([data.task2Id]);

        CROWDLOGGER.messages.trigger('deleted-task', {
            taskId: data.task2Id,
            mergedWith: data.task1Id
        });

        CROWDLOGGER.messages.trigger('updated-task', {
            taskId: data.task1Id
        });
    }

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
    }

    /**
     * Adds listeners, e.g., for when the window changes, is resized, when
     * new data is made available, etc.
     */
    addListeners = function(){
        // Set the cleanup listener -- this will ensure that the listeners
        // we attach on resources external to this window are removed and
        // the user's most recent data is saved.
        chrome.windows.getCurrent({}, function(win){
            winId = win.id;
            chrome.windows.onRemoved.addListener(onClose);
        });

        // Listens for new queries.
        //CROWDLOGGER.messages.bind('query-entered', processQuery);
        addMessageListener('search-model-initialized', initializeHistory);
        addMessageListener('new-search', handleNewSearch);
        addMessageListener('new-task', handleNewTask);
        addMessageListener('deleted-task', handleDeletedTask);
        addMessageListener('updated-task', handleUpdatedTask);
        addMessageListener('new-page', handleNewPage);
        addMessageListener('updated-page', handleUpdatedPage);

        doc.delegate(document, 'details-requested', showDetails);
        doc.delegate(document, 'delete-task', deleteTask);
        doc.delegate(document, 'query-history', queryHistory);
        doc.delegate(document, 'merge-search-and-task', mergeSearchAndTask);
        doc.delegate(document, 'merge-tasks', mergeTasks);
    }

    addMessageListener = function(event, func){
        messagesListeners.push([event, func]);
        CROWDLOGGER.messages.bind(event, func);
    }

    /**
     * Removes listeners.
     */
    removeListeners = function(){
        chrome.windows.onRemoved.removeListener(onClose);
        //CROWDLOGGER.messages.unbind('query-entered', processQuery);
        jQuery.each(messagesListeners, function(i,listener){
            CROWDLOGGER.messages.unbind(listener[EVENT], listener[FUNC]);
        });
        messagesListeners = [];
    }

    showDetails = function(event, data){
        view.showDetails(data);
    }

    // Public definitions.
    
    /**
     * Initializes the data and sets the necessary listeners.
     */
    this.init = function = function(){
        //setTimeout( model.init, 1000 );
        addListeners();

        winId = CROWDLOGGER.searchTaskAssistant.windowId;
        view.init(winId);

        if( !model.hasInitializationLock() ){
            initializeHistory();
        }

        //queryId = model.queries.length;
    };

    this.destroy = function(){
        // Save state.

        // Remove listeners.
        removeListeners();
    };
 }