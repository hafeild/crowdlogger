/**
 * @fileOverview The backend for the Search Task Assistant.
 *
 * <p><i>
 * Copyright (c) 2010-2013      <br/>
 * University of Massachusetts  <br/>
 * All Rights Reserved
 * </i></p>
 * 
 * @author hfeild
 */

RemoteModule.prototype.SearchTaskAssistant = function(clrmPackage, clrmAPI){

    'use strict';

    // Private variables.
    var that = this,
        windowSpecs = {
            width: 200,
            height: 800,
            location: 'no',
            status: 'no',
            toolbar: 'no'
        },
        isRunning = true,
        openWindows = [];
        

    // Private function declarations.
    var initializeWindow, onWindowUnloaded, closeWindows;

    // Public variables.
    this.isDisplayed = false; this.windowID = 'STA'; this.staWindow;
        this.staWindowSpecs = {
            width: 200,
            height: 800,
            location: 'no',
            status: 'no',
            toolbar: 'no'
        };

    // Public function declarations.
    this.init; this.launchSTAWindow; this.processHisotry;
    this.log = clrmAPI.ui.log;

    // Private function definitions.
    /**
     * Initializes a window, including giving it access to the current
     * STA instance (sta).
     * 
     * @param {Window} win  A reference to the STA window.
     */
    initializeWindow = function(win){
        win.sta = that;
        win.addEventListener('unload', onWindowUnloaded);
        openWindows[win.name] = win;
        win.start();
    };

    /**
     * Called whenever a window unloads.
     */
    onWindowUnloaded = function(e){
        delete openWindows[e.target.name];
    };

    /**
     * Closes all open windows.
     */
    closeWindows = function(){
        var name;
        for(name in openWindows){
            openWindows[name].close();
            delete openWindows[name];
        }
    };

    // Public function definitions.
    /**
     * Initializes things.
     */
    this.init = function(){
        that.log('[search-task-assitant.js] Initializing STA');

        // Just in case we left something behind on an botched unload...
        jQuery('#sta').remove(); 

        // Add a new element to the current window. The STA window, when it
        // comes to life, can communicate with us through that element.
        that.messages = jQuery('<div id="sta"></div>').appendTo('body');
        that.messages.on('load.window.sta', function(event, win){
            initializeWindow(win);
        });

        that.log('[search-task-assitant.js] '+
            'Finished creating a messaging element: <div id="sta">');

        that.log('[search-task-assitant.js] Creating the utils...');
        that.util = new that.Util(that);

        that.log('[search-task-assitant.js] '+
            'Creating the search task identifier...');
        that.searchTaskIdentifier = new that.SearchTaskIdentifier( that );

        that.log('[search-task-assitant.js] Creating the search task model...');
        that.searchTaskModel = new that.SearchTaskModel( that, clrmAPI );
        that.log('[search-task-assitant.js] '+
            'Initializing the search task model...');
        that.searchTaskModel.init();

        that.log('[search-task-assitant.js] Finished initializing!');
    };


    /**
     * Launches the STA window. If the window already exists, then it is 
     * brought into focus.
     */
    this.launchSTAWindow = function(){ 
        that.launchWindow('search-task-assistant.html');
    };

    /**
     * Launches a medium Demo window. If the window already exists, then it is 
     * brought into focus.
     *
     * @param {string} url     The URL of the resource to open.
     */
    this.launchWindow = function(url, callback){ 
        if( openWindows[url] && !openWindows[url].closed ){
            openWindows[url].focus();
        } else {
            clrmAPI.ui.openWindow({
                content: clrmPackage.html[url],
                resources: clrmPackage,
                name: url,
                specsMap: windowSpecs,
                callback: function(win){
                    openWindows[win.name] = win;
                    if(callback){ callback(win); }
                }
            });
        }
    };

    /**
     * Forces all unsaved data to be saved, open STA windows to be closed, 
     * and listeners to be removed.
     *
     * @param {function} oncomplete     A function to invoke when all cleanup
     *                                  steps have completed.
     * @param {function} onerror        Invoked if an error is encountered.
     */
    this.unload = function(oncomplete, onerror){
        isRunning = false;
        closeWindows();
        that.messages.off('load.sta');
        that.messages.remove();
        that.searchTaskModel.unload();
        oncomplete();
    };

    /**
     * Removes all databases.
     *
     * @param {function} oncomplete     A function to invoke when all cleanup
     *                                  steps have completed.
     * @param {function} onerror        Invoked if an error is encountered.
     */
    this.uninstall = function(oncomplete, onerror){
        clrmAPI.storage.removeDatabase();
        if( oncomplete ){ oncomplete(); }
    };

    /**
     * Gets the stored value for the 'process-history' preference. Defaults to
     * <code>false</code>.
     * 
     * @param {function} onsuccess   Invoked when the preference value is 
     *                               retrieved. The value is the only parameter.
     * @param {function} onerror     Invoked if there is an error.
     */
    this.processHisotry = function(onsuccess, onerror){
        return clrmAPI.storage.preferences.get({
            pref: 'process-history', 
            defaultValue: false,
            on_success: onsuccess,
            on_error: onerror
        });
    };
};
