/**
 * @fileOverview The bootstrap initialization file for Firefox. This gets linked
 * to from the root Firefox directory.<p>
 * 
 * %%LICENSE%%
 * 
 * @author hfeild
 * @date 17-Dec-2012
 * @version %%VERSION%%
 */


const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/AddonManager.jsm')
const APP_SHELL_SERVICE = Cc['@mozilla.org/appshell/appShellService;1'].
    getService(Components.interfaces.nsIAppShellService);
const XUL_NS = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';

var that = this;
//var window = undefined;

var CROWDLOGGER;
var HTML_PATH = 'chrome://crowdlogger/content/html/';
var CSS_PATH = 'chrome/content/css/';
var CSS_FILES = ['crowdlogger.css'];

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


/**
 * Creates a new XUL element of the specified name and adds all of the given 
 * attributes.
 * 
 * @param {string} elm_name    The name of the element
 * @param {Object} attributes  A map of attributes.
 * @return {XUL element} The new XUL element.
 */
function create_xul_element(win, elm_name, attributes) {
    
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
    dump('In load_xul\n');

    var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                   .getService(Components.interfaces.nsIWindowMediator);
    var enumerator = wm.getEnumerator('navigator:browser');

    dump('Iterating over open windows\n')
    // Loop through each of the open windows and update the buttons.
    while(enumerator.hasMoreElements()) {
        var win = enumerator.getNext();
        dump('Calling load_xul_for_window on current window.\n')
        load_xul_for_window(win);
    }
    dump('Done with open windows.\n');
    wm.addListener(WindowListener);
}

function load_xul_for_window(win){
    // If this is the first window, initialize CrowdLogger.
    // if( !that.window ) {
    //     that.window = win;
    //     init_crowdlogger();
    // }

    if( win === that.win ){
        return;
    }

    // Find the toolbar menu.
    var toolbar_palette = 
        win.document.getElementById('nav-bar');

    // If the toolbar palette doesn't exist, it probably hasn't been
    // initialized yet. If CrowdLogger hasn't been completely initialized yet,
    // then some of the button onload listeners won't work, so  keep trying 
    // until both of these are ready.
    if(toolbar_palette === null || !CROWDLOGGER || !CROWDLOGGER.initialized ) {
        win.setTimeout(function(){load_xul_for_window(win)}, 100);
        return;
    }

    dump('In load_xul_for_window\n');
    dump('\ttoolbar_palette: '+ toolbar_palette +'\n');
    dump('\tCROWDLOGGER: '+ CROWDLOGGER +'\n');
    dump('\tCROWDLOGGER.initialized: '+ CROWDLOGGER.initialized +'\n');

    // Add the buttons to the palette.
    // Toolbar button, which goes on the palette.
    var crowdlogger_button = create_xul_element(win, 'toolbarbutton', {
        id:             'crowdlogger-start-button',
        tooltiptext:    'Toggle search activity logging.',
        label:          'Toggle Logging',
        // 'class':        'menu-iconic  crowdlogger-logging-off-button '+
        'class':        'menu-iconic crowdlogger-logging-off-icon',
                        //'menu-iconic  '+
                        //'chromeclass-toolbar-additional crowdlogger-logging-off-icon',
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

    crowdlogger_menu.appendChild(create_xul_element(win, 'iframe', {
        src: HTML_PATH +'chrome_menu.html',
        id: 'crowdlogger_menu_frame',
    }) );

    // Add menu items.
    // crowdlogger_menu.appendChild(create_xul_element(win, 'menuitem', {
    //     'class':        'menuitem-iconic crowdlogger-logging-off-button',
    //     id:             'crowdlogger-logging-button',
    //     tooltiptext:    'Start logging for CrowdLogger',
    //     label:          'Start logging',
    //     listeners: [['command', CROWDLOGGER.logging.toggle_logging]]
    // }));

    // crowdlogger_menu.appendChild(create_xul_element(win, 'menuitem', {
    //     'class':        'menuitem-iconic crowdlogger-settings-button',
    //     id:             'crowdlogger-register-button',
    //     tooltiptext:    'Register for CrowdLogger',
    //     label:          'Register',
    //     listeners: [['command', CROWDLOGGER.study.launch_registration_dialog]]
    // }));

    // crowdlogger_menu.appendChild(create_xul_element(win, 'menuitem', {
    //     'class':        'menuitem-iconic crowdlogger-refer-a-friend-button',
    //     id:             'crowdlogger-refer-a-friend-launch-button',
    //     tooltiptext:    'Refer a friend to download CrowdLogger',
    //     label:          'Refer a friend',
    //     listeners: [['command', CROWDLOGGER.study.launch_refer_a_friend_dialog]]
    // }));

    // crowdlogger_menu.appendChild(create_xul_element(win, 'menuitem', {
    //     'class':        'menuitem-iconic crowdlogger-settings-button',
    //     id:             'crowdlogger-settings-button',
    //     tooltiptext:    'Settings options for CrowdLogger',
    //     label:          'Settings',
    //     listeners: [['command', 
    //         CROWDLOGGER.gui.preferences.launch_preference_dialog]]
    // }));

    // crowdlogger_menu.appendChild(create_xul_element(win, 'menuitem', {
    //     'class':        'menuitem-iconic crowdlogger-show-messages-button',
    //     id:             'crowdlogger-show-status-page-button',
    //     tooltiptext:    'Show the study\'s status page',
    //     label:          'Go to status page',
    //     listeners: [['command', CROWDLOGGER.gui.study.pages.launch_status_page]]
    // }));

    // crowdlogger_menu.appendChild(create_xul_element(win, 'menuitem', {
    //     'class':        'menuitem-iconic crowdlogger-help-button',
    //     id:             'crowdlogger-help-button',
    //     tooltiptext:    'Information for CrowdLogger',
    //     label:          'Help',
    //     listeners: [['command', CROWDLOGGER.gui.study.pages.launch_help_page]]
    // }));

    win.CROWDLOGGER = CROWDLOGGER;
    CROWDLOGGER.logging.event_listeners.initialize(win);
}

function unload_xul(){
    var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                   .getService(Components.interfaces.nsIWindowMediator);
    wm.removeListener(WindowListener);

    var enumerator = wm.getEnumerator('navigator:browser');

    // Loop through each of the open windows and update the buttons.
    while(enumerator.hasMoreElements()) {
        var win = enumerator.getNext();
        remove_buttons_from_window(win, listeners_placed);
    }
}

function remove_buttons_from_window( win, listeners ) {
    var id, i;
    for( id in listeners ){
        var elm = win.document.getElementById(id);
        dump('Looking at id='+ id +'; elm: '+ elm +'\n');
        if( elm ){
            for(i = 0; i < listeners[id].length; i++){
                dump('\tremoving listener: '+ listeners[id][i][0] +'\n');
                elm.removeEventListener(
                    listeners[id][i][0], listeners[id][i][1]);
            }
            var x = elm.parentNode.removeChild(elm);
            dump('\tremoving element: '+ x +'\n');
        }
    }
    win.CROWDLOGGER = undefined;
}

function setTimeout(callback, delay) {
    var timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    timer.initWithCallback({ notify: callback }, delay,
                         Ci.nsITimer.TYPE_ONE_SHOT);
    return timer;
}

function initHiddenWindow(callback, addon){
    var hiddenWindow = APP_SHELL_SERVICE.hiddenDOMWindow;
    dump( 'hiddenWindow: '+ hiddenWindow +'\n' );
    if( hiddenWindow && hiddenWindow.document ){
        dump( 'hiddenWindow.document.readyState: '+ 
            hiddenWindow.document.readyState +'\n' );
    }
    if( hiddenWindow && hiddenWindow.document && 
            hiddenWindow.document.readyState === "complete" ){
        that.win = hiddenWindow;

        that.win.location.href = HTML_PATH+'chrome_main.html';

        //var browser = hiddenWindow.document.createElementNS(XUL_NS, 'browser')
        //var browser = hiddenWindow.document.createElement('iframe');
        //browser.setAttribute('src', HTML_PATH +'chrome_main.html');
        //hiddenWindow.document.documentElement.appendChild(browser);
        //that.win = browser.contentWindow;

        callback();
    } else {
        setTimeout(function(){ initHiddenWindow(callback,addon); }, 20);
    }
};

function initCrowdLogger(callback){
    dump('that.win.CROWDLOGGER?: '+ (that.win.CROWDLOGGER !== undefined) +'\n');
    if( that.win.CROWDLOGGER ){
        CROWDLOGGER = that.win.CROWDLOGGER;
        callback();
    } else {
        setTimeout(function(){initCrowdLogger(callback)}, 20);   
    }
}

function startup(data, reason) {
    //setTimeout(load_xul, 1500);
    //watchWindows(load_xul_for_window);
    AddonManager.getAddonByID(data.id, function(addon) {

        initHiddenWindow( function(){
            load_css(addon);
            initCrowdLogger(load_xul);
        }, addon );

        //dump('CROWDLOGGER enabled? : '+ CROWDLOGGER.enabled );
    });
}

function shutdown(data, reason) {
    CROWDLOGGER.enabled = false;

    // Uninstall all of the listeners placed by CROWDLOGGER.
    CROWDLOGGER.logging.event_listeners.uninstall_listener();

    // Remove all of the buttons.
    unload_xul();

    // Unset CROWDLOGGER.
    CROWDLOGGER = undefined;
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