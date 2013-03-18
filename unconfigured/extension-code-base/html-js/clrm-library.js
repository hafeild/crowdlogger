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
    var init_elm = jQuery( '#init' );
    if( init_elm.html() === '' ){

    }
}

// Initialize the search for the CROWDLOGGER variable.
init_crowdlogger();


var add_listeners = function(){
    jQuery(document).on('click', '.app,.study', function(e){
        var target = jQuery(this);
        jQuery('.info').hide();
        jQuery('.info[data-clrmid='+target.attr('data-clrmid')+']').
            show({easing: 'clip', duration: 300});
    });
    jQuery(document).on('click', '.info .button', function(e){
        var target = jQuery(this);
        var clrmi_id = target.parent().attr('data-clrmid');
        if(target.attr('data-type') === 'install'){
            // Install.
        } else if(target.attr('data-type') === 'uninstall') {
            // Uninstall.
        } else {
            target.parent().hide({easing: 'slide', duration: 300});
        }
    });
};

jQuery('document').ready(add_listeners);
