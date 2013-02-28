/**
 * @file_overview The default search task assistant (STA) view manipulator. 
 * Provides several functions for displaying searches to the STA and handles
 * things like window location, size, scrolling, etc. 
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
 * Creates a new view object. To use it, do:
 *
 *      var my_view = new View(jQuery);
 * 
 * @param {object} jq  The jQuery object for the page in which the STA is 
 *                     displayed.
 * @param {object} model A reference to the model.
 * @param {object} options The options (can be empty or ignored).
 */
function View(jq, model, options){
    this.T = 2;

    var default_options = {
    };

    var T = this.T,
        HOVER_TIMEOUT = 1500, // 1.5 seconds.
        SEARCHES_TO_SHOW_PER_TASK = 3,
        DEFAULT_FAVICON = '../css/img/crowdlogger-logo.001.16x16.png',
        width = CROWDLOGGER.search_task_assistant.width,
        height = CROWDLOGGER.search_task_assistant.height,
        page = 0, 
        pages = [jq('#current-view'), 
                 jq('#search-history-view'), 
                 jq('#task-history-view'),
                 jq('#search')],
        detail_panel_displayed = false,
        win_id = -1,
        hovers = {};

    // Merge the given options with the default values.
    if( options === undefined ){
        options = default_options;
    } else {
        for(key in default_options){
            options[key] = options[key]===undefined ? 
                default_options[key] : options[key]
        }
    }

    function add_text_box(elm, default_value, on_submit, on_cancel){
        var container = jq('<div></div>').appendTo(elm);
        var text_box = jq('<input type="text" class="name-edit"/>').appendTo(container);
        text_box.attr('value', default_value);
        var submit = jq('<span class="edit">Submit</span>').appendTo(container);
        submit.click(function(e){
            on_submit(container, text_box.val());
        });
        var cancel = jq('<span class="edit">Cancel</span>').appendTo(container);
        cancel.click(function(e){
            on_cancel(container);
        });
    }

    function remove_text_box(elm){
        elm.remove();
    }

    /**
     * Formats a the details of a task; this gets displayed in the task details
     * pane.
     * 
     * @param  {Task} task      The task whose details will be displayed.
     * @param  {Object} options A map of options.
     * @return {jQuery} A jQuery object containing the html of the task details.
     */
    function format_task_details(task, options){
        if( task.is_deleted() ){
            return jq('<h1>No task to display</h1>');
        }

        var title_edit_in_progress = false;
        var html = jq('<div id="current-detailed-task" class="task-'+
            task.get_id() +'"></div>').data('task', task);
        html.data('info', {type: 'task', id: task.get_id()});
        var header = jq(
            '<div class="task-title">Task "<span class="task-name">'+
            task.get_text() +
            //model.searches[task.get_search_ids()[0]].get_text() +
            '</span>"</div>').appendTo(html);
        var title_edit = jq('<span class="edit">[edit]</span>').click(
            function(e){
                if( !title_edit_in_progress ){
                    title_edit_in_progress = true;
                    add_text_box(header, task.get_text(), function(elm,text){
                        title_edit_in_progress = false;
                        elm.remove();
                        task.set_text(text);
                        header.find('.task-name').html(text);
                    }, function(elm){
                        title_edit_in_progress = false;
                        remove_text_box(elm);
                    });
                }
            }
        );

        var delete_task = jq('<span class="edit">[delete task]</span>').click(
            function(e){
                if(confirm('Do you really want to delete this task?')){
                    jq(document).trigger('delete-task', {task_id: task.get_id()});
                }
            }
        );

        title_edit.appendTo(header);
        delete_task.appendTo(header);
        


        var searches = task.get_search_ids(),
            current_day = "",
            current_day_searches,
            prev_search;

        for( i = searches.length-1; i >= 0; i-- ){
            var search = model.searches[searches[i]],
                day = extract_date(search.get_timestamp(), 
                    "dddd, MMMM, d, yyyy");

            // Ignore repeat searches.
            if( prev_search === undefined || prev_search.get_text() !==
                    search.get_text() || search.get_pages().length > 1 ){
                if( day !== current_day ){
                    current_day = day;
                    jq('<span class="date-header">'+current_day+'</span>').
                        appendTo(html);
                    current_day_searches = jq('<div class="day"></div>').
                        appendTo(html);
                }

                current_day_searches.append(format_search_details(search));
            }

            prev_search = search;
        }

        html.droppable({
            drop: merge_tasks,
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
    function format_search(search) {
        var url = search.get_url();
        var se = search.get_se().replace(
            /(^https{0,1}:\/\/(www\.){0,1})|(.com\/{0,1}$)/g,'');
        var search_text = shorten((search.get_text().length === 0 ?
            search.get_url() : search.get_text()), 30);

        if( url.match(/https:\/\/www.google/) !== null ){
            url = CROWDLOGGER.util.format_search_url(url, search.get_text());
        }

        var link_elm = jq('<span class="link">').
            attr('title', '"'+search.get_text()+'" '+
            (search.is_query() ? 'submitted to '+se : 'visited')+
            ' on '+ extract_date( search.get_timestamp() )).
            click(function(){ 
                window.open(url);
                //return false;
            }).html(search_text)
        var se_elm = search.is_query() ? 
            '<span class="se"> ('+ se +')</span>' : "";

        var search_elm = jq('<div class="search"></div>');
        
        search_elm.append(link_elm).append(se_elm);
        return search_elm;
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
    function format_search_details(search) {
        var url = search.get_url();
        // console.log('se: '+ search.get_se());
        var se = search.get_se().replace(
            /(^https{0,1}:\/\/(www\.){0,1})|(.com\/{0,1}$)/g,'');
        var search_text = shorten((search.get_text().length === 0 ?
            search.get_url() : search.get_text()), 50);

        if( url.match(/https:\/\/www.google/) !== null ){
            url = CROWDLOGGER.util.format_search_url(
                search.get_se(), search.get_text());
        }



        var link_elm = jq('<span class="link">').attr(
            'title', '"'+search.get_text()+'" '+
            (search.is_query() ? 'submitted to '+se : 'visited')+
            ' on '+ extract_date( search.get_timestamp() )).
            click(function(){ 
                window.open(url);
                //return false;
            }).html(search_text)
        var se_elm = '<span class="se"> '+ 
            (search.is_query() ? se : '') +
            ' @ '+ extract_date( search.get_timestamp(), 'h:mm tt' ) +'</span>';

        var pages_elm = jq('<ul class="pages">');
        var pages_sorted = CROWDLOGGER.util.copy(search.get_pages());
        console.log(pages_sorted);
        pages_sorted.sort(
                function(p1,p2){
            return p1.initial_access - p2.initial_access;
        });
        CROWDLOGGER.util.foreach(pages_sorted, function(i, page){
            if(page.initial_access === -1){
                return true;
            }
            var url = page.url;
            // console.log('adding page! '+ JSON.stringify(page));
            var favicon = page.favicon === "" ? DEFAULT_FAVICON : page.favicon;

            var page_elm = 
                jq('<div><img class="favicon" src="'+favicon+'"></img></div>');
            // .css({
            //     'list-style-image': 'url("'+page.favicon+'")'
            // })
            jq('<span class="link">'+ 
                shorten((page.title === "" ? page.url : page.title), 50) +
                '</a>').appendTo(page_elm).
                attr('title', page.url +' submitted on '+ 
                    extract_date(page.initial_access)).click(function(){
                    window.open(url);
                });
            jq('<span class="date"> @ '+ 
                extract_date(page.initial_access, 'h:mm tt') +
                // (page.dwell_time > 0 ? 
                //     ' for '+ format_dwell_time(page.dwell_time) : '') +
                '</span>').appendTo(page_elm);
            pages_elm.append(page_elm);
        }, true);

        var search_elm = jq('<div class="detail-panel search ui-widget-content"></div>');
        search_elm.data('info', {search_id: search.get_id()});
        search_elm.draggable({
            revert: 'invalid', 
            containment: 'window',
            helper: function(){
                var clone = jq(this).clone(); 
                clone.data('info', jq(this).data('info')); 
                console.log(clone.attr('class'));
                clone.addClass('dragging');
                clone.width(jq(this).width());
                return clone;
            }, 
            appendTo: 'body',
            refreshPositions: true
        });
        return search_elm.
            append(link_elm).
            append(se_elm).
            append(pages_elm);
    }

    function format_dwell_time(dwell_time){
        var min = dwell_time/(3600000);
        var sec = dwell_time/(60000);

        if( min < 1 ){
            //return '< 1 minute';
            return sec.toFixed(0) + ' seconds';
        } else {
            return min.toFixed(0) + ' minutes';
        }
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
    function extract_date( time, format ){
        format = format === undefined ? 'dddd, MMMM d, yyyy @ h:mm tt' : format;
        return new Date(time).toString(format);
    }



    /**
     * Adds a query to an element.
     * @param {Search object} search The search object. This gets passed to
     *     the format_search function for display.
     * @param {jquery element} jq_elm The jQuery element to which the query 
     *     should be added.
     * @param {boolean} prepend If true, the query is prepended. Otherwise, it 
     *     is appended.
     */
    function add_search_to_elm( search, jq_elm, options ) {
        var query = format_search(search, options);
        options = options === undefined ? {} : options;

        if( options.details_available === true ){
            query.addClass('details-on-click').data('info', 
                {type: 'search', id: search.get_id()});
        }

        if( options.prepend === true ){
            jq_elm.prepend(query);
        } else {
            jq_elm.append(query);
        }
    }

    /**
     * Advances the side panel to the next view.
     */
    function next_page(){
        console.log('Hiding current page: '+ page);
        //$('#'+ pages[page]).hide();
        pages[page].hide();
        jq('#page-'+ page +'-mark').removeClass('current');
        page = (page + 1) % pages.length;

        console.log('Moving to next page: '+ page);

        //$('#'+ pages[page]).show();
        pages[page].show();
        jq('#page-'+ page +'-mark').addClass('current');
        reinitialize_scrolling();
        resize();
    }

    /**
     * Moves the side panel to the previous view.
     */
    function prev_page(){
        console.log('Hiding current page: '+ page);
        //$('#'+ pages[page]).hide();
        pages[page].hide()
        jq('#page-'+ page +'-mark').removeClass('current');
        page = (page-1+pages.length) % pages.length;
        console.log('Moving to previous page: '+ page);

        //$('#'+ pages[page]).show();
        pages[page].show();
        jq('#page-'+ page +'-mark').addClass('current');
        reinitialize_scrolling();
        resize();
    }

    /**
     * Reinitializes all JSP scroll panes.
     */
    function reinitialize_scrolling(){
        $('.scroll-pane').each(function(i,elm){
            $(elm).data('jsp').reinitialise();
        });
    };

    /**
     * Adds all of the tasks to the content pane of the given jQuery element.
     * The recognized options are as follows:
     * <ul>
     *      <li>{string} format -- one of:
     *          <ul>
     *              <li>full (default) -- tasks is an array of Task objects.
     *              <li>abbreviated --  tasks is an array of task ids.
     *          </ul>
     *      <li>{object of integers} search_whitelist -- a list of search ids to
     *          include. If present, only searches ids in the white list will
     *          be included in the given tasks.
     *      <li>{integer} max_searches -- the number of searches to show per
     *          task. Default: 3
     *      <li>{boolean} prepend -- if true, each task will be prepended to 
     *          given element.
     * </ul>
     * 
     * @param {array of tasks} tasks    The tasks to add.
     * @param {jquery element} jq_elm    The jQuery element to which the tasks
     *    will be added.
     * @param {object} options Options as described above.
     */
    function populate_task_pane( tasks, jq_elm, options ){
        options = options === undefined ? {} : options;
        if( options.max_searches === undefined ){
            options.max_searches = SEARCHES_TO_SHOW_PER_TASK;
        }

        var pane = jq_elm.data('jsp').getContentPane();
        var add_task = function(i){
            var j, k, max=i+10;
            for( j = i; j < max && j < tasks.length; j++ ){
                var task_elm = format_task_elm(tasks[j], options);
                if( task_elm !== undefined ){
                    if(options.prepend){
                        task_elm.prependTo(pane);
                    } else {
                        task_elm.appendTo(pane);
                    }
                }
            }

            if( j < tasks.length){
                setTimeout( add_task(j), T );
            } else {
                jq_elm.data('jsp').reinitialise();
            }
        };

        add_task(0);
    }

    function format_task_elm( task, options ){
        var task = dereference_task(task, options), task_elm, k;
        if( task === undefined || task.get_search_ids === undefined ){
            console.log('Having issues with task:' );
            console.log(task);
        }
        var search_ids = task===undefined ? [] : task.get_search_ids();

        // If there is a whitelist, then all whitelisted searches for
        // this task will be shown. Otherwise, only the 
        // options.max_searches most recent searches will be shown.
        if( options.search_whitelist === undefined ){
            search_ids = search_ids.slice(-options.max_searches);
        } else {
            search_ids = CROWDLOGGER.util.select(search_ids,
                function(id){ 
                    return options.search_whitelist[id] !== undefined;
                }); 
        }

        // If there are no searches, then don't display anything.

        if( search_ids.length > 0 ){
            // console.log('Adding task '+ task.get_id() +
            //     ' with '+ search_ids.length +' searches.');

            task_elm = jq('<div class="task details-on-click task-'+
                task.get_id()+'">');
            task_elm.data('info', {type: 'task', id: task.get_id(),
                max_searches: options.max_searches});

            // Go through the ids backwards, since they are in 
            // chronological order.
            for( k = search_ids.length-1; k >= 0; k-- ){
                //$('<div class=~~query~~>').text(tasks[j][k].query).
                //    appendTo(task);
                add_search_to_elm( 
                    model.searches[search_ids[k]], 
                    task_elm
                );
            }

            task_elm.droppable({
                drop: merge_search_and_task,
                activeClass: 'ui-droppable-active', 
                hoverClass: 'ui-droppable-hover',
                greedy: true,
                tolerance: 'pointer',
                accept: '.search'
            });

            task_elm.draggable({
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
        return task_elm;
    }

    function merge_search_and_task(event, ui ) {
        var task_elm = jq( this );
        var task_id = task_elm.data('info').id;
        var search_id = jq(ui.draggable).data('info').search_id;
        jq(ui.draggable).remove();
        
        console.log("Adding search "+ search_id +" to task "+ task_id);

        jq(document).trigger('merge-search-and-task', {
            task_id: task_id,
            search_id: search_id
        });
    };

    function merge_tasks(event, ui ) {
        var task1_elm = jq( this );
        var task1_id = task1_elm.data('info').id;
        var task2_id = jq(ui.draggable).data('info').id;
        jq(ui.draggable).remove();
        
        //console.log("Adding search "+ search_id +" to task "+ task_id);

        var id1 = Math.max(task1_id, task2_id);
        var id2 = Math.min(task1_id, task2_id);



        jq(document).trigger('merge-tasks', {
            task1_id: id1,
            task2_id: id2
        });
    };


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
    function dereference_task(task, options){
        if(options.format === undefined || options.format === "full" ){
            return task;
        } else {
            return model.tasks[task];
        }
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
     * @param {jsearch element} jq_elm       The jQuery element to which the
     *    searches will be added.
     * @param {object} options Options, see above.
     */
    function populate_search_pane( searches, jq_elm, options ){
        options = options === undefined ? {} : options;

        console.log('populating search pane...');
        var pane = jq_elm.data('jsp').getContentPane();
        var prev_search;

        var add_search = function(i){
            var j, max=i+10;
            for( j = i; j < max && j < searches.length; j++ ){
                var cur_search = dereference_search(searches[j], options);

                // Filter out queries entered too closely together.
                if( cur_search.get_pages().length > 0 || 
                        prev_search === undefined || 
                        (prev_search !== undefined && 
                         prev_search.get_timestamp()-
                         cur_search.get_timestamp() > 3000 )  ){

                    add_search_to_elm( 
                        cur_search, pane, options );
                }
                prev_search = cur_search;
            }
            if( j < searches.length){
                setTimeout( add_search(j), T );
            } else {
                jq_elm.data('jsp').reinitialise();
                console.log("done!");
            }
        };

        add_search(0);
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
    function dereference_search(search, options){
        if(options.format === undefined || options.format === "full" ){
            return search;
        } else {
            return model.searches[search];
        }
    }


    /**
     * Called when the search task assistant window resizes. It's main job
     * is to take care of reinitializing the scroll panes, whose sizes need to
     * be known.
     */
    function resize(){
        try{
            jq('.scroll-pane').each(function(i,elm){
                elm = $(elm);
                elm.height(elm.parent().height() - 
                    elm.parent().find('h1').outerHeight() - 25);
                if( elm.data('jsp') && elm.data('jsp').reinitialise ){
                    elm.data('jsp').reinitialise();
                }
            });
        } catch(e) { 
            console.log("EXCEPTION while resizing: "+ e );
        }
    }

    /**
     * Expands the width of the window to show the detail panel.
     */
    function show_detail_panel(){
        window.resizeTo(1000, window.outerHeight)
        detail_panel_displayed = true;
        jq('#hide-detail-panel').show();
        jq('#show-detail-panel').hide();
    }

    /**
     * Shrinks the width of the window to hide the detail panel, showing only
     * the side bar.
     */ 
    function hide_detail_panel(){
        window.resizeTo(width, window.outerHeight)
        detail_panel_displayed = false;

        jq('#hide-detail-panel').hide();
        jq('#show-detail-panel').show();
    }

    /**
     * Shows the detail panel if it's hidden; hides it otherwise.
     */
    function toggle_detail_panel(){
        if( detail_panel_displayed ){
            hide_detail_panel();
        } else {
            show_detail_panel();
        }
    }

    /**
     * Triggered when a task is moused over.
     */
    function start_hover(event){
        var elm = jq(this);
        var id = elm.data('info').id;
        hovers[id] = setTimeout(function(){
            delete hovers[id];
            // The controller should be waiting for this event.
            jq(document).trigger('details-requested', elm.data('info'));
        }, HOVER_TIMEOUT)
    }

    /**
     * Triggered when the mouse moves away from a task.
     */
    function end_hover(event){
        var elm = jq(this);
        var id = elm.data('info').id;
        if( hovers[id] !== undefined){
            clearTimeout(hovers[id]);
            delete hovers[id];
        }
    }

    function details_requested(event){
        jq(document).trigger('details-requested', jq(this).data('info'));
    }

    /**
     * Adds the listeners.
     */
    function add_listeners(){
        jq('#page-left').click(prev_page);
        jq('#page-right').click(next_page);
        jq(window).resize(resize);
        jq('#hide-detail-panel').click(hide_detail_panel);
        jq('#show-detail-panel').click(show_detail_panel);
        // jq('#sidebar').delegate('.details-on-hover', 'mouseenter', start_hover);
        // jq('#sidebar').delegate('.details-on-hover', 'mouseleave', end_hover);
        jq('#sidebar').delegate('.details-on-click', 'click', details_requested);
        jq('#search-box-form').submit(function(event){
            setTimeout(function(){
                jq(document).trigger('query-history', 
                    {query: jq('#search-box').val()} );
            }, 25);
            return false;
        });
    }





    /////            \\\\\
    // PUBLIC FUNCTIONS \\
    /////            \\\\\

    /**
     * Tells the viewer that we're in a loading phase, which causes a "loading"
     * message to display.
     */
    this.processing = function(options){
        var elms = [];
        if( options === undefined ){
            elms = [jq('#related-tasks'), jq('#related-searches')];
        } else if(options.query_history) {
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
     *      <li>{boolean} related_searches -- the searches to be added are  
     *          related to the current search.
     *      <li>{boolean} search_history -- the searches to be added are 
     *          historic searches.     
     *      <li>{boolean} prepend -- if true, the searches will be prepended 
     *          rather than appended to the element.
     * </ul>
     * @param {array} searches Array of query objects.
     * @param {object} options A set of options to apply. Should indicate what
     *     category the searches are (related_searches, new_searches, etc.).
     */
    this.add_searches = function(searches, options) {

        if( options.related_searches || options.matched_searches ) {
            var elm = options.related_searches ? jq('#related-searches') :
                jq('#matched-searches');

            if( searches.length > 0 ){
                elm.data('jsp').
                    getContentPane().html('');
                populate_search_pane( searches.slice(0,20), 
                    elm, options);
            } else {
                elm.data('jsp').getContentPane().html(
                    '<i>No related searches detected.</i>');
            }
        }

        if( options.search_history ){
            var elm = jq('#search-history');
            options.details_available = true;
            populate_search_pane(searches, elm, options);
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
     *      <li>{array of integers} search_whitelist -- a list of search ids to
     *          include. If present, only searches ids in the white list will
     *          be included in the given tasks.
     *      <li>{boolean} current_tasks -- the tasks to be added are current 
     *          tasks.
     *      <li>{boolean} related_tasks -- the tasks to be added are related 
     *          to the current task.
     *      <li>{boolean} task_history -- the tasks to be added are historic
     *          tasks.     
     *      <li>{integer} max_searches -- the number of searches to show per
     *          task. Default: 3
     * </ul>
     * Options that are missing are assumed false.
     *
     * @param {array} tasks Array of task objects (or an abbreviated version if
     *     specified in the options.
     * @param {object} options A set of options to apply. Should indicate what
     *     category the tasks are (related_tasks, current_tasks, etc.).
     */
    this.add_tasks = function(tasks, options) {

        // Add the tasks to the list of current tasks (main view).
        if( options.current_tasks ){
            jq('#current-tasks').data('jsp').getContentPane().html('');
            populate_task_pane( tasks, jq('#current-tasks'), options );
        }

        // Add the tasks to the list of related tasks (main view).
        if( options.related_tasks || options.matched_tasks ) {
            var elm = options.related_tasks ? jq('#related-tasks') :
                jq('#matched-tasks');

            if( tasks.length > 0 ){
                elm.data('jsp').getContentPane().html('');
                populate_task_pane( tasks.slice(0,10), elm, 
                    options );
            } else {
                elm.data('jsp').getContentPane().html(
                        '<i>No related tasks detected.</i>');
            }
        }

        if( options.task_history ){
            var elm = jq('#task-history');
            populate_task_pane(tasks, elm, options);
        }
    };

    /**
     * Looks for tasks with the class 'task-[task_id]' and re-formats them
     * from scratch. Tasks in the sidebar are formatted with format_task and
     * use the original max_searches parameter (stored in the data.info
     * parameter) while the detail-panel tasks are formatted with 
     * format_task_details.
     * 
     * @param  {integer} task_id The id of the task to update.
     * @param  {object}  info    A map of data from the original updated-task
     *                           event.
     */
    this.update_task = function(task_id, info){
        var task = model.tasks[task_id];

        console.log(task);

        jq('#sidebar .task-'+task_id).each(function(i,elm){
            elm = jq(elm);
            elm.replaceWith(format_task_elm(task, {
                format: 'full', 
                max_searches: elm.data('info').max_searches
            }));
        });

        var detail_elm = jq('#detail-panel .task-'+task_id);

        if( detail_elm.size() > 0 ){
            if( info.merged_with === undefined ){
                detail_elm.replaceWith(format_task_details(task));
            } else {
                detail_elm.replaceWith(format_task_details(
                    model.tasks[info.merged_with]));
                detail_elm.removeClass('task-'+task_id);
                detail_elm.addClass('task-'+ info.merged_with);
            }
        }
    }

    /**
     * Displays the details panel if not already and updates the content to
     * reflect the given task.
     *
     * @param {Task object} task    The task to be detailed.
     */
    this.show_details = function(data){
        var task, search, options = {};
        show_detail_panel();

        if( data.type === 'task' ){
            task = model.tasks[data.id];
        } else {
            search = model.searches[data.id];
            task = model.tasks[search.get_task_id()];
            options.search_to_highlight = search;
        }

        jq('#detail-panel').html(
            //'<h2>Hovered over '+ task.id +'</h2>'
            format_task_details( task, options )
        );
    };

    /**
     * Hides the initialization loader.
     */
    this.hide_initialization_loader = function(){
        jq('.initialization-cover').hide();
    };

    /**
     * Initializes the view.
     *
     * @param {integer} id  The window id of the STA.
     */
    this.init = function(id){
        win_id = id;
        width = jq('#sidebar').width(); // Dictated by CSS.
        jq('.scroll-pane').jScrollPane();

        add_listeners();
        resize();
    };

    /**
     * Cleans up any externally attached listeners, etc.
     */
    this.destroy = function(){

    };

}