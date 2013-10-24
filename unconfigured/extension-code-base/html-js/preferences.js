/**
 * @fileOverview Companion script for ../html/preferences.html. 
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

var CROWDLOGGER;

jQuery(document).ready(function(){
    add_listeners();
});

// Add click listeners to the buttons.
function add_listeners() {

    jQuery('body').on('click', 'button', function(e){
        var eElm = jQuery(e.currentTarget);
        switch(e.currentTarget.id){
            case 'save_button':
                CROWDLOGGER.gui.preferences.submit_preferences( document ); 
                break;
            case 'save_and_close_button':
                CROWDLOGGER.gui.preferences.submit_preferences(document,window);
                break;
            default:
                if(eElm.hasClass('add-repository')){
                    var textBox = eElm.siblings('.url');
                    try{
                        CROWDLOGGER.clrm.addRepository( textBox.val() );
                    } catch(e) {
                        console.log(e);
                    }
                    displayCLRMRepository( textBox.val() );
                    textBox.val('');
                } else if(eElm.hasClass('remove-repository')) {
                    var elm = eElm.parents('.repository'),
                        repoURL = elm.find('.repository-name').html();
                    CROWDLOGGER.clrm.removeRepository(repoURL);
                    elm.remove();
                } else {
                    //return true;
                }
        }
        return false;
    });

    // Make the remove buttons appear when the user hovers over the
    // repository entries.
    jQuery('body').on('mouseenter', '.repository', function(){
        jQuery(this).find('button').show();
    }).on('mouseleave', '.repository', function(){
        jQuery(this).find('button').hide();
    });
}

// Checks if this page has been initialized yet.
function check_if_initialized(){
    var init_elm = document.getElementById( "init" );
    if( init_elm && init_elm.innerHTML === "" ){
        CROWDLOGGER.gui.preferences.refresh_preference_page( document );
        displayAllRegisteredCLRMRepositories();
    }
}

/**
 * Updates the display, adding the given repository URL entry.
 *
 * @param {string} repoURL      The URL of the repository.
 * @param {bool}   removeButton Whether the remove button should be deleted.
 */
function displayCLRMRepository( repoURL, removeButton ) {
    // Clone a the template.
    var elm = jQuery('#template-repository-entry').clone();

    // Add the information.
    elm.attr('id', '');
    elm.find('.repository-name').html(repoURL);
    elm.removeClass('hidden');
    if( removeButton ){
        elm.find('button').remove();
    }

    // Add it to the list of registered repos.
    jQuery('#installed-repositories').append(elm);
}

/**
 * Displays all currently registered repositories.
 */
function displayAllRegisteredCLRMRepositories(){
    // The CrowdLogger repo cannot be removed.
    displayCLRMRepository( 
        CROWDLOGGER.io.network.get_server_url('clrm_listing_url'), true );

    var repos = JSON.parse(
        CROWDLOGGER.preferences.get_char_pref('clrm_repositories'));
    var i;

    for(i = 0; i < repos.length; i++){
        displayCLRMRepository(repos[i]);
    }
}

// Initialize the search for the CROWDLOGGER variable.
init_crowdlogger();
