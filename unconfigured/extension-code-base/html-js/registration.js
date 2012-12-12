/**
* @fileOverview Companion script for ../html/registration.html. 
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
    // This adds "PNA" to the associated text box.
    jQuery('.pna').click(function(){
        jQuery(this).prevAll('input').val('PNA');
        return false;
    });
    jQuery('.pna2').click(function(){
        document.registration[jQuery(this).attr('data-name')].value = 'PNA';
        return false;
    });

    jQuery('#register_button_enabled').click(function(){
        CROWDLOGGER.study.registration.submit(document, window);
        CROWDLOGGER.study.launch_refer_a_friend_dialog( true ); 
        return false;
    });
}

/**
 * Called when we have found the CROWDLOGGER object. 
 * Checks if this page has been initialized yet and adds the listeners.
 */
function check_if_initialized(){
    var init_elm = document.getElementById( "init" );
    CROWDLOGGER.debug.log( "init_elm: " + init_elm.innerHTML + "\n" );
    if( init_elm && ( init_elm.innerHTML === "" ||
                      init_elm.innerHTML === "no listeners" ) ){
        init_listeners();
    }
}

/**
 * This will add listeners to the form to check if the register button 
 * should be dis/en-abled.
 */
function init_listeners(){
    var buttons = [document.getElementById( "register_button_enabled" ),
                  document.getElementById( "register_button_disabled" )];

    window.addEventListener( "change", function(){
        if( CROWDLOGGER ){
            CROWDLOGGER.study.registration.check_form( document, buttons );
        }
    }, false );
    window.addEventListener( "command", function(){
        if( CROWDLOGGER ){
            CROWDLOGGER.study.registration.check_form( document, buttons );
        }
    }, false );
    window.addEventListener( "click", function(){
        if( CROWDLOGGER ){
            CROWDLOGGER.study.registration.check_form( document, buttons );
        }
    }, false );

}

// Initialize the search for the CROWDLOGGER variable.
init_crowdlogger();
