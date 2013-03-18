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

var CROWDLOGGER;

const HTML_PATH = 'chrome://crowdlogger/content/html/';
const CSS_PATH = 'chrome/content/css/';
const CSS_FILES = ['crowdlogger.css'];
const MENU = HTML_PATH +'menu.html';
const BACKGROUND_PAGE = HTML_PATH+'background.html';

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
    if( win === that.win ){
        return;
    }

    // Find the toolbar menu.
    var toolbar_palette = win.document.getElementById('nav-bar');
    var i, tabbrowser = win.gBrowser;

    // If the toolbar palette doesn't exist, it probably hasn't been
    // initialized yet. If CrowdLogger hasn't been completely initialized yet,
    // then some of the button onload listeners won't work, so  keep trying 
    // until both of these are ready.
    if(toolbar_palette === null || !CROWDLOGGER || !CROWDLOGGER.initialized ) {
        win.setTimeout(function(){load_xul_for_window(win)}, 100);
        return;
    }

    // Add the buttons to the palette.
    // Toolbar button, which goes on the palette.
    var crowdlogger_button = create_xul_element(win, 'toolbarbutton', {
        id:             'crowdlogger-start-button',
        tooltiptext:    'Toggle search activity logging.',
        label:          'Toggle Logging',
        'class':        'menu-iconic crowdlogger-logging-off-icon',
        type:           'menu',
        listeners:    [['load', CROWDLOGGER.gui.buttons.update_logging_buttons]]
    });

    // The toolbar menu -- holds all of the items (added next).
    // var crowdlogger_menu = create_xul_element(win, 'menupopup', {
    var crowdlogger_menu = create_xul_element(win, 'panel', {
        id:             'crowdloggertoolbarmenupopup',
        height: 'auto',
        width: 'auto',
        tooltiptext: ''
    });

    // This ties together each of the elements defined above.
    toolbar_palette.appendChild(crowdlogger_button);
    crowdlogger_button.appendChild(crowdlogger_menu);

    crowdlogger_menu.appendChild(create_xul_element(win, 'iframe', {
        // Add a bit of randomness to ensure a fresh load.
        src: MENU+'?time='+new Date().getTime(),
        id: 'crowdlogger-menu-frame',
        height: '100%',
        width: '100%',
        scrolling: 'no'
    }) );

    win.CROWDLOGGER = CROWDLOGGER;

    // Reconnect any open dialog windows.
    for(i = 0; i < tabbrowser.browsers.length; i++){
        var tab = tabbrowser.getBrowserAtIndex(i);
        var tab_win = tab.contentWindow;
        if( tab_win.location.href.indexOf(HTML_PATH) === 0 ){
            try{
                if( tab_win.document.readyState === "complete" ){
                    tab_win.CROWDLOGGER = CROWDLOGGER;
                    tab_win.init();
                } else {
                    tab_win.location.reload();
                    CROWDLOGGER.debug.log('Adding listener ######');
                    tab.addEventListener('load', function(){
                        CROWDLOGGER.debug.log('Dialog loaded; connected!');
                        tab.contentWindow.CROWDLOGGER = CROWDLOGGER;
                        tab.contentWindow.init();
                    }, true);
                };
            } catch(e) {
                tab_win.close();
            }
        }
    }

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
        that.win.location.href = BACKGROUND_PAGE;
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
    CROWDLOGGER.debug.log('In shutdown function...');
    CROWDLOGGER.gui.windows.close_all_dialogs();

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