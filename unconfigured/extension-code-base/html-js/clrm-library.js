/**
 * @fileOverview Companion script for ../html/clrm-library.html. 
 * 
 * %%LICENSE%%
 *
 * @author hfeild
 * @version %%VERSION%%
 */

var CROWDLOGGER;

/**
 * Called when the page loads, after the CROWDLOGGER object is found.
 */
function check_if_initialized(){
    var initElm = jQuery( '#init' );
    if( initElm.html() === '' ){
        CROWDLOGGER.clrm.populateCLRMLibraryPage(document, function(){
            console.log('success!');
        }, function(e){ 
            console.log('Error: '+ e);
        });
        initElm.html('done');
    }
}

// Initialize the search for the CROWDLOGGER variable.
init_crowdlogger();



var add_listeners = function(){
    jQuery(document).on('click', '.clrm', function(e){
        var target = jQuery(this);
        jQuery('.info').hide();
        target.parents('.clrm-container').find('.info').
            show({easing: 'clip', duration: 300});
    });
    jQuery(document).on('click', '.info .button', function(e){
        var target = jQuery(this);
        var clrmiID = target.parent().attr('data-clrmid');
        if(target.attr('data-type') === 'install'){
            // Install.
            CROWDLOGGER.clrm.installCLRM(
                JSON.parse(target.parent().attr('data-metadata')),function(){
                jQuery('.clrm-container[data-clrmid='+clrmiID+']').
                    removeClass('not-installed').addClass('installed');
            });
        } else if(target.attr('data-type') === 'uninstall') {
            // Uninstall.
            CROWDLOGGER.clrm.uninstallCLRM(clrmiID, function(){
                jQuery('.clrm-container[data-clrmid='+clrmiID+']').
                    removeClass('installed').addClass('not-installed');
            });

        } else {
            target.parent().hide({easing: 'slide', duration: 300});
        }
    });
};

jQuery('document').ready(add_listeners);
