/**
 * @fileOverview Companion script for ../html/consent_form.html. 
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */


var CROWDLOGGER;

jQuery(document).ready(function(){
    // Add listeners on the agree/decline buttons.
    jQuery("#agree_button").click(on_accept);
    jQuery("#decline_button").click(on_reject);
});

/**
 * Called when the CROWDLOGGER variable is found; currently not really 
 * needed.
 */
function check_if_initialized(){
}  

/**
 * Called when the user clicks on "I Agree". Sends a message to
 * the server saying that the user has accepted the consent form.
 */
function on_accept(){
    if( CROWDLOGGER ){
        CROWDLOGGER.study.user_accepted_consent_form();
        window.close();
    } else {
        setTimeout( on_accept, 5 );
    }
}

function read_form(){
    var agree_button = document.getElementById( "agree_button" );
    if( agree_button ){
        var classes = agree_button.getAttribute( "class" );
        classes = classes.replace( /\bdisabled\b/, " " );
        agree_button.setAttribute( "class", classes );
        agree_button.setAttribute( "onclick", "on_accept()");
        
    }
}

/**
 * Called when the user clicks the "I do not agree" button.
 */
function on_reject(){
    window.close();
}

// Initialize the search for the CROWDLOGGER variable.
init_crowdlogger();
