
/**
 * Encapsulates a task. This is mainly a wrapper around a basic object,
 * providing update functions that will mark the data as inconsistent with the
 * DB. Recognized fields and their defaults:
 * <ul>
 *    <li>timestamp: -1
 *    <li>id: -1
 *    <li>search_ids: []
 *    <li>display_name: ""
 * </ul>
 *
 * @param {object} initial_data  An object that can include the initial data.
 *    Missing fields will be populated with defaults.
 * @param {boolean} is_consistent_with_db Whether the initial data is consistent
 *    with what is stored in the DB for this object. Set this to 'true' if the
 *    initials data is directly from the DB.
 */
RemoteModule.prototype.Task = function(initial_data, is_consistent_with_db){
    var is_deleted = false, 
        that = this,
        data = {
            start_timestamp: -1,
            end_timestamp: -1,
            id: -1,
            search_ids: [],
            display_name: ""
        };
    is_consistent_with_db = is_consistent_with_db === true;

    // Fill in the defaults for missing values. Ignore unrecognized fields
    // (i.e., those not in data above).
    for( key in data ){
        data[key] = initial_data[key] === undefined ? 
            data[key] : initial_data[key];
    }

    for(i = 0; i < data.search_ids.length; i++){
        CROWDLOGGER.search_model.searches[data.search_ids[i]].
            set_task_id(data.id);
    }



    this.get_search_ids = function(){
        return data.search_ids;
    };

    this.get_id = function(){
        return data.id;
    };    

    this.remove_search = function(id){
        data.search_ids.splice(data.search_ids.indexOf(id), 1);
        is_consistent_with_db = false;
    };

    this.get_timestamps = function(){
        return [data.start_timestamp, data.end_timestamp];
    };

    this.add_search_ids = function(ids){
        var i, j, search;
        for( i = 0; i < ids.length; i++ ){
            // This figures out where in the search_ids array to insert the
            // new search. This assumes ids themselves reflect the desired
            // order. Currently, that means chronologically.
            j = CROWDLOGGER.util.binary_search(data.search_ids, ids[i],
                CROWDLOGGER.util.int_compare, true);
            // console.log( 'Searching ids in task '+ data.id +' for search '+
            //     ids[i] +'; returned: index '+ j +' (id there: '+ 
            //         data.search_ids[j]+')');
            //console.log( 'length before: '+ data.search_ids.length);
            var length_before = data.search_ids.length;
            if( data.search_ids[j] !== ids[i] ){
                data.search_ids.splice(j, 0, ids[i]);

                search = CROWDLOGGER.search_model.searches[ids[i]];
                search.set_task_id(data.id);

                // CROWDLOGGER.debug.log('Adding searches; current search id: '+
                //     ids[i] +'; search: '+ search );

                //data.search_ids.concat(ids);

                // Update the time stamps.
                data.end_timestamp = 
                    (data.end_timestamp < search.get_timestamp()) ?
                        search.get_timestamp() :
                        data.end_timestamp;
                data.start_timestamp =
                    (data.start_timestamp === -1 || 
                            data.start_timestamp > search.get_timestamp()) ?
                        search.get_timestamp() :
                        data.start_timestamp;
            } 
            // console.log( 'length_before: '+ length_before +' length after: '+ 
            //     data.search_ids.length);


        }
        is_consistent_with_db = false;
    };


    this.get_text = function(){

        return data.display_name === "" ? 
            CROWDLOGGER.search_model.searchers[data.search_ids[0]].get_text() : 
            data.display_name;
    };

    this.is_consistent_with_db = function(){
        return is_consistent_with_db;
    };

    this.delete = function(){ 
        is_deleted = true; 
        data.search_ids = [];
        is_consistent_with_db = false;
    };

    this.merge_with = function(task_ids){
        var id, task, searches;
        while(task_ids.length > 0){
            id = parseInt(task_ids.shift());
            if( id !== data.id ) {
                // CROWDLOGGER.debug.log('Merging tasks '+ data.id +' and '+ id);
                task = CROWDLOGGER.search_model.tasks[id];
                //console.log('merging tasks '+ id +' and '+ data.id);
                that.add_search_ids( task.get_search_ids(), id );
                task.delete();
            }
        }
    };

    this.set_text = function(text){
        data.display_name = text;
        is_consistent_with_db = false;
    }

    this.toString = function(){
        return JSON.stringify(data);
    };

    this.matches = function(pattern){
        var match_summary = {
            task_matches: false,
            search_matches: []
        }

        if( pattern.test(data.display_name) ){
            match_summary.task_matches = true;
        }

        CROWDLOGGER.jq.each(data.search_ids, function(i, search_id){
            var matches = CROWDLOGGER.search_model.searches[search_id].
                    matches(pattern);
            //console.log(matches);

            if(matches.search_matches ){
                match_summary.search_matches.push(search_id);
                match_summary.task_matches = true;
            }
        });

        return match_summary;
    };

    this.is_deleted = function(){
        return is_deleted;
    }
};

