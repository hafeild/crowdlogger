
/**
 * Encapsulates a task. This is mainly a wrapper around a basic object,
 * providing update functions that will mark the data as inconsistent with the
 * DB. Recognized fields and their defaults:
 * <ul>
 *    <li>timestamp: -1
 *    <li>id: -1
 *    <li>searchIds: []
 *    <li>displayName: ""
 * </ul>
 *
 * @param {object} initialData  An object that can include the initial data.
 *    Missing fields will be populated with defaults.
 * @param {SearchTaskAssistant} sta A reference to the Search Task Assistant.
 * @param {boolean} isNew Whether this is a brand new, never been saved before
 *    instance.
 */
RemoteModule.prototype.SearchTaskAssistant.prototype.Task = 
        function(initialData, sta, isNew){
    'use strict';

    var isDeleted = false, 
        that = this,
        data = {
            startTimestamp: -1,
            endTimestamp: -1,
            id: -1,
            searchIds: [],
            displayName: ''
        },
        model = sta.searchTaskModel,
        init, update;

    this.isNew = isNew;

    init = function(){
        var key, i;
        // Fill in the defaults for missing values. Ignore unrecognized fields
        // (i.e., those not in data above).
        for( key in data ){
            data[key] = initialData[key] === undefined ? 
                data[key] : initialData[key];
        }

        // Add this task to the model's task list.
        model.tasks[data.id] = that;

        for(i = 0; i < data.searchIds.length; i++){
            model.searches[data.searchIds[i]].setTaskId(data.id);
        }

        if(isNew){
            sta.messages.trigger('new-task', {taskId: data.id});
            update();
        }
    };

    update = function(){
        model.storage.taskUpdated(that);
        if(!isDeleted){
            sta.messages.trigger('updated-task', {taskId: data.id});
        }
    };

    this.getSearchIds = function(){
        return data.searchIds;
    };

    this.getId = function(){
        return data.id;
    };    

    this.removeSearch = function(id){
        data.searchIds.splice(data.searchIds.indexOf(id), 1);
        update();
    };

    this.getTimestamps = function(){
        return [data.startTimestamp, data.endTimestamp];
    };

    this.addSearchIds = function(ids){
        var i, j, search, lengthBefore;
        for( i = 0; i < ids.length; i++ ){
            // This figures out where in the searchIds array to insert the
            // new search. This assumes ids themselves reflect the desired
            // order. Currently, that means chronologically.
            j = sta.util.binarySearch(data.searchIds, ids[i],
                sta.util.intCompare, true);
            // sta.log( 'Searching ids in task '+ data.id +' for search '+
            //     ids[i] +'; returned: index '+ j +' (id there: '+ 
            //         data.searchIds[j]+')');
            //sta.log( 'length before: '+ data.searchIds.length);
            lengthBefore = data.searchIds.length;
            if( data.searchIds[j] !== ids[i] ){
                data.searchIds.splice(j, 0, ids[i]);

                search = model.searches[ids[i]];
                search.setTaskId(data.id);

                // CROWDLOGGER.debug.log('Adding searches; current search id: '+
                //     ids[i] +'; search: '+ search );

                //data.searchIds.concat(ids);

                // Update the time stamps.
                data.endTimestamp = 
                    Math.max(data.endTimestamp, search.getTimestamp());
                data.startTimestamp =
                    (data.startTimestamp < 0 || 
                            data.startTimestamp > search.getTimestamp()) ?
                        search.getTimestamp() :
                        data.startTimestamp;
            } 
            // sta.log( 'lengthBefore: '+ lengthBefore +' length after: '+ 
            //     data.searchIds.length);


        }
        update();
    };

    this.getText = function(){
        return data.displayName || model.searches[data.searchIds[0]].getText();
    };

    this.getData = function(){
        return data;
    };

    this.delete = function(info){
        var i;
        isDeleted = true; 
        if(info.mergedWith){
            for(i = 0; i < data.searchIds.length; i++){
                model.searches[data.searchIds[i]].delete();
            }
            sta.messages.trigger('deleted-task', 
                {taskId: data.taskId, mergedWith: info.mergedWIth});
        } else {
            sta.messages.trigger('deleted-task', {taskId: data.taskId});
        }
        data.searchIds = [];
        update();
    };

    this.mergeWith = function(taskIds){
        var id, task;
        while(taskIds.length > 0){
            id = parseInt(taskIds.shift());
            if( id !== data.id ) {
                // CROWDLOGGER.debug.log('Merging tasks '+ data.id +' and '+id);
                task = model.tasks[id];
                //sta.log('merging tasks '+ id +' and '+ data.id);
                that.addSearchIds( task.getSearchIds(), id );
                task.delete({mergedWith: data.id});
            }
        }
    };

    this.setText = function(text){
        data.displayName = text;
        update();
    };

    this.toString = function(){
        return JSON.stringify(data);
    };

    this.matches = function(pattern){
        var matchSummary = {
            taskMatches: false,
            searchMatches: []
        };

        if( pattern.test(data.displayName) ){
            matchSummary.taskMatches = true;
        }

        sta.util.foreach(data.searchIds, function(i, searchId){
            var matches = model.searches[searchId].matches(pattern);
            //sta.log(matches);

            if(matches.searchMatches ){
                matchSummary.searchMatches.push(searchId);
                matchSummary.taskMatches = true;
            }
        });

        return matchSummary;
    };

    this.isDeleted = function(){
        return isDeleted;
    };

    // For debugging purposes...
    this.resortQueries = function(){
        var searchIds = data.searchIds;
        data.searchIds = [];
        that.addSearchIds(searchIds);
    };

    init();
};

