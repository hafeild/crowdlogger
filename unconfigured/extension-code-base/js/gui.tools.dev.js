/**
 * @fileOverview Provides functions to aid the development of CrowdLogger.<p>
 * 
 * See the  CROWDLOGGER.gui.tools.dev namespace.<p>
 * 
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

if( CROWDLOGGER.gui.tools.dev === undefined ){

/**
 * @namespace Provides functionality to display data taken from a user's
 * activity log
 */
CROWDLOGGER.gui.tools.dev = {};


/**
 * Launches the development tools page.
 */
CROWDLOGGER.gui.tools.dev.launch = function(doc){
    // The page to load.
    var page = CROWDLOGGER.preferences.get_char_pref(
        'dev_tools_url', 'not_found.html' );
            
    // The prefix for the extension's html files.
    var extension_prefix = CROWDLOGGER.version.info.get_extension_html_prefix();
        
    // The full url.
    var url = extension_prefix + page;  

    if( doc === undefined ){
        // Open the window and call the handler when the page loads.
        CROWDLOGGER.gui.windows.open_dialog( url, 'dev-tools',
            CROWDLOGGER.gui.tools.dev.populate_page );
    } else {
        CROWDLOGGER.gui.tools.dev.populate_page( doc );
    }

};

CROWDLOGGER.gui.tools.dev.populate_page = function(doc){
    CROWDLOGGER.debug.log("Populating Dev Tool page.\nGetting jQuery object...");

    var jq = doc.defaultView.jQuery;
    if( jq('#init').html() == '' ){
        jq('#init').html('done');

        CROWDLOGGER.debug.log('got it!\nPopulating the extractors section...');

        // Populate each section.
        CROWDLOGGER.gui.tools.dev.populate_extraction_section(jq);
        CROWDLOGGER.gui.tools.dev.populate_experiments_central(jq);

        CROWDLOGGER.debug.log('done!\n');
    }
};

CROWDLOGGER.gui.tools.dev.populate_extraction_section = function(jq){
    var section = jq('#artifact-extractors');

    jq.each(CROWDLOGGER.experiments.artifact_extractors.extractors, 
            function(extractor, func) {

        CROWDLOGGER.debug.log('Adding extractor: '+ extractor +'\n');
        var output_id = extractor+'-output'

        CROWDLOGGER.util.format_entry(jq, function(){
            CROWDLOGGER.experiments.artifact_extractors.run_extractor(
                extractor, function(artifacts){
                    CROWDLOGGER.debug.log('Adding contents to '+output_id+'\n');
                    section.find('#'+output_id).html(
                        CROWDLOGGER.util.make_table(artifacts)
                    );
                }
            )
        }, extractor, '<div id="'+ output_id +'"></div>').appendTo(section);
    });

    CROWDLOGGER.debug.log('Section html: '+ section.html() +'\n');
};

CROWDLOGGER.gui.tools.dev.populate_experiments_central = function(jq){
    jq('#pass_phrase').val(
        CROWDLOGGER.preferences.get_char_pref('pass_phrase',''));
}

CROWDLOGGER.gui.tools.dev.set_passphrase = function(pass_phrase){
    CROWDLOGGER.preferences.set_char_pref('pass_phrase', pass_phrase);
};

CROWDLOGGER.gui.tools.dev.clear_experiments = function(){
    CROWDLOGGER.preferences.set_char_pref('last_ran_experiment_id', '');
    CROWDLOGGER.preferences.set_char_pref('ran_experiments', '{}');
};

CROWDLOGGER.gui.tools.dev.check_for_experiments = function(){
    CROWDLOGGER.experiments.check_for_new_experiments(0,
        false, CROWDLOGGER.experiments.handle_new_experiments, 
        function(){} );

};

}