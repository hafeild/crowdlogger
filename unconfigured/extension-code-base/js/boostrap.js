/**
 * @fileOverview The bootstrap initialization file for Firefox. This gets linked
 * to from the root Firefox directory.<p>
 * 
 * 1.7.3
 * 
 * @author hfeild
 * @date 17-Dec-2012
 * @version 1.7.3 
 */

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/AddonManager.jsm')

var that = this;
//var window = undefined;

var CROWDLOGGER;

var CSS_PATH = 'chrome/content/css/';
var CSS_FILES = [
 'crowdlogger.css',
 'dialog.css'
];
var JS_PATH = 'chrome/content/js/';
var JS_FILES = [
    'external_lib/jquery.min.js',
    //'external_lib/jquery-ui.min.js',
    'main.js',
    'version.info.js',
    'debug.js',
    'io.network.js',
    // 'io.file.js',
    // 'io.web_sql.js',
    'io.indexed_db.js',
    'preferences.js',
    'version.util.js',
    'preferences.defaults.js',
    'logging.js',
    'uninstall.js',
    'experiments.js',
    'gui.buttons.js',
    'session_data.js',
    'study.js',
    'gui.windows.js',
    'io.log.js',
    'logging.event_listeners.js',
    'gui.tools.js',
    'gui.tools.dev.js',
    'gui.notifications.js',
    'notifications.js',
    'gui.study.pages.js',
    'gui.preferences.js',
    'study.registration.js',
    'util.js',
    'gui.study.pages.welcome.js',
    'experiments.artifact_extractors.js',

    // Crypto libraries.
    'external_lib/bignumber.js',
    'external_lib/pidcrypt/jsbn.js',
    'external_lib/pidcrypt/pidcrypt.js',
    'external_lib/pidcrypt/pidcrypt_util.js',
    'external_lib/pidcrypt/sha1.js',
    'external_lib/pidcrypt/sha256.js',
    'external_lib/pidcrypt/md5.js',
    'external_lib/pidcrypt/aes_core.js',
    'external_lib/pidcrypt/aes_cbc.js',
    'external_lib/pidcrypt/asn1.js',
    'external_lib/pidcrypt/rng.js',
    'external_lib/pidcrypt/prng4.js',
    'external_lib/pidcrypt/rsa.js',
    'ssss.js',
    'log.operations.js'
];

// A map of ids to an array of 2-d elements.
// The first is a type and the second is a function. 
var listeners_placed = {};

(function(scope){ 
    scope.include =  function(path){
        Services.scriptloader.loadSubScript(path, this);
    };
})(this);

function load_css(addon){
    var css = Components.classes["@mozilla.org/content/style-sheet-service;1"].
        getService(Components.interfaces.nsIStyleSheetService);
    var i; 
    for(i = 0; i < CSS_FILES.length; i++) {
        css.loadAndRegisterSheet(addon.getResourceURI(CSS_PATH + CSS_FILES[i]),
            css.USER_SHEET);
    }
}

function load_js(addon){
    var i; 
    for(i = 0; i < JS_FILES.length; i++) {
        Services.scriptloader.loadSubScript(
            addon.getResourceURI(JS_PATH + JS_FILES[i]).spec, that.window);
        //include(addon.getResourceURI(JS_PATH + JS_FILES[i]).spec);
    }
}

/**
 * Creates a new XUL element of the specified name and adds all of the given 
 * attributes.
 * 
 * @param {string} elm_name    The name of the element
 * @param {Object} attributes  A map of attributes.
 * @return {XUL element} The new XUL element.
 */
function create_xul_element(win, elm_name, attributes) {
    const XUL_NS = 
        'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
    var i, elm = win.document.createElementNS(XUL_NS, elm_name), attr, listener;
    for(attr in attributes){ 
        if( attr !== 'listeners' ){
            elm.setAttribute(attr, attributes[attr]);
        } 
    }

    var listeners = attributes.listeners ? attributes.listeners : [];
    for(i = 0; i < listeners.length; i++) {
        elm.addEventListener(listeners[i][0], listeners[i][1]);
    }
    listeners_placed[attributes.id] = listeners;

    return elm;
}

function load_xul(){
    var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                   .getService(Components.interfaces.nsIWindowMediator);
    var enumerator = wm.getEnumerator('navigator:browser');

    // Loop through each of the open windows and update the buttons.
    while(enumerator.hasMoreElements()) {
        var win = enumerator.getNext();
        load_xul_for_window(win);
    }
    wm.addListener(WindowListener);
}

function load_xul_for_window(win){
    // If this is the first window, initialize CrowdLogger.
    if( !that.window ) {
        that.window = win;
        init_crowdlogger();
    }

    // Find the toolbar menu.
    var toolbar_palette = 
        win.document.getElementById('nav-bar');

    // If the toolbar palette doesn't exist, it probably hasn't been
    // initialized yet. If CrowdLogger hasn't been completely initialized yet,
    // then some of the button onload listeners won't work, so  keep trying 
    // until both of these are ready.
    if(toolbar_palette === null || !CROWDLOGGER.initialized ) {
        win.setTimeout(function(){load_xul_for_window(win)}, 10);
        return;
    }

    // var style = win.document.createProcessingInstruction('xml-stylesheet',
    //     'id="crowdlogger-css", type="text/css", '+
    //     'href="chrome://crowdlogger/content/css/crowdlogger.css"');
    // win.document.insertBefore(style, win.document.documentElement);

    // Add the buttons to the palette.
    // Toolbar button, which goes on the palette.
    var crowdlogger_button = create_xul_element(win, 'toolbarbutton', {
        id:             'crowdlogger-start-button',
        tooltiptext:    'Toggle search activity logging.',
        label:          'Toggle Logging',
        'class':        'menu-iconic  crowdlogger-logging-off-button '+
                        'chromeclass-toolbar-additional',
        type:           'menu',
        listeners:    [['load', CROWDLOGGER.gui.buttons.update_logging_buttons]]
    });

    // The toolbar menu -- holds all of the items (added next).
    var crowdlogger_menu = create_xul_element(win, 'menupopup', {
        id:             'crowdloggertoolbarmenupopup'
    });

    // This ties together each of the elements defined above.
    toolbar_palette.appendChild(crowdlogger_button);
    crowdlogger_button.appendChild(crowdlogger_menu);

    // Add menu items.
    crowdlogger_menu.appendChild(create_xul_element(win, 'menuitem', {
        'class':        'menuitem-iconic crowdlogger-logging-off-button',
        id:             'crowdlogger-logging-button',
        tooltiptext:    'Start logging for CrowdLogger',
        label:          'Start logging',
        listeners: [['command', CROWDLOGGER.logging.toggle_logging]]
    }));

    crowdlogger_menu.appendChild(create_xul_element(win, 'menuitem', {
        'class':        'menuitem-iconic crowdlogger-settings-button',
        id:             'crowdlogger-register-button',
        tooltiptext:    'Register for CrowdLogger',
        label:          'Register',
        listeners: [['command', CROWDLOGGER.study.launch_registration_dialog]]
    }));

    crowdlogger_menu.appendChild(create_xul_element(win, 'menuitem', {
        'class':        'menuitem-iconic crowdlogger-refer-a-friend-button',
        id:             'crowdlogger-refer-a-friend-launch-button',
        tooltiptext:    'Refer a friend to download CrowdLogger',
        label:          'Refer a friend',
        listeners: [['command', CROWDLOGGER.study.launch_refer_a_friend_dialog]]
    }));

    crowdlogger_menu.appendChild(create_xul_element(win, 'menuitem', {
        'class':        'menuitem-iconic crowdlogger-settings-button',
        id:             'crowdlogger-settings-button',
        tooltiptext:    'Settings options for CrowdLogger',
        label:          'Settings',
        listeners: [['command', 
            CROWDLOGGER.gui.preferences.launch_preference_dialog]]
    }));

    crowdlogger_menu.appendChild(create_xul_element(win, 'menuitem', {
        'class':        'menuitem-iconic crowdlogger-show-messages-button',
        id:             'crowdlogger-show-status-page-button',
        tooltiptext:    'Show the study\'s status page',
        label:          'Go to status page',
        listeners: [['command', CROWDLOGGER.gui.study.pages.launch_status_page]]
    }));

    crowdlogger_menu.appendChild(create_xul_element(win, 'menuitem', {
        'class':        'menuitem-iconic crowdlogger-help-button',
        id:             'crowdlogger-help-button',
        tooltiptext:    'Information for CrowdLogger',
        label:          'Help',
        listeners: [['command', CROWDLOGGER.gui.study.pages.launch_help_page]]
    }));
}


function startup(data, reason) {
    //setTimeout(load_xul, 1500);
    //watchWindows(load_xul_for_window);
    AddonManager.getAddonByID(data.id, function(addon) {

        that.init_crowdlogger = function(){
            dump('initializing...\n');
            load_js(addon);
            that.window.CROWDLOGGER.initialize();
            dump('done initializing\n');
            CROWDLOGGER = that.window.CROWDLOGGER;
        };

        load_css(addon);
        load_xul();
    });
}

function shutdown(data, reason) {

}

function install(data, reason) {
    //startup(data, reason);
}

function uninstall(data, reason) {

}

var WindowListener = {
  // nsIWindowMediatorListener functions
  onOpenWindow: function(xulWindow) {
    // A new window has opened
    let domWindow = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                             .getInterface(Ci.nsIDOMWindowInternal);

    // Wait for it to finish loading
    domWindow.addEventListener('load', function listener() {
      domWindow.removeEventListener('load', listener, false);

      // If this is a browser window then setup its UI
      if (domWindow.document.documentElement.getAttribute('windowtype') === 
                'navigator:browser')
        load_xul_for_window(domWindow);
    }, false);
  },

  onCloseWindow: function(xulWindow) {
  },

  onWindowTitleChange: function(xulWindow, newTitle) {
  }
};