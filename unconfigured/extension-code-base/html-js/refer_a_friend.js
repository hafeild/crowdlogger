/**
* @fileOverview Companion script for ../html/refer_a_friend.html. 
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

// Places listeners on buttons.
function add_listeners(){
    jQuery('.refreshlink a').click(function(){
        window.open('', '_self', ''); window.close(); 
        return false;
    });

    jQuery('#send_auto_email').click(function(){
        CROWDLOGGER.gui.study.pages.send_auto_email(
            document, document.forms.auto_email);
    });

    jQuery('#copy_to_clipboard').click(function(){
        CROWDLOGGER.util.copy_to_clipboard(document.forms.email.email_box);
    });
}

// In FF, launches a custom event (crowdlogger_status_page_refresh) that
// the %%PROJECT_NAME%% extension is listening for. In Chrome, refreshes
// via the CROWDLOGGER object directly.
function refresh_page(){
    if( CROWDLOGGER !== undefined ){
        
        //CROWDLOGGER.gui.study.pages.refresh_status_page(document);
    }
        /*
        var refresh_event = document.createEvent( "Event" );
        refresh_event.initEvent( "crowdlogger_status_page_refresh", 
            true, false);
        refresh_event.doc = document;
        document.dispatchEvent( refresh_event );
        */
}

// Checks if this page has been initialized yet.
function check_if_initialized(){
    var init_elm = document.getElementById( "init" );
    if( init_elm ){
/*                alert( init_elm.innerHTML );
        if( init_elm.innerHTML === "" ){
            var form = document.forms['auto_emails'];
            var form_elms = [form.sender, form.emails];
            if( CROWDLOGGER.preferences.get_bool_pref( 
                    "registered", false ) ){
                for( input in form_elms ){
                    input.disabled = false;
                    alert( input );
                }
            }
            init_elm.innerHTML = "done";
        }
*/
    }

    var use_server_email = %%USE_SERVER_EMAIL%%;
    if( use_server_email  ) {
        document.getElementById("email_disabled").style.display="none";
    } else {
        document.getElementById("email_enabled").style.display="none";
        document.forms['auto_email'].style.display = "none";
    }

}

// Initialize the search for the CROWDLOGGER variable.
init_crowdlogger();