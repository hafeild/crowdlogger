
/**
 * Encapsulates a search event. This is mainly a wrapper around a basic object,
 * providing update functions that will mark the data as inconsistent with the
 * DB. Recognized fields and their defaults:
 * <ul>
 *    <li>timestamp: -1
 *    <li>id: -1
 *    <li>task_id: -1
 *    <li>pages: []
 *    <li>url: ""
 *    <li>text: ""
 *    <li>is_query: false  (as opposed to a direct url access)
 *    <li>se: ""
 * </ul>
 *
 *
 * @param {object} initial_data  An object that can include the initial data.
 *    Missing fields will be populated with defaults.
 * @param {boolean} is_consistent_with_db Whether the initial data is consistent
 *    with what is stored in the DB for this object. Set this to 'true' if the
 *    initials data is directly from the DB.
 */
RemoteModule.prototype.Search = function(initial_data, is_consistent_with_db){
    initial_data = !initial_data ? {} : initial_data;
    var data = {
            timestamp: -1,
            id: -1,
            task_id: -1,
            pages: [],
            url: "",
            text: "",
            is_query: false,
            se: "",
            last_access: -1
        },
        page_lookup = {},
        i,
        that = this;
       
    function init(){
        for( key in data ){
            // CROWDLOGGER.debug.log('data['+ key +']: '+ data[key] +
            //     '\ninitial_data['+key+']: '+ initial_data[key] );
            data[key] = (initial_data[key] === undefined ? 
                data[key] : initial_data[key]);
        }

        // Make the lookup for the pages.
        for( i = 0; i < data.pages.length; i++ ){
            page_lookup[data.pages[i].url] = data.pages[i];
        }

        is_consistent_with_db = is_consistent_with_db === true;

        if( data.timestamp > -1 && data.last_access === -1 ){
            that.set_last_access(data.timestamp);
        }
    }    

    
    this.set_task_id = function(task_id){
        data.task_id = task_id;
        is_consistent_with_db = false;
    };

    this.get_task_id = function(){
        return data.task_id;
    };

    this.set_last_access = function(timestamp){
        data.last_access = timestamp;
        is_consistent_with_db = false;
    }

    this.get_last_access = function(){
        return data.last_access;
    }

    this.get_id = function(){
        return data.id;
    };

    this.get_pages = function(){
        return data.pages;
    };

    this.get_text = function(){
        return data.text;
    };

    this.get_url = function(){
        return data.url;
    };

    this.get_se = function(){
        return data.se;
    };

    this.is_query = function(){
        return data.is_query;
    }

    this.get_timestamp = function(){
        return data.timestamp;
    };

    this.add_pages = function(pages){
        for( i = 0; i < pages.length; i++ ){
            var page = CROWDLOGGER.page(pages[i]);
            data.pages.push(page);
            page_lookup[page.url] = page;
            if( page.last_access > data.last_access ){
                that.set_last_access(page.last_access);
            }

        }
        is_consistent_with_db = false;
    };

    this.get_page = function(url){
        return page_lookup[url];
    };

    this.update_page = function(url, updates){
        var page = page_lookup[url];
        if( page !== undefined ){
            for( key in page ){
                if( key !== 'url' && updates[key] !== undefined ){
                    page[key] = updates[key];
                    is_consistent_with_db = false;
                }
            }
            if( page.last_access > data.last_access ){
                that.set_last_access(page.last_access);
            }
        }
    };

    this.get_data = function(){
        return data;
    };

    this.toString = function(){
        return JSON.stringify(data);
    };

    this.matches = function(pattern){
        var match_summary = {
            search_matches: false,
            page_matches: []
        }

        if( pattern.test(data.text) || pattern.test(data.url) ){
            match_summary.search_matches = true;
        }

        CROWDLOGGER.jq.each(data.pages, function(i, page){
            if(pattern.test(page.url) || pattern.test(page.title) ){
                match_summary.search_matches = true;
                match_summary.page_matches.push(page);
            }
        });

        return match_summary;
    };

    init();
};
