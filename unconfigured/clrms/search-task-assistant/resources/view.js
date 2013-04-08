/**
 * @fileOverview The default search task assistant (STA) view manipulator. 
 * Provides several functions for displaying searches to the STA and handles
 * things like window location, size, scrolling, etc. 
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
 * Creates a new view object. To use it, do:
 *
 *      var myView = new View(sta, jQuery);
 * 
 * @param {object} sta A reference to the Search Task Assistant backend.
 * @param {object} jq  The jQuery object for the page in which the STA is 
 *                     displayed.
 * @param {object} options The options (can be empty or ignored).
 */
function View(sta, jq, options){
    'use strict';

    this.T = 2;

    var T = this.T,
        HOVER_TIMEOUT = 1500, // 1.5 seconds.
        SEARCHES_TO_SHOW_PER_TASK = 3,
        DEFAULT_FAVICON = '../css/img/crowdlogger-logo.001.16x16.png',
        defaultOptions = {},
        width = sta.staWindowSpecs.width,
        height = sta.staWindowSpecs.height,
        page = 0, 
        pages = [jq('#current-view'), 
                 jq('#search-history-view'), 
                 jq('#task-history-view'),
                 jq('#search')],
        detailPanelDisplayed = false,
        winId = -1,
        hovers = {},
        model = sta.searchTaskModel,
        key;

    // Merge the given options with the default values.
    if( !options ){
        options = defaultOptions;
    } else {
        for(key in defaultOptions){
            options[key] = options[key]===undefined ? 
                defaultOptions[key] : options[key];
        }
    }

    function addTextBox(elm, defaultValue, onSubmit, onCancel){
        var container = jq('<div>').appendTo(elm),
            form = jq('<form>').appendTo(container),
            textBox = jq('<input type="text" class="name-edit"/>').
                attr('value', defaultValue).appendTo(form),
            submit = jq('<button type="submit">Submit</button>').appendTo(form),
            cancel = jq('<button>Cancel</button>').appendTo(form);

        form.on('submit', function(e){ 
            onSubmit(container, textBox.val());
            return false;
        });
        cancel.click(function(e){
            onCancel(container);
        });
    }

    function removeTextBox(elm){
        elm.remove();
    }

    /**
     * Removes duplicate searches. A search is a duplicate of the search it 
     * immediately follows in chronological order if it shares the same text and
     * doesn't contain any additional page visits.
     *
     * @param {array of ints} searchIds  A list of search ids.
     * @return An array of search IDs with duplicate searches removed.
     */
    function removeDupSearches(searchIds){
        var deDuppedSearchIds = [], search, prevSearch, i;
        for( i = searchIds.length-1; i >= 0; i-- ){
            search = model.searches[searchIds[i]];

            // Ignore repeat searches.
            if( !prevSearch || prevSearch.getText() !== search.getText() || 
                    search.getPages().length > 1 ){
                deDuppedSearchIds.push(searchIds[i]);
            }
            prevSearch = search;
        }
        return deDuppedSearchIds;
    }

    /**
     * Formats a the details of a task; this gets displayed in the task details
     * pane.
     * 
     * @param  {Task} task      The task whose details will be displayed.
     * @param  {Object} options A map of options.
     * @return {jQuery} A jQuery object containing the html of the task details.
     */
    function formatTaskDetails(task, options){
        if( task.isDeleted() ){
            return jq('<h1>No task to display</h1>');
        }

        console.log('Formatting task details; task:');
        console.log(task.getData());
        console.log('options:');
        console.log(options);

        var titleEditInProgress, html, header, titleEdit, deleteTask,
            searches = removeDupSearches(task.getSearchIds()), currentDay = '',
            currentDaySearches,  prevSearch, i, search, day;

        console.log('Checkpoint 0');

        titleEditInProgress = false;
        html = jq('<div id="current-detailed-task" class="task-'+
                task.getId() +'"></div>').data('task', task);

        console.log('Checkpoint 0.1');

        html.data('info', {type: 'task', id: task.getId()});

        console.log('Checkpoint 0.2');

        header = jq(
            '<div class="task-title">Task "<span class="task-name">'+
            task.getText() +
            //model.searches[task.getSearchIds()[0]].getText() +
            '</span>"</div>').appendTo(html);

        console.log('Checkpoint 0.3');

        // titleEdit = jq('<span class="edit">[edit]</span>').click(
        titleEdit = jq('<button>Edit</button>').click(
            function(e){
                if( !titleEditInProgress ){
                    titleEditInProgress = true;
                    addTextBox(header, task.getText(), function(elm,text){
                        titleEditInProgress = false;
                        elm.remove();
                        task.setText(text);
                        header.find('.task-name').html(text);
                    }, function(elm){
                        titleEditInProgress = false;
                        removeTextBox(elm);
                    });
                }
            }
        ).css('margin-left', '10px');

        console.log('Checkpoint 1');

        // deleteTask = jq('<span class="edit">[delete task]</span>').click(
        deleteTask = jq('<button class="confirm">Delete task</button>').click(
            function(e){
                if(confirm('Do you really want to delete this task?')){
                    jq(document).trigger('delete-task', {taskId: task.getId()});
                }
            }
        );

        titleEdit.appendTo(header);
        deleteTask.appendTo(header);
 
        console.log('Checkpoint 2');


        for( i = searches.length-1; i >= 0; i-- ){
            search = model.searches[searches[i]];
            day = extractDate(search.getTimestamp(), "dddd, MMMM d, yyyy");

            // Ignore repeat searches.
            if( day !== currentDay ){
                currentDay = day;
                jq('<span class="date-header">'+currentDay+'</span>').
                    appendTo(html);
                currentDaySearches = jq('<div class="day"></div>').
                    appendTo(html);
            }
            currentDaySearches.append(formatSearchDetails(search));
        }
        console.log('Checkpoint 3');

        html.droppable({
            drop: mergeTasks,
            activeClass: 'ui-droppable-active', 
            hoverClass: 'ui-droppable-hover',
            greedy: true,
            tolerance: 'pointer',
            scope: 'detailed-tasks',
            accept: '.task'
        });
        return html; 
    }

    /**
     * Formats a search.
     * @param {obj} search   The query info object. Must have at least the
     *                          following fields: query, url, se, time.
     */
    function formatSearch(search) {
        var url, se, searchText, linkElm, seElm, searchElm;

        url = search.getUrl();
        se = search.getSe().replace(
            /(^https{0,1}:\/\/(www\.){0,1})|(\.com\/{0,1}$)/g,'');
        searchText = shorten((search.getText().length === 0 ?
            search.getUrl() : search.getText()), 30);

        if( url.match(/https:\/\/www\.google/) !== null ){
            url = sta.util.formatSearchUrl(url, search.getText());
        }

        linkElm = jq('<span class="link">').
            attr('title', '"'+search.getText()+'" '+
            (search.isQuery() ? 'submitted to '+se : 'visited')+
            ' on '+ extractDate( search.getTimestamp() )).
            click(function(){ 
                window.open(url);
                //return false;
            }).html(searchText);
        seElm = search.isQuery() ? '<span class="se"> ('+ se +')</span>' : '';

        searchElm = jq('<div class="search"></div>').attr('data-search-id',
            search.getId());
        
        searchElm.append(linkElm).append(seElm);
        return searchElm;
    }

    function shorten(string, length){
        return string.length-3 > length ? (string.slice(0,length)+'...'):string;
    }

    /**
     * Formats a search in its entirety, pages and all.
     * 
     * @param {Search} search The search whose details will be formatted.
     * @return {jQuery} A jQuery element with the search details.
     */
    function formatSearchDetails(search) {
        var url, se, searchText, linkElm, seElm, pagesElm, pagesSorted, 
            searchElm, deleteButton;

        url = search.getUrl();
        // sta.log('se: '+ search.getSe());
        se = search.getSe().replace(
            /(^https{0,1}:\/\/(www\.){0,1})|(\.com\/{0,1}$)/g,'');
        searchText = shorten((search.getText().length === 0 ?
            search.getUrl() : search.getText()), 50);

        if( url.match(/https:\/\/www\.google/) !== null ){
            url = sta.util.formatSearchUrl(
                search.getSe(), search.getText());
        }



        linkElm = jq('<span class="link">').attr(
            'title', '"'+search.getText()+'" '+
            (search.isQuery() ? 'submitted to '+se : 'visited')+
            ' on '+ extractDate( search.getTimestamp() )).
            click(function(){ 
                window.open(url);
                //return false;
            }).html(searchText);
        seElm = '<span class="se"> '+ 
            (search.isQuery() ? se : '') +
            ' @ '+ extractDate( search.getTimestamp(), 'h:mm tt' ) +'</span>';

        pagesElm = jq('<ul class="pages">');
        pagesSorted = sta.util.copy(search.getPages());
        sta.log(pagesSorted);
        pagesSorted.sort(
                function(p1,p2){
            return p1.initialAccess - p2.initialAccess;
        });

        sta.util.foreach(pagesSorted, function(i, page){
            if(page.initialAccess === -1){
                return true;
            }
            var url, favicon, pageElm;

            url = page.url;
            // sta.log('adding page! '+ JSON.stringify(page));
            favicon = page.favicon === "" ? DEFAULT_FAVICON : page.favicon;

            pageElm = 
                jq('<div><img class="favicon" src="'+favicon+'"></img></div>');
            // .css({
            //     'list-style-image': 'url("'+page.favicon+'")'
            // })
            jq('<span class="link">'+ 
                shorten((page.title === "" ? page.url : page.title), 50) +
                '</a>').appendTo(pageElm).
                attr('title', page.url +' submitted on '+ 
                    extractDate(page.initialAccess)).click(function(){
                    window.open(url);
                });
            jq('<span class="date"> @ '+ 
                extractDate(page.initialAccess, 'h:mm tt') +
                // (page.dwellTime > 0 ? 
                //     ' for '+ formatDwellTime(page.dwellTime) : '') +
                '</span>').appendTo(pageElm);
            pagesElm.append(pageElm);
        }, true);

        searchElm = jq('<div class="detail-panel search ui-widget-content"></div>');
        searchElm.data('info', {searchId: search.getId()});
        searchElm.draggable({
            revert: 'invalid', 
            containment: 'window',
            helper: function(){
                var clone = jq(this).clone(); 
                clone.data('info', jq(this).data('info')); 
                sta.log(clone.attr('class'));
                clone.addClass('dragging');
                clone.width(jq(this).width());
                return clone;
            }, 
            appendTo: 'body',
            refreshPositions: true
        });

        deleteButton = jq('<button>').addClass('confirm').html('Delete search').
            click(function(){
                if(confirm('Do you really want to delete this search?')){
                    jq(document).trigger('delete-search', 
                        {searchId: search.getId()});
                }
            });

        return searchElm.
            append(linkElm).
            append(seElm).
            append(pagesElm).
            append(deleteButton).
            append(deleteButton);
    }

    function formatDwellTime(dwellTime){
        var min = dwellTime/(3600000),
            sec = dwellTime/(60000);

        if( min < 1 ){ return sec.toFixed(0) + ' seconds'; }
        return min.toFixed(0) + ' minutes';
    }

    /**
     * Makes a nicely formatted string out of a time.
     *
     * @param {obj} search   The query object -- must have at least a time
     *                       field. This gets passed to Date...should be the
     *                       time as a Unix epoch, but some string formats
     *                       are also okay.
     * @return The time as a date string in the format:
     *      dddd, MMMM d, yyyy @ h:mm tt
     */
    function extractDate( time, format ){
        format = format === undefined ? 'dddd, MMMM d, yyyy @ h:mm tt' : format;
        return new Date(time).toString(format);
    }

    /**
     * Adds a query to an element.
     * @param {Search object} search The search object. This gets passed to
     *     the formatSearch function for display.
     * @param {jquery element} jqElm The jQuery element to which the query 
     *     should be added.
     * @param {boolean} prepend If true, the query is prepended. Otherwise, it 
     *     is appended.
     */
    function addSearchToElm( search, jqElm, options ) {
        var query = formatSearch(search, options);
        options = options === undefined ? {} : options;

        if( options.detailsAvailable === true ){
            query.addClass('details-on-click').data('info', 
                {type: 'search', id: search.getId()});
        }

        if( options.prepend === true ){
            jqElm.prepend(query);
        } else {
            jqElm.append(query);
        }
    }

    /**
     * Advances the side panel to the next view.
     */
    function nextPage(){
        sta.log('Hiding current page: '+ page);
        //$('#'+ pages[page]).hide();
        pages[page].hide();
        jq('#page-'+ page +'-mark').removeClass('current');
        page = (page + 1) % pages.length;

        sta.log('Moving to next page: '+ page);

        //$('#'+ pages[page]).show();
        pages[page].show();
        jq('#page-'+ page +'-mark').addClass('current');
        reinitializeScrolling();
        resize();
    }

    /**
     * Moves the side panel to the previous view.
     */
    function prevPage(){
        sta.log('Hiding current page: '+ page);
        //$('#'+ pages[page]).hide();
        pages[page].hide();
        jq('#page-'+ page +'-mark').removeClass('current');
        page = (page-1+pages.length) % pages.length;
        sta.log('Moving to previous page: '+ page);

        //$('#'+ pages[page]).show();
        pages[page].show();
        jq('#page-'+ page +'-mark').addClass('current');
        reinitializeScrolling();
        resize();
    }

    /**
     * Reinitializes all JSP scroll panes.
     */
    function reinitializeScrolling(){
        jq('.scroll-pane').each(function(i,elm){
            jq(elm).data('jsp').reinitialise();
        });
    }

    /**
     * Adds all of the tasks to the content pane of the given jQuery element.
     * The recognized options are as follows:
     * <ul>
     *      <li>{string} format -- one of:
     *          <ul>
     *              <li>full (default) -- tasks is an array of Task objects.
     *              <li>abbreviated --  tasks is an array of task ids.
     *          </ul>
     *      <li>{object of integers} searchWhitelist -- a list of search ids to
     *          include. If present, only searches ids in the white list will
     *          be included in the given tasks.
     *      <li>{integer} maxSearches -- the number of searches to show per
     *          task. Default: 3
     *      <li>{boolean} prepend -- if true, each task will be prepended to 
     *          given element.
     * </ul>
     * 
     * @param {array of tasks} tasks    The tasks to add.
     * @param {jquery element} jqElm    The jQuery element to which the tasks
     *    will be added.
     * @param {object} options Options as described above.
     */
    function populateTaskPane( tasks, jqElm, options ){
        options = options || {};
        if( options.maxSearches === undefined ){
            options.maxSearches = SEARCHES_TO_SHOW_PER_TASK;
        }
        var pane, addTask;

        pane = jqElm.data('jsp').getContentPane();
        addTask = function(i){
            var j, k, max=i+10, taskElm;
            for( j = i; j < max && j < tasks.length; j++ ){
                taskElm = formatTaskElm(tasks[j], options);
                if( taskElm !== undefined ){
                    if(options.prepend){
                        taskElm.prependTo(pane);
                    } else {
                        taskElm.appendTo(pane);
                    }
                }
            }

            if( j < tasks.length){
                setTimeout( addTask(j), T );
            } else {
                jqElm.data('jsp').reinitialise();
            }
        };

        addTask(0);
    }

    function formatTaskElm( task, options ){
        var taskElm, k, searchIds, numSearches, numHidden;
        task = dereferenceTask(task, options);

        if( !task || !task.getSearchIds ){
            sta.log('Having issues with task:' );
        }
        sta.log('>>> task:');
        sta.log(task ? JSON.stringify(task.getData()) : 'no task');

        searchIds = task ? removeDupSearches(task.getSearchIds()) : [];
        numSearches = searchIds.length;

        // If there is a whitelist, then all whitelisted searches for
        // this task will be shown. Otherwise, only the 
        // options.maxSearches most recent searches will be shown.
        if( options.searchWhitelist === undefined ){
            searchIds = searchIds.slice(-options.maxSearches);
        } else {
            searchIds = sta.util.select(searchIds, function(id){ 
                return options.searchWhitelist[id] !== undefined;
            }); 
        }

        // If there are no searches, then don't display anything.
        if( searchIds.length > 0 ){
            // sta.log('Adding task '+ task.getId() +
            //     ' with '+ searchIds.length +' searches.');

            taskElm = jq('<div class="task details-on-click task-'+
                task.getId()+'">');
            taskElm.data('info', {type: 'task', id: task.getId(),
                maxSearches: options.maxSearches});

            // Go through the ids backwards, since they are in 
            // chronological order.
            for( k = searchIds.length-1; k >= 0; k-- ){
                //$('<div class=~~query~~>').text(tasks[j][k].query).
                //    appendTo(task);
                addSearchToElm( 
                    model.searches[searchIds[k]], 
                    taskElm
                );
            }
            // Add an endcap that indicates how many additional queries exist
            // in this task...
            numHidden = numSearches - searchIds.length;
            if( numHidden > 0 ){
                jq('<div>').html('(...'+numHidden+' more...)').
                    addClass('endcap').appendTo(taskElm);
            }

            taskElm.droppable({
                drop: mergeSearchAndTask,
                activeClass: 'ui-droppable-active', 
                hoverClass: 'ui-droppable-hover',
                greedy: true,
                tolerance: 'pointer',
                accept: '.search'
            });

            taskElm.draggable({
                revert: 'invalid', 
                containment: 'window',
                helper: function(){
                    var clone = jq(this).clone(); 
                    clone.data('info', jq(this).data('info')); 
                    clone.addClass('dragging'); //, 'sidebar');
                    clone.width(jq(this).width());
                    return clone;
                }, 
                scope: 'detailed-tasks',
                appendTo: 'body',
                cursor: 'pointer'
            });
        }
        return taskElm;
    }

    function mergeSearchAndTask(event, ui ) {
        var taskElm = jq(this),
            taskId = taskElm.data('info').id,
            searchId = jq(ui.draggable).data('info').searchId;
        jq(ui.draggable).remove();
        
        sta.log("Adding search "+ searchId +" to task "+ taskId);

        jq(document).trigger('merge-search-and-task', {
            taskId: taskId,
            searchId: searchId
        });
    }

    function mergeTasks(event, ui) {
        var id1, id2,
            task1Elm = jq(this),
            task1Id = task1Elm.data('info').id,
            task2Id = jq(ui.draggable).data('info').id;
        jq(ui.draggable).remove();
        
        //sta.log("Adding search "+ searchId +" to task "+ taskId);

        id1 = Math.max(task1Id, task2Id);
        id2 = Math.min(task1Id, task2Id);

        jq(document).trigger('merge-tasks', {
            task1Id: id1,
            task2Id: id2
        });
    }


    /**
     * Handles dereferencing an array of tasks or task ids based on the format
     * specified in the options.
     * 
     * @param  {integer or Task object} task  Either a task id or a task object.
     * @param  {object} options The options; only recognized option is:
     *  <ul>
     *      <li>{string} format -- one of:
     *          <ul>
     *              <li>full (default) -- tasks is an array of Task objects.
     *              <li>abbreviated --  tasks is an array of task ids.
     *          </ul>
     *      </li>
     *  </ul>
     * @return {Task object} The task object associated with the given task.
     */
    function dereferenceTask(task, options){
        if(options.format === undefined || options.format === "full" ){
            return task;
        }
        return model.tasks[task];
    }

    /**
     * Adds all of the searches to the content pane of the given jQuery element. 
     * The recognized options are as follows:
     * <ul>
     *      <li>{string} format -- one of:
     *          <ul>
     *              <li>full (default) -- tasks is an array of Task objects.
     *              <li>abbreviated --  tasks is an array of task ids.
     *          </ul>
     *          
     *      <li>{boolean} prepend -- if true, the searches will be prepended 
     *          rather than appended to the given element.
     * </ul>
     * 
     * @param {array of searches} searches   The searches to add.
     * @param {jsearch element} jqElm       The jQuery element to which the
     *    searches will be added.
     * @param {object} options Options, see above.
     */
    function populateSearchPane( searches, jqElm, options ){
        options = options === undefined ? {} : options;
        var pane, prevSearch, addSearch;

        sta.log('populating search pane...');
        pane = jqElm.data('jsp').getContentPane();

        addSearch = function(i){
            var j, max=i+10, curSearch;
            for( j = i; j < max && j < searches.length; j++ ){
                curSearch = dereferenceSearch(searches[j], options);

                // Filter out queries entered too closely together.
                // if( curSearch.getPages().length > 0 || 
                //         !prevSearch || (prevSearch && 
                //          prevSearch.getTimestamp()-
                //          curSearch.getTimestamp() > 3000 )  ){

                    addSearchToElm( 
                        curSearch, pane, options );
                // }
                // prevSearch = curSearch;
            }
            if( j < searches.length){
                setTimeout( addSearch(j), T );
            } else {
                jqElm.data('jsp').reinitialise();
                sta.log("done!");
            }
        };

        addSearch(0);
    }

    /**
     * Handles dereferencing an array of searches or search ids based on the 
     * format specified in the options.
     * 
     * @param  {integer or Search object} search  Either a search id or a 
     *      search object.
     * @param  {object} options The options; only recognized option is:
     *  <ul>
     *      <li>{string} format -- one of:
     *          <ul>
     *              <li>full (default) -- searches is an array of Search objs.
     *              <li>abbreviated --  searches is an array of search ids.
     *          </ul>
     *      </li>
     *  </ul>
     * @return {Task object} The search object associated with the given search.
     */
    function dereferenceSearch(search, options){
        if(options.format === undefined || options.format === "full" ){
            return search;
        }
        return model.searches[search];
    }


    /**
     * Called when the search task assistant window resizes. It's main job
     * is to take care of reinitializing the scroll panes, whose sizes need to
     * be known.
     */
    function resize(){
        try{
            jq('.scroll-pane').each(function(i,elm){
                elm = jq(elm);
                elm.height(elm.parent().height() - 
                    elm.parent().find('h1').outerHeight() - 25);
                if( elm.data('jsp') && elm.data('jsp').reinitialise ){
                    elm.data('jsp').reinitialise();
                }
            });
        } catch(e) { 
            sta.log("EXCEPTION while resizing: "+ e );
        }
    }

    /**
     * Expands the width of the window to show the detail panel.
     */
    function showDetailPanel(){
        window.resizeTo(1000, window.outerHeight);
        detailPanelDisplayed = true;
        jq('#hide-detail-panel').show();
        jq('#show-detail-panel').hide();
    }

    /**
     * Shrinks the width of the window to hide the detail panel, showing only
     * the side bar.
     */ 
    function hideDetailPanel(){
        window.resizeTo(width, window.outerHeight);
        detailPanelDisplayed = false;

        jq('#hide-detail-panel').hide();
        jq('#show-detail-panel').show();
    }

    /**
     * Shows the detail panel if it's hidden; hides it otherwise.
     */
    function toggleDetailPanel(){
        if( detailPanelDisplayed ){
            hideDetailPanel();
        } else {
            showDetailPanel();
        }
    }

    /**
     * Triggered when a task is moused over.
     */
    function startHover(event){
        var elm = jq(this),
            id = elm.data('info').id;
        hovers[id] = setTimeout(function(){
            delete hovers[id];
            // The controller should be waiting for this event.
            jq(document).trigger('details-requested', elm.data('info'));
        }, HOVER_TIMEOUT);
    }

    /**
     * Triggered when the mouse moves away from a task.
     */
    function endHover(event){
        var elm = jq(this),
            id = elm.data('info').id;
        if( !hovers[id] ){
            clearTimeout(hovers[id]);
            delete hovers[id];
        }
    }

    function detailsRequested(event){
        jq(document).trigger('details-requested',jq(this).data('info'));
    }

    /**
     * Adds the listeners.
     */
    function addListeners(){
        jq('#page-left').click(prevPage);
        jq('#page-right').click(nextPage);
        jq(window).resize(resize);
        jq('#hide-detail-panel').click(hideDetailPanel);
        jq('#show-detail-panel').click(showDetailPanel);
        // jq('#sidebar').delegate('.details-on-hover', 'mouseenter', startHover);
        // jq('#sidebar').delegate('.details-on-hover', 'mouseleave', endHover);
        jq('#sidebar').delegate('.details-on-click', 'click', detailsRequested);
        jq('#search-box-form').submit(function(event){
            setTimeout(function(){
                jq(document).trigger('query-history', 
                    {query: jq('#search-box').val()} );
            }, 25);
            return false;
        });
    }

    // Public functions.
    /**
     * Tells the viewer that we're in a loading phase, which causes a "loading"
     * message to display.
     */
    this.processing = function(options){
        var elms = [];
        if( options === undefined ){
            elms = [jq('#related-tasks'), jq('#related-searches')];
        } else if(options.queryHistory) {
            elms = [jq('#matched-tasks'), jq('#matched-searches')];
        }

        jq.each(elms, function(i,elm){
            elm.data('jsp').getContentPane().
            html('<b>...Loading....</b>');
        });

    };

    /**
     * Adds a query to the view. What it gets added to is in the options,
     * including the search it should be added to and whether it should be
     * displayed in the recent history. Valid options:
     * <ul>
     *      <li>{string} format -- one of:
     *          <ul>
     *              <li>full (default) -- searches is an array of Search objs.
     *              <li>abbreviated -- searches is an array of search ids.
     *          </ul>
     *      <li>{boolean} relatedSearches -- the searches to be added are  
     *          related to the current search.
     *      <li>{boolean} searchHistory -- the searches to be added are 
     *          historic searches.     
     *      <li>{boolean} prepend -- if true, the searches will be prepended 
     *          rather than appended to the element.
     * </ul>
     * @param {array} searches Array of query objects.
     * @param {object} options A set of options to apply. Should indicate what
     *     category the searches are (relatedSearches, newSearches, etc.).
     */
    this.addSearches = function(searches, options) {
        var elm;
        if( options.relatedSearches || options.matchedSearches ) {
            elm = options.relatedSearches ? jq('#related-searches') :
                jq('#matched-searches');

            if( searches.length > 0 ){
                elm.data('jsp').getContentPane().html('');
                populateSearchPane( searches.slice(0,20), elm, options);
            } else {
                elm.data('jsp').getContentPane().html(
                    '<i>No related searches detected.</i>');
            }
        }

        if( options.searchHistory ){
            elm = jq('#search-history');
            options.detailsAvailable = true;
            populateSearchPane(searches, elm, options);
        }
    };

    /**
     * Adds tasks to the view. What it gets added to is in the options. Valid 
     * options:
     * <ul>
     *      <li>{string} format -- one of:
     *          <ul>
     *              <li>full (default) -- tasks is an array of Task objects.
     *              <li>abbreviated --  tasks is an array of task ids.
     *          </ul>
     *      <li>{array of integers} searchWhitelist -- a list of search ids to
     *          include. If present, only searches ids in the white list will
     *          be included in the given tasks.
     *      <li>{boolean} currentTasks -- the tasks to be added are current 
     *          tasks.
     *      <li>{boolean} relatedTasks -- the tasks to be added are related 
     *          to the current task.
     *      <li>{boolean} taskHistory -- the tasks to be added are historic
     *          tasks.     
     *      <li>{integer} maxSearches -- the number of searches to show per
     *          task. Default: 3
     * </ul>
     * Options that are missing are assumed false.
     *
     * @param {array} tasks Array of task objects (or an abbreviated version if
     *     specified in the options.
     * @param {object} options A set of options to apply. Should indicate what
     *     category the tasks are (relatedTasks, currentTasks, etc.).
     */
    this.addTasks = function(tasks, options) {
        var elm;
        // Add the tasks to the list of current tasks (main view).
        if( options.currentTasks ){
            jq('#current-tasks').data('jsp').getContentPane().html('');
            populateTaskPane( tasks, jq('#current-tasks'), options );
        }

        // Add the tasks to the list of related tasks (main view).
        if( options.relatedTasks || options.matchedTasks ) {
            elm = options.relatedTasks ? jq('#related-tasks') :
                jq('#matched-tasks');

            if( tasks.length > 0 ){
                elm.data('jsp').getContentPane().html('');
                populateTaskPane( tasks.slice(0,10), elm, options );
            } else {
                elm.data('jsp').getContentPane().html(
                        '<i>No related tasks detected.</i>');
            }
        }

        if( options.taskHistory ){
            elm = jq('#task-history');
            populateTaskPane(tasks, elm, options);
        }
    };

    /**
     * Looks for tasks with the class 'task-[taskId]' and re-formats them
     * from scratch. Tasks in the sidebar are formatted with formatTask and
     * use the original maxSearches parameter (stored in the data.info
     * parameter) while the detail-panel tasks are formatted with 
     * formatTaskDetails.
     * 
     * @param  {integer} taskId The id of the task to update.
     * @param  {object}  info    A map of data from the original updated-task
     *                           event.
     */
    this.updateTask = function(taskId, info){
        var task = model.tasks[taskId], detailElm;

        sta.log(task);

        jq('#sidebar .task-'+taskId).each(function(i,elm){
            elm = jq(elm);
            elm.replaceWith(formatTaskElm(task, {
                format: 'full', 
                maxSearches: elm.data('info').maxSearches
            }));
        });

        detailElm = jq('#detail-panel .task-'+taskId);

        if( detailElm.size() > 0 ){
            if( info.mergedWith === undefined ){
                detailElm.replaceWith(formatTaskDetails(task));
            } else {
                detailElm.replaceWith(formatTaskDetails(
                    model.tasks[info.mergedWith]));
                detailElm.removeClass('task-'+taskId);
                detailElm.addClass('task-'+ info.mergedWith);
            }
        }
    };

    this.removeTask = function(taskId, info){
        jq('.task-'+taskId).remove();
    };

    /**
     * Displays the details panel if not already and updates the content to
     * reflect the given task.
     *
     * @param {Task object} task    The task to be detailed.
     */
    this.showDetails = function(data){
        var task, search, options = {};
        showDetailPanel();

        if( data.type === 'task' ){
            task = model.tasks[data.id];
        } else {
            search = model.searches[data.id];
            task = model.tasks[search.getTaskId()];
            options.searchToHighlight = search;
        }

        jq('#detail-panel').html(
            //'<h2>Hovered over '+ task.id +'</h2>'
            formatTaskDetails( task, options )
        );
    };

    /**
     * Hides the initialization loader.
     */
    this.hideInitializationLoader = function(){
        jq('.initialization-cover').hide();
    };

    /**
     * Removes a search.
     */
    this.removeSearch = function(searchId){
        jq('[data-search-id='+ searchId+']').remove();
    };

    /**
     * Initializes the view.
     *
     * @param {integer} id  The window id of the STA.
     */
    this.init = function(id){
        winId = id;
        width = jq('#sidebar').width(); // Dictated by CSS.
        jq('.scroll-pane').jScrollPane();

        addListeners();
        resize();
    };

    /**
     * Cleans up any externally attached listeners, etc.
     */
    this.destroy = function(){

    };

}