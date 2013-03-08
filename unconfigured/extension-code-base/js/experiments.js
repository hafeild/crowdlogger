/**
 * @fileOverview Provides functions pertaining to running experiments.<p>
 * 
 * See the CROWDLOGGER.experiments namespace.<p>
 * 
 * %%LICENSE%%
 *
 * @author hfeild
 * @version %%VERSION%%
 */


if( CROWDLOGGER.experiments === undefined ){
/**
 * @namespace Contains functionality pertaining to running experiments.
 */
CROWDLOGGER.experiments = {
    experiment_update_interval :   1000*60*30, // 30 minutes.
    // We cannot just set this to the preference value because the preferences
    // likely are not loaded at the time this gets executed.
    anonymizers : %%ANONYMIZERS%%,
    MAX_BUNDLE_SIZE : 50 // The number of e-artifacts per bundle.
};


/**
 * An object containing the fields in the experiments manifest.
 */
CROWDLOGGER.experiments.manifest_columns = {
      order_number:  0,
      job_id:        1,
      min_version:   2,
      n:             3,
      k:             4,
      start_date:    5,
      end_date:      6,
      frequency:     7,
      class_name:    8,
      args:          9,
      last_run:      10
};


/**
 * Given that there are experiments ready to run, this determines whether to
 * notify the user or run them automatically.
 */
CROWDLOGGER.experiments.handle_new_experiments = function(){

    // Don't run the experiments if the user hasn't agreed to the consent form.
    if( CROWDLOGGER.preferences.get_bool_pref( "consent_required", true ) ){
        return false;
    }

    // If the user wants to run these automatically, run them.
    if( CROWDLOGGER.preferences.get_bool_pref( "run_experiments_automatically",
            false ) ){
        CROWDLOGGER.experiments.run_experiments();

    // Otherwise, as long as experiments are not already running, 
    // add a notification to the notification queue.
    } else if( !CROWDLOGGER.session_data.keep_running_experiments ){
         CROWDLOGGER.notifications.set_notification( "new_experiments" );
    }

    return true;
};


/**
 * Checks if there are any available experiments and, if there are, runs them. 
 */
CROWDLOGGER.experiments.run_available_experiments = function(){

    // Verify that the consent form has been signed.
    if( CROWDLOGGER.preferences.get_bool_pref( "consent_required", true ) ){
        alert( "Please agree to the Informed Consent (see the status page) " +
               "before attempting to run experiments. Thanks!" );
        return false;
    }

    setTimeout( function(){
        CROWDLOGGER.experiments.check_for_new_experiments( 0, false, 
            function(){
                CROWDLOGGER.notifications.unset_notification( "new_experiments" );
                CROWDLOGGER.experiments.run_experiments();
            },
            function(){
                CROWDLOGGER.notifications.unset_notification( "new_experiments" );
                alert( "No new experiments." )
            } 
        );
    }, 15 );

};


/**
 * Checks in with the experiment server to see if there are any new
 * experiments ready to be run. A call to this function starts a process
 * that will check the status every so often, as defined by the 
 * experiment_update_interval preference, unless the second parameter is
 * <tt>false</tt>.
 *
 * @param {int} update_interval The timeout before the next check should 
 * occur.
 * @param {boolean} start_process If <tt>false</tt>, this function will
 * check if there are any experiments available and then stop. Otherwise,
 * a process will be started to check for experiments periodically.
 */
CROWDLOGGER.experiments.check_for_new_experiments = function( update_interval,
        start_process, on_new_experiments, on_no_experiments ) {

    var url = CROWDLOGGER.io.network.get_server_url( 'experiment_update_url',
        '' );

    var data = 'userID='+ CROWDLOGGER.preferences.get_char_pref( 
        'registration_id', '' );

    var on_error = function( error ){
        CROWDLOGGER.debug.log('ERROR contacting '+ url +': \n\t'+ error +'\n');
        CROWDLOGGER.io.log.write_to_error_log( {data: [{
            f: 'CROWDLOGGER.experiments.check_for_new_experiments',
            err: 'ERROR contacting ' +url +': '+ error,
            t: new Date().getTime()
        }]} );
    };

    var cur_version = CROWDLOGGER.version.info.get_extension_version();


    // First, see if there are any new jobs on the server.
    // Next, expunge old one from the list.
    // Lastly, add all jobs that should be run to the running queue.

    // This is invoked as soon as we hear back from the server.
    var process_experiments = function( response ) {

        // First, check if the response is "CONSENT" -- this means that
        // the user needs to accept a new consent form. If this is the case,
        // we don't need to process the response any further.
        if( response == 'CONSENT' ) {
            // Set the "consentRequired" flag.
            CROWDLOGGER.study.notify_of_new_consent_form();
            return false;
        }

        var job_indicies_to_run_now = [];
        var ran_jobs  = JSON.parse( 
            CROWDLOGGER.preferences.get_char_pref( 'ran_experiments' ) );
        var new_jobs = {};
        var cur_time = new Date().getTime();

        // Add the new jobs to the list of known jobs. Keep track of the
        // maximum order number seen and record it to the 
        // lastExperimentOrderNumber preference.
        var lines = response.split( '\n' );

        for( var i = 0; i < lines.length; i++ ) {
            if( lines[i] == '' || lines[i].match(/^#/) ) {
                continue;
            }

            var job = lines[i].split( '\t' );

            // If no arguments were supplied to the extractor, we need to
            // add in a blank entry to the job definition.
            if( job.length < 9 ) {
                job.push( '' );
            }

            // Set the last_run time to 0.
            job.push( 0 );

            // Parse the start and end time stamps.
            job[CROWDLOGGER.experiments.manifest_columns.start_date] =
              Date.parse(
              job[CROWDLOGGER.experiments.manifest_columns.start_date] );

            job[CROWDLOGGER.experiments.manifest_columns.end_date] =
              Date.parse(
              job[CROWDLOGGER.experiments.manifest_columns.end_date] );


            // Extract the ID.
            var job_id = job[CROWDLOGGER.experiments.manifest_columns.job_id];

            // Add the new job to the hash.
            new_jobs[job_id] = job;
        }

        // Walk through the ran_jobs hash and get rid of any old jobs (ones
        // that do not appear in the new jobs -- we don't want old job ids
        // sitting around longer than they have to).
        for( var job_id in ran_jobs ) {
            if( new_jobs[job_id] === undefined ) {
                delete ran_jobs[job_id];
            }
        }

        // Walk through the job array and get rid of any old jobs or jobs that
        // are not compatible with the currently installed extension.
        for( var job_id in new_jobs ) {
            var min_version = new_jobs[job_id][
                CROWDLOGGER.experiments.manifest_columns.min_version];
            var start_date = new_jobs[job_id][
                CROWDLOGGER.experiments.manifest_columns.start_date];
            var end_date   = new_jobs[job_id][
                CROWDLOGGER.experiments.manifest_columns.end_date]; 
            var frequency = new_jobs[job_id][
                CROWDLOGGER.experiments.manifest_columns.frequency];
            var last_run = 0;
            if( ! (ran_jobs[job_id] === undefined) ) {
                last_run = ran_jobs[job_id];
            }
 
            // Check if the job is old; if so, remove it from the job array.
            if( end_date < cur_time || (
                    frequency == 0 && last_run > 0 ) ||
                    CROWDLOGGER.util.compare_version_numbers( 
                        cur_version, min_version ) < 0 ) {
                //B_DEBUG
                //CROWDLOGGER.debug.log( "Removing job with end_date: " + 
                //    end_date + "\n" );
                //E_DEBUG

                delete new_jobs[job_id];
                // Set i back 1; otherwise, we'll skip an element.
                i--;
            // Check if the job is in the correct range to run it.
            } else if ( start_date < cur_time && ( frequency == 0 ||
                    last_run == 0 || 
                    ( frequency*1000 > (cur_time - last_run)  ) ) ) {

                //B_DEBUG
                CROWDLOGGER.debug.log( "Adding job_id " + job_id + 
                   " to job_indicies_to_run_now\n" );
                //E_DEBUG

                job_indicies_to_run_now.push( job_id );

            } else {
                //B_DEBUG
                CROWDLOGGER.debug.log( "Job being ignored\n" );
                //E_DEBUG
            }
        }
       
        // Save the experiment_list.
        CROWDLOGGER.preferences.set_char_pref(
                'experiment_list', JSON.stringify( new_jobs ) );

        // Save the ran_experiments list.
        CROWDLOGGER.preferences.set_char_pref( 'ran_experiments',
                JSON.stringify( ran_jobs ) );

        //B_DEBUG 
        CROWDLOGGER.debug.log( 'job_indicies_to_run_now:\n' );
        for( var i = 0; i < job_indicies_to_run_now.length; i++ ) {
            CROWDLOGGER.debug.log( '\tjob_indicies_to_run_now['+ i +']: ' + 
                job_indicies_to_run_now[i] +'\n\n' );
        }
        //E_DEBUG

        // Save the list of job indices to run.
        CROWDLOGGER.session_data.job_indicies_to_run = job_indicies_to_run_now;

        // Save the current job index to run (i.e., the first one at this point)
        CROWDLOGGER.session_data.cur_job_index = 0;

        // As long as there is at least one job ready to run, call the callback
        // function.
        if( job_indicies_to_run_now.length > 0 ) {

            // Call the function to handle new experiments.
            setTimeout( on_new_experiments, 500 );

        } else if( on_no_experiments ) {
            // Invoke the function that handles the case that there are no
            // new experiments.
            setTimeout( on_no_experiments, 500 );
        }
    }

    // We first need to see if the server is up. If it is, this function will
    // be invoked; it check if there are new experiments. If there are,
    // it process them.
    var check_for_new_experiments = function(){
        // url, data, on_success, on_error,  method
        CROWDLOGGER.io.network.send_data( 
            url, 
            data, 
            process_experiments, 
            on_error, 
            'GET');
    }

    // This function will be invoked when we hear back about the server status.
    var check_server_status = function( response ) {
        if( response == 'up' ){
            check_for_new_experiments();
        } else {
            CROWDLOGGER.debug.log('Experiment server is down: '+response +'\n');
        }
    }


    // Check the server status.
    CROWDLOGGER.io.network.send_data( 
            CROWDLOGGER.io.network.get_server_url('server_status_url', ''),
            'x=' + new Date().getTime(),
            check_server_status,
            on_error,
            'GET'
    );

    // After some period, check again.
    if( CROWDLOGGER.enabled && start_process ){
        setTimeout( function(){ 
            CROWDLOGGER.experiments.check_for_new_experiments( 
                update_interval, start_process, on_new_experiments, 
                on_no_experiments ); 
        }, update_interval ); 
    }
};



/**
 * This is the function that should be called to run pending experiments.
 * It will set a flag that the experiments should all be run and then
 * begin executing them using calls to run_next_experiment.
 */
CROWDLOGGER.experiments.run_experiments = function(){
    // If we're already running experiments, stop -- we don't want to
    // step on our own toes.
    if( CROWDLOGGER.session_data.keep_running_experiments ){
        return false;
    }

    // Set a flag that says that we can continue executing jobs in the queue.
    CROWDLOGGER.session_data.keep_running_experiments = true;

    // Start running jobs.
    CROWDLOGGER.experiments.run_next_experiment();
};

/**
 * Executes the next pending experiment. If more jobs are available afterwards,
 * it pseudo recurses (timeouts are used).
 */
CROWDLOGGER.experiments.run_next_experiment = function(){

    // Invoked when the experiment has successfully finished.
    var on_experiment_completed = function( ) {
        // Get the list of jobs.
        var job_array = JSON.parse(
            CROWDLOGGER.preferences.get_char_pref('experiment_list'));
        var ran_jobs  = JSON.parse(
            CROWDLOGGER.preferences.get_char_pref( 'ran_experiments' ) );

        // Increment the number of jobs run.
        CROWDLOGGER.preferences.set_int_pref( 'total_experiments_run',
            CROWDLOGGER.preferences.get_int_pref( 'total_experiments_run', 0 ) + 1 );

        // Log the last ran experiment.
        CROWDLOGGER.preferences.set_char_pref( 'last_ran_experiment_id',
            JSON.parse( CROWDLOGGER.preferences.get_char_pref( 
                'current_running_experiment', '{}' ) ).job_id );
 
        // Unset running experiments.
        CROWDLOGGER.preferences.set_char_pref( 'current_running_experiment', '' );


        //B_DEBUG
        CROWDLOGGER.debug.log( 'job_array: ' + JSON.stringify(job_array) + '\n');
        //E_DEBUG

        // Update the last run time field for this job.
        var job_id = job_array[CROWDLOGGER.session_data.job_indicies_to_run[
            CROWDLOGGER.session_data.cur_job_index]][
                    CROWDLOGGER.experiments.manifest_columns.job_id];
        ran_jobs[job_id] = new Date().getTime();

        // Save the modified ran_experiments list.
        CROWDLOGGER.preferences.set_char_pref( 'ran_experiments',
                JSON.stringify( ran_jobs ) );

        // Save the updated experiment list.
        CROWDLOGGER.preferences.set_char_pref('experiment_list',
            JSON.stringify( job_array ) );

        // Should contact the server about users participation in
        // this job.
        //B_DEBUG
        CROWDLOGGER.debug.log( 'Attempting to contact the server about completing job ' +
            job_id + '\nurl: ' +CROWDLOGGER.io.network.get_server_url(
                   'job_completion_url', '' ) +  '?userID=' +
                  CROWDLOGGER.preferences.get_char_pref('registration_id')+
                  '&job_id=' + job_id  + '\n' );
        //E_DEBUG
        if( CROWDLOGGER.preferences.get_bool_pref('registered') ) {
            CROWDLOGGER.io.network.send_data(
                CROWDLOGGER.io.network.get_server_url(
                   'job_completion_url', '' ),
                'userID=' +
                  CROWDLOGGER.preferences.get_char_pref('registration_id')+
                  '&job_id=' + job_id,
                function(msg){
                    CROWDLOGGER.debug.log( 'Successfully contacted server about ' + 
                        job_id + '!\n' );
                }, function(msg){
                    CROWDLOGGER.debug.log( 'Did not successfully contacted server about ' + 
                        job_id + '! Error: ' + msg + '\n' );
                },
                'GET' );
        }

        // Increment the cur_job_index.
        CROWDLOGGER.session_data.cur_job_index++;

        if( CROWDLOGGER.session_data.job_indicies_to_run.length > 
                CROWDLOGGER.session_data.cur_job_index ) {
            // Run the next experiment.
            prepare_next_experiment();
        } else {
            CROWDLOGGER.session_data.keep_running_experiments = false;
        }
    }

    //B_DEBUG
    CROWDLOGGER.debug.log( 'job_indicies_to_run: ' + 
        CROWDLOGGER.session_data.job_indicies_to_run + 
        '\ncur_job_index: ' + CROWDLOGGER.session_data.cur_job_index + '\n' );
    //E_DEBUG

    // We're going to call this in the event of an error.
    var on_error = function( error ) {
        // Get the current job index.
        var cur_job_index = CROWDLOGGER.session_data.cur_job_index;

        // Generate the error log.
        var job_array = JSON.parse(
            CROWDLOGGER.preferences.get_char_pref('experiment_list'));
        var job_id = job_array[
            CROWDLOGGER.session_data.job_indicies_to_run[
                CROWDLOGGER.session_data.cur_job_index]][
                    CROWDLOGGER.experiments.manifest_columns.job_id];

        // Make sure the experiments error log exists.
        if( CROWDLOGGER.session_data.experiments_error_log === undefined ){
            CROWDLOGGER.session_data.experiments_error_log = '';
        }

        // Updated the error log.
        var error_log =
            CROWDLOGGER.session_data.experiments_error_log +
            '\nFor experiment '  + job_id + ':\n\t' + error;

        //B_DEBUG
        CROWDLOGGER.debug.log( 'Index: ' + CROWDLOGGER.session_data.cur_job_index +
                ': ' + error );
        //E_DEBUG

        // Figure out if we should add this error to the running log
        // or if we should delete the log altogether.
        if( CROWDLOGGER.session_data.cur_job_index+1 < 
                CROWDLOGGER.session_data.job_indicies_to_run.length ) {
            // There are still more jobs that could go wrong, so just 
            // append the log.
            CROWDLOGGER.session_data.experiments_error_log = error_log;
        } else {
            // This is the last job, so go ahead and clear the log and
            // notify the user.
            CROWDLOGGER.session_data.experiments_error_log = "";
            CROWDLOGGER.study.notify_user_of_experiment_failures( error_log );
        }

        // Increment the cur_job_index.
        CROWDLOGGER.session_data.cur_job_index++;

        // Should we stop altogether?
        // Need to do something with the rest of the jobs...
        CROWDLOGGER.experiments.run_next_experiment();

    }

    var prepare_next_experiment = function() {
        //showStatus( cur_job_index, job_indicies_to_run.length );

        //B_DEBUG
        CROWDLOGGER.debug.log( 'Running next job.' );
        //E_DEBUG

        // Get the list of experiments.
        var job_array = JSON.parse(
            CROWDLOGGER.preferences.get_char_pref('experiment_list'));

        // Check if the current experiment is a dummy 'NULL_EXPERIMENT'; if
        // so, there is nothing to actually run for this experiment. Just
        // call the success function.
        if( job_array[CROWDLOGGER.session_data.job_indicies_to_run[
            CROWDLOGGER.session_data.cur_job_index]][
                CROWDLOGGER.experiments.manifest_columns.job_id].match( 
                    /NULL_EXPERIMENT/ ) ) {
            on_experiment_completed();
        } else {
        // Otherwise, run the client with the current job information.
            CROWDLOGGER.experiments.run_experiment(
                job_array[CROWDLOGGER.session_data.job_indicies_to_run[
                    CROWDLOGGER.session_data.cur_job_index]],
                on_experiment_completed,
                on_error );
        }
    }

    // Checks if the server is up or not. If it is up, run prepare the 
    // next experiment to run.
    var check_server_status = function( response ) {
        if( response == "up" ){
            prepare_next_experiment();
        } else {
            CROWDLOGGER.session_data.keep_running_experiments = false;
            CROWDLOGGER.debug.log('Experiment server is down: '+response+'\n');
            alert( 'The experiment server has gone done. We will prompt you '+
                   'to run the rest of the experiments later.' );
        }
    }

    // Called if there is no connection to the server.
    var no_connection_to_server_status = function( error ) {
        CROWDLOGGER.session_data.keep_running_experiments = false;
        CROWDLOGGER.debug.log( 
            'Error establishing connection to serverStatus file: '+
            error +'\n' );
        alert( 'The experiment server has gone done. We will prompt you to '+
               'run the rest of the experiments later.' );
        //removeStatus();
    }

    // If so, run job. Call self on success, onError on error.
    if( CROWDLOGGER.session_data.keep_running_experiments &&
                CROWDLOGGER.session_data.cur_job_index < 
                CROWDLOGGER.session_data.job_indicies_to_run.length &&
                CROWDLOGGER.session_data.job_indicies_to_run.length > 0 ) {

        // Check if the experiment server is up or down. If it's up, check
        // for new experiments.
        CROWDLOGGER.io.network.send_data(
                CROWDLOGGER.io.network.get_server_url( 'server_status_url', '' ),
                'x=' + new Date().getTime(),
                check_server_status,
                no_connection_to_server_status,
                'GET' );

    // If not and the status bar is present, remove the status bar stuff.
    } else {
        CROWDLOGGER.session_data.keep_running_experiments = false;

        //if( CROWDLOGGER.session_data.cur_job_index > 0 ) {
        //    CROWDLOGGER.debug.log( "Removing status bar." );
        //    remove_status();
        //}
    } 

};


/**
 * For testing the experiment infrastructure. 
 */
CROWDLOGGER.experiments.run_test = function(){
/*
      order_number:  0,
      job_id:        1,
      n:             2,
      k:             3,
      start_date:    4,
      end_date:      5,
      frequency:     6,
      class_name:    7,
      args:          8,
      last_run:      9
*/

    var test_experiments_data = [];
    test_experiments_data[0] =  [0, "test job query", "1.3.5", "200", "3", 
        "Apr 13 2011 13:00 EDT", "Apr 14 2011 13:00 EDT", "0", "query", "", ""];

    test_experiments_data[1] = [0, "test job query pairs", "1.3.5", "200", "3", 
        "Apr 13 2011 13:00 EDT", "Apr 14 2011 13:00 EDT", "0", 
        "query_pair", "", ""];
    
    test_experiments_data[2] = [0, "test job query-url", "1.3.5", "200", "3", 
        "Apr 13 2011 13:00 EDT", "Apr 14 2011 13:00 EDT", "0", 
        "query_url", "", ""];
        
    // Runs the experiment whose data is stored in test_experiments_data[i].
    var run_test = function( i ){ 
        if( i >= test_experiments_data.length ){
            return null;
        }

        CROWDLOGGER.experiments.run_experiment( test_experiments_data[i],
            // On completion.
            function(){ 
                CROWDLOGGER.debug.log( "Finished processing experiment!!!!\n");
                setTimeout( function(){run_test( i+1 );}, 20 );
            },
            // On error. 
            function(e){
                CROWDLOGGER.debug.log( "Error: " + e + "\n" );
            }
        );
    }

    // Run the first experiment.
    run_test( 0 );

};

/**
 * Runs the given experiment on the user's activity log. If the experiment
 * is completed successfully, the on_completion function is invoked. If
 * an error is encountered, the on_error function is invoked and is passed
 * an error message.
 *
 * @param {array} experiment_data   An array containing information about the
 *      experiment to run.
 * @param {function} on_completion The function to invoke if the experiment
 *      is successfully completed.
 * @param {function} on_error The function to invoke if an error is encountered.
 *      This should take an error message as its parameter.
 */
CROWDLOGGER.experiments.run_experiment = function( experiment_data,
        on_completion, on_error ){

    CROWDLOGGER.preferences.set_char_pref( "current_running_experiment", 
        JSON.stringify( {
            job_id: experiment_data[
                CROWDLOGGER.experiments.manifest_columns.job_id],
            start_time: new Date().getTime()
        } ) );

    CROWDLOGGER.debug.log( 'Current running experiment: '+ 
        CROWDLOGGER.preferences.get_char_pref( 'current_running_experiment' ) +
        '\n' );

    CROWDLOGGER.session_data.current_running_experiment_status = {
        message: 'Preparing log...',
        artifacts_to_process: 0,
        artifacts_processed: -1
    };

    // Extract the artifact. If it wasn't successful, invoke the error function.
    if( !CROWDLOGGER.experiments.artifact_extractors.run_extractor( 
            experiment_data[CROWDLOGGER.experiments.
                manifest_columns.class_name],
            function( artifacts ){
                CROWDLOGGER.experiments.pack_and_send_artifacts( artifacts,
                    experiment_data, on_completion, on_error );
            } ) ){

        on_error( 'Extractor class '+ 
            experiment_data[CROWDLOGGER.experiments.
                manifest_columns.class_name] +' not found.' );
    }
    

};

/**
 * Called when the artifacts have been extracted. It encrypts and then
 * uploads the artifacts.
 *
 * @param {array} artifacts An array of artifacts. Each artifact has three
 *      fields: primary_data, secondary_data, and count.
 * @param {array} experiment_data   An array containing information about the
 *      experiment to run.
 * @param {function} on_completion The function to invoke if the experiment
 *      is successfully completed.
 * @param {function} on_error The function to invoke if an error is encountered.
 *      This should take an error message as its parameter.
 */
CROWDLOGGER.experiments.pack_and_send_artifacts = function( 
        artifacts, experiment_data, on_completion, on_error  ){

    var n, k, job_salt, job_id, passphrase, url, job_failed, current_bundle,
        bundle_size, process_next_artifact, bundle_count;

    var timeout = 100;
    CROWDLOGGER.session_data.current_running_experiment_status.
        artifacts_to_process = artifacts.length;

    //B_DEBUG
    //CROWDLOGGER.debug.log( 'In on_artifact_extracted. artifacts.length: ' +
    //    artifacts.length + '\n' );
    //E_DEBUG
    
    // Shuffle the artifacts so that they are not in any particular order.
    CROWDLOGGER.util.shuffle( artifacts );

    passphrase = CROWDLOGGER.preferences.get_char_pref( 'pass_phrase', '' );
    n = parseInt( experiment_data[CROWDLOGGER.experiments.manifest_columns.n] ); 
    k = parseInt( experiment_data[CROWDLOGGER.experiments.manifest_columns.k] ); 
    job_id = experiment_data[CROWDLOGGER.experiments.manifest_columns.job_id]; 
    job_salt = job_id + experiment_data[
        CROWDLOGGER.experiments.manifest_columns.start_date]; 
    //url = 'https://monto.cs.umass.edu/crowdlogger/experiments/test_.php';
    job_failed = false;

    // Stores the current bundle of encrypted artifacts (e-artifacts).
    current_bundle = '';
    bundle_size = 0;

    // Make sure the pass phrase is not empty. If it is, alert the user.
    if( passphrase === '' ){
        alert( 'Please set your passphrase for %%FULL_PROJECT_NAME%%.'+
            'Otherwise, we cannot run experiments!');
        on_error( 'No passphrase set.' );
        //B_DEBUG
        //CROWDLOGGER.debug.log( "Returning false...\n" );
        //E_DEBUG
        return false;
    }

    // Updates the current bundle and uploads it to the server if need be.
    var update_bundle = function( eartifact, count, i, force_upload ){
        //B_DEBUG
        //CROWDLOGGER.debug.log( "HEY! In update_bundle for job: " + job_id + "\n" );
        //E_DEBUG

        if( eartifact !== null ) {
            // Add the current e-artifact to the bundle.
            for( var j = 0; j < count; j++ ) {
                current_bundle += eartifact + '\n';
                bundle_size++;
            }
        }

        // Check if the bundle is too large and needs to be uploaded.
        if( bundle_size >= CROWDLOGGER.experiments.MAX_BUNDLE_SIZE ||
            ( force_upload !== undefined && force_upload ) ) {

            // Get the url of an anonymizer to send this bundle to.
            var url = CROWDLOGGER.experiments.anonymizers[
                Math.floor( Math.random(
                    CROWDLOGGER.experiments.anonymizers.length ) )]; 

            //B_DEBUG
            CROWDLOGGER.debug.log( 'Anonymizer: '+ url +'\n' );
            //CROWDLOGGER.debug.log( 'Data: '+ 
            //        encodeURIComponent(current_bundle)+ '\n' );
            //E_DEBUG
            
            CROWDLOGGER.io.network.send_data(
                url,
                'eartifacts=' + encodeURIComponent(current_bundle),
                function( response ){
                    //B_DEBUG
                    //CROWDLOGGER.debug.log('From experiment server: ' +
                    //    response + '\n');
                    //E_DEBUG
                    
                    // It's safe to reset the current bundle.
                    current_bundle = '';
                    bundle_size = 0;
   
                    // If the eartifact is null, then we we're done processing. 
                    if( eartifact !== null ) {
                        // Process the next one in 10ms. 
                        setTimeout( function(){
                                process_next_artifact( i+1 ); },
                            timeout );
                    }
                },
                function( error ) {
                    on_error( 'Error communicating with the experiment '+
                              'server. '+ error );
                },
                'POST'
            );
        } else {
            setTimeout( function(){
                process_next_artifact( i+1 ); },
             timeout );
        }
    };

    // Processes the artifact at the given index, or ends if i is out of 
    // bounds.
    process_next_artifact = function( i ){
        var encrypt_with_rsa;

        // If there are no more artifacts left, upload the latest bundle
        // and invoke the callback.
        if( i === artifacts.length ){
            update_bundle( null, 0, 0, true );
            on_completion();
            return true;
        }

        var artifact = artifacts[i];

        //B_DEBUG
        //CROWDLOGGER.debug.log( "packing artifact: " + JSON.stringify( artifact ) +
        //    "\n");
        //E_DEBUG

        encrypt_with_rsa = function( encrypted_data ){
            CROWDLOGGER.session_data.current_running_experiment_status.
                artifacts_processed++;
            CROWDLOGGER.session_data.current_running_experiment_status.
                message = Math.round( 100 * 1.0 *
                    CROWDLOGGER.session_data.current_running_experiment_status.
                        artifacts_processed /
                    CROWDLOGGER.session_data.current_running_experiment_status.
                        artifacts_to_process ) + "% completed"; 

            var when_encryption_is_done = function( eartifact ){
                var eartifact_json = JSON.stringify( eartifact );
                // Update the current bundle and upload it to the server if need
                // be.
                setTimeout( function(){
                    update_bundle( eartifact_json, artifact.count, i, false );
                }, timeout );
            };

            // USE RSA to encrypt a subset of the data returned above into 
            // a package for the server. The object returned on this line
            // contains: an RSA cipher text and an AES cipher text. The AES
            // cipher text contains: the primary and secondary cipher texts,
            // the users secret share, and the job id.
            CROWDLOGGER.secret_sharing.encrypt_for_server( 
                encrypted_data,
                CROWDLOGGER.secret_sharing.PUBLIC_KEY,
                when_encryption_is_done );
        };

        // Encrypt it, get it's share, etc.
        // Get the shares and encrypted primary/secondary fields.
        CROWDLOGGER.secret_sharing.generate_shares(
            artifact.primary_data, artifact.secondary_data,
            n, k, job_salt, job_id, passphrase, function( data ){
                setTimeout( function(){ encrypt_with_rsa( data );}, timeout );
            } );


        return true;
    }

    setTimeout( function(){ process_next_artifact( 0 ); }, timeout );
};



} // END CROWDLOGGER.experiments NAMESPACE
