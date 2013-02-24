
// This gets set by our opener. It's our connection to the core CLRM.
var demoBackend;

/**
 * Initializes things. Takes care of contacting the opener if necessary.
 */
var init = function(){
    // If demoBackend has been set, we can go ahead and set our button.
    if( demoBackend ){
        addButton();
    // If not, then the opener hasn't initialized this window yet, so we
    // need to send it a signal via our dedicated 'demo' node in the opener's
    // DOM.
    } else {
        opener.jQuery('#demo').trigger('load.window.demo', window);
    }
}

/**
 * Adds buttons that, when clicked, open either a small or medium window.
 */
var addButton = function(){
    jQuery('<button>Open a small-sized window!</button>').
        click(demoBackend.launchSmallWindow).
        appendTo('body');
    jQuery('<button>Open a medium-sized window!</button>').
        click(demoBackend.launchMediumWindow).
        appendTo('body');
}

// When the document is ready, we can initialize things.
jQuery(document).ready(init);