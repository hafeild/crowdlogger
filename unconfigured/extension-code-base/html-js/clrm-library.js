/**
 * @fileOverview Companion script for ../html/clrm-library.html. 
 * 
 * %%LICENSE%%
 *
 * @author hfeild
 * @version %%VERSION%%
 */

var CROWDLOGGER, currentlyShownInfo = [undefined];

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

var onerror = function(e){
    alert('There was an error: '+ e);
}

var show_popup = function(message){
    jQuery('#message').html(message);
    jQuery('#popup').show();
}

var show_info = function(clrmElm){
    var info = clrmElm.parents('.clrm-container').find('.info');
    if( info[0] !== currentlyShownInfo[0] ){
        console.log('info !== currentlyShownInfo');
        console.log(info);
        console.log(currentlyShownInfo);
        if(currentlyShownInfo[0]){ currentlyShownInfo.hide(); }
        info.show({easing: 'clip', duration: 300});
        currentlyShownInfo = info;
    }
};

var add_listeners = function(){
    jQuery(document).on('click', '.clrm', function(e){
        show_info(jQuery(this));
    });

    jQuery(document).on('mouseover', '.clrm', function(e){
        show_info(jQuery(this));
    });

    jQuery(document).on('click', '.info button, .access button', function(e){
        var target = jQuery(this);
        var clrmid = target.parents('.clrm-container').attr('data-clrmid');
        var container = jQuery('.clrm-container[data-clrmid='+clrmid+']');
        var metadata = JSON.parse(container.attr('data-metadata')); 
        //JSON.parse(target.parent().attr('data-metadata'));
        switch( target.attr('data-type') ){
            // Install.
            case 'install':
                CROWDLOGGER.clrm.installCLRM(metadata, function(){
                    container.removeClass('not-installed').
                        addClass('installed');
                    CROWDLOGGER.clrm.enableCLRM(clrmid, function(){
                        container.removeClass('not-enabled').
                            addClass('enabled');
                    });
                });
                break;
            case 'enable':
                CROWDLOGGER.clrm.enableCLRM(clrmid, function(){
                    container.removeClass('not-enabled').addClass('enabled');
                }, function(e){
                    show_popup('There was an error enabling the CLRM: '+ e);
                });

                break;
            // Uninstall.
            case 'uninstall':
                if( metadata.localOnly ){
                    var response = confirm(
                        'This is a local-only app/study; once you remove it, '+
                        'you will not be able to reinstall it. Do you wish '+
                        'to remove it?');
                    if( !response ){
                        return;
                    }
                }
                CROWDLOGGER.clrm.uninstallCLRM(clrmid, function(){
                    if( metadata.localOnly ){
                        container.remove();
                    } else {
                       container.removeClass('installed').
                           addClass('not-installed');
                    }
                }), function(e){
                    show_popup('There was an error uninstalling the CLRM: '+ e);
                };
                break;

            case 'disable':
                CROWDLOGGER.clrm.disableCLRM(clrmid, function(){
                    container.removeClass('enabled').addClass('not-enabled');
                });

                break;

            case 'open':
                CROWDLOGGER.clrm.open(clrmid);
                break;

            case 'configure':
                CROWDLOGGER.clrm.configure(clrmid);
                break;


            case 'update':
                CROWDLOGGER.clrm.installCLRM(metadata, function(){
                    container.removeClass('not-installed').
                        addClass('installed');
                    CROWDLOGGER.clrm.disableCLRM(clrmid, function(){
                        container.removeClass('enabled').
                            addClass('not-enabled');
                        CROWDLOGGER.clrm.enableCLRM(clrmid, function(){
                            container.removeClass('not-enabled').
                                addClass('enabled');
                        });
                    });
                });
                break;

            // Dismiss.
            case 'dismiss':
                target.parent().hide({easing: 'slide', duration: 300});
                currentlyShownInfo = [undefined];
                break;

            default:
        }
    });

    jQuery(document).on('click', function(e){
        if( jQuery(e.target).parents('.clrm-container').length === 0 ){
            jQuery('.info').hide({easing: 'slide', duration: 300});
            currentlyShownInfo = [undefined];
        }
    });

    jQuery('#message-dismiss').click(function(){
        jQuery('#popup').hide();
    });
};

jQuery('document').ready(add_listeners);
