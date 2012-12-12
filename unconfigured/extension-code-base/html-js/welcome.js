/**
 * @fileOverview Companion script for ../html/welcome.html. 
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */


var CROWDLOGGER;
var pages;
var frame;
var cur_page = -1;

// Used to help us keep track of whether the inner frame has been
// loaded.
window.frame_loaded = false;

/**
 * Checks if this page has been initialized yet. If so, it populates
 * the list of screens and initialization functions.
 */
function check_if_initialized(){
    // Each entry has the relative url of the page to load in the screen,
    // the initialization (on load) function, and a function that checks
    // if the given page should even be shown.
    pages = [
        ["welcome_first_page.html", 
            CROWDLOGGER.gui.study.pages.welcome.modify_start_page,
            function(){return true;}],
        ["consent_form.html",
            CROWDLOGGER.gui.study.pages.welcome.modify_consent_form,
            CROWDLOGGER.gui.study.pages.welcome.should_consent_form_be_shown], 
        ["registration.html",
            CROWDLOGGER.gui.study.pages.welcome.modify_registration_page, 
            CROWDLOGGER.gui.study.pages.welcome.should_registration_page_be_shown], 
        ["refer_a_friend.html",
            CROWDLOGGER.gui.study.pages.welcome.modify_refer_a_friend_page,
            CROWDLOGGER.gui.study.pages.welcome.should_refer_a_friend_page_be_shown],
        ["preferences.html",
            CROWDLOGGER.gui.study.pages.welcome.modify_preferences_page, 
            CROWDLOGGER.gui.study.pages.welcome.should_preference_page_be_shown],
        ["welcome_last_page.html", 
            CROWDLOGGER.gui.study.pages.welcome.modify_last_page,
            function(){return true;}]
    ];

    // Set the title with the appropriate version. If we cannot get
    // the version of the url, then we just don't set any version number
    // in the title (so it doesn't look weird).
    var version_elm = document.getElementById( "version" );
    var version = get_url_param( "version" );
    if( version !== "" ){
        version_elm.innerHTML = "version " + version;
    }
}

/**
 * Advances the welcome wizard to the next screen.
 */
function next(){
    if( !CROWDLOGGER || !pages ){
        //console.log( "." );
        setTimeout( next, 25 );
        return false;
    }

    if( !frame ){
        frame = document.getElementById( "frame" );
    }

    cur_page++;
    var loaded = false;
    frame_loaded = false;

    var set_timeout = function(){
        setTimeout( function(){ 
            on_frame_load();
        }, 1 );

    };

    /**
     * Called when the inner frame has loaded; this will initialize
     * the contents of that page with contents tailored to the 
     * Welcome Wizard.
     * @function
     */
    var on_frame_load = function(e){
        //dump( "frame_loaded: " + frame_loaded + "\n" );
        if( frame_loaded ){
            CROWDLOGGER.debug.log( "Loading frame page!" );
            pages[cur_page][1]( document, frame.contentDocument ) 
            //frame.removeEventListener( "load", function(){
            //on_frame_load(); }, false );
        } else {
            set_timeout();
        }
    };

    console.log("Cur page: "+ cur_page);
    CROWDLOGGER.debug.log( "Setting frame.src: " + pages[cur_page][0] +
        "\n" );

    // Confirm that we should be launching this page.
    if( pages[cur_page][2]() ){

        // If so, load the page.
        //frame.setAttribute( "onload", "dump(\"iframe loaded!\" )" );
        set_timeout(); 

        frame.setAttribute( "src",  pages[cur_page][0] );
    } else {
        console.log("Skipping page "+ cur_page);
        // Otherwise, advance to the next screen.
        next();
    }

//            pages[cur_page][1]( frame.contentDocument ) 

    return true;
}

/**
 * Sets the frame as loaded or not (based on the value parameter).
 * 
 * @param {boolean} value The value that should be given to frame_loaded.
 */
function set_frame_loaded( value ){
    frame_loaded = value;
}

/**
 * Closes the current window.
 */
function closewindow(){
    window.close();
}

// When the window loads, call 'next', which will advance the inner frame
// of the  wizard to the first page.
window.addEventListener( "load", next, false );

// Initialize the search for the CROWDLOGGER variable.
init_crowdlogger();