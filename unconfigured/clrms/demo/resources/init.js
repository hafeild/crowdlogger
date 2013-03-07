
// This gets set by our opener. It's our connection to the core CLRM.
var demoBackend;

/**
 * Initializes things. Takes care of contacting the opener if necessary.
 */
var init = function(){
    // If demoBackend has been set, we can go ahead and start things.
    if( demoBackend ){
        start();
    // If not, then the opener hasn't initialized this window yet, so we
    // need to send it a signal via our dedicated 'demo' node in the opener's
    // DOM.
    } else {
        opener.jQuery('#demo').trigger('load.window.demo', window);
    }
}

// When the document is ready, we can initialize things.
jQuery(document).ready(init);