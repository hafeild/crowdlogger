
/**
 * Encapsulates a search event. This is mainly a wrapper around a basic object,
 * providing update functions that will mark the data as inconsistent with the
 * DB. Recognized fields and their defaults:
 * <ul>
 *    <li>timestamp: -1
 *    <li>id: -1
 *    <li>taskId: -1
 *    <li>pages: []
 *    <li>url: ""
 *    <li>text: ""
 *    <li>isQuery: false  (as opposed to a direct url access)
 *    <li>se: ""
 * </ul>
 *
 *
 * @param {object} initialData  An object that can include the initial data.
 *    Missing fields will be populated with defaults.
 * @param {SearchTaskAssistant} sta A reference to the Search Task Assistant.
 * @param {boolean} isNew Whether this is a brand new, never been saved before
 *    instance.
 */
RemoteModule.prototype.SearchTaskAssistant.prototype.Search = 
        function(initialData, sta, isNew){
    'use strict';

    initialData = initialData || {};
    var data = {
            timestamp: -1,
            id: -1,
            taskId: -1,
            pages: [],
            url: '',
            text: '',
            isQuery: false,
            se: '',
            lastAccess: -1
        },
        pageLookup = {},
        i,
        that = this,
        model = sta.searchTaskModel,
        isDeleted = false,
        init, update;

    sta.log('[search.js] model:');
    sta.log(model);
    sta.log('[search.js] model.storage:');
    sta.log(model.storage);

    this.isNew = isNew;

    init = function(){
        var key;
        for( key in data ){
            data[key] = (initialData[key] === undefined ? 
                data[key] : initialData[key]);
        }

        // Make the lookup for the pages.
        for( i = 0; i < data.pages.length; i++ ){
            pageLookup[data.pages[i].url] = data.pages[i];
        }

        if( data.timestamp > -1 && data.lastAccess < 0 ){
            that.setLastAccess(data.timestamp);
        }

        model.searches[data.id] = that;
        model.sta.util.orderedInsert(
            model.chronologicallyOrderedSearchIds, data.id, 
            model.chronologicalSearchComp
        );

        if( isNew ){
            sta.messages.trigger('new-search', {searchId: data.id});
            update();
        }
    };   

    update = function(){
        model.storage.searchUpdated(that);
    };
    
    this.setTaskId = function(taskId){
        data.taskId = taskId;
        update();
    };

    this.getTaskId = function(){
        return data.taskId;
    };

    this.setLastAccess = function(timestamp){
        data.lastAccess = timestamp;
        update();
    };

    this.getLastAccess = function(){
        return data.lastAccess;
    };

    this.getId = function(){
        return data.id;
    };

    this.getPages = function(){
        return data.pages;
    };

    this.getText = function(){
        return data.text || data.url;
    };

    this.updateTextIfNecessary = function(text){
        if( !data.text ){
            data.text = text;
            model.tasks[data.taskId].updateTextIfNecessary(text, data.url);
            update();
        }
    }

    this.getUrl = function(){
        return data.url;
    };

    this.getSe = function(){
        return data.se;
    };

    this.isQuery = function(){
        return data.isQuery;
    };

    this.getTimestamp = function(){
        return data.timestamp;
    };

    this.addPages = function(pages){
        for( i = 0; i < pages.length; i++ ){
            var page = sta.makePage(pages[i]);
            data.pages.push(page);
            pageLookup[page.url] = page;
            if( page.lastAccess > data.lastAccess ){
                that.setLastAccess(page.lastAccess);
            }
            sta.messages.trigger('new-page', {
                pageUrl: page.url,
                searchId: data.id
            });
        }
        update();
    };

    this.getPage = function(url){
        return pageLookup[url];
    };

    this.updatePage = function(url, updates){
        var page = pageLookup[url], key, updated = [];
        if( page ){
            for( key in page ){
                if( key !== 'url' && updates[key] !== undefined ){
                    page[key] = updates[key];
                    updated.push(key);
                }
            }
            if( page.lastAccess > data.lastAccess ){
                that.setLastAccess(page.lastAccess);
            }

            if( updated.length > 0 ){
                update();
                sta.messages.trigger('updated-page', {
                    pageUrl: page.url,
                    searchId: data.id,
                    taskId: data.taskId,
                    updated: updated
                });
            }
        }

    };

    this.getData = function(){
        return data;
    };

    this.toString = function(){
        return JSON.stringify(data);
    };

    this.matches = function(pattern){
        var matchSummary = {
                searchMatches: false,
                pageMatches: []
            }, i, page;

        if( pattern.test(data.text) || pattern.test(data.url) ){
            matchSummary.searchMatches = true;
        }

        for(i = 0; i < data.pages; i++){
            page = data.pages[i];
            if(pattern.test(page.url) || pattern.test(page.title) ){
                matchSummary.searchMatches = true;
                matchSummary.pageMatches.push(page);
            }
        }

        return matchSummary;
    };

    this.isDeleted = function(){
        return isDeleted;
    };

    this.delete = function(taskRemoved){
        isDeleted = true;
        if( !taskRemoved ){
            model.tasks[data.taskId].removeSearch(data.id);
        }
        data = {id: data.id}
        delete model.searches[data.id];
        model.chronologicallyOrderedSearchIds.splice(
            model.chronologicallyOrderedSearchIds.indexOf(data.id),1);
        sta.messages.trigger('deleted-search', {searchId: data.id});
        update();
    };

    init();
};
