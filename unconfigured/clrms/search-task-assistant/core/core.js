/**
 * @fileOverview The core module for the Search Task Assistant CLRM.
 *
 * <p><i>
 * Copyright (c) 2010-2013      <br/>
 * University of Massachusetts  <br/>
 * All Rights Reserved
 * </i></p>
 * 
 * @author hfeild
 */

var RemoteModule = function(clrmPackage, clrmAPI ) {
    'use strict';

    var that = this, sta, initialized = false;

    this.id = "sta";

    this.init = function(){
        if(initialized){ return; }
        initialized = true;
        try{
            sta = new this.SearchTaskAssistant(clrmPackage, clrmAPI);
            sta.init();
        } catch(error) {
            clrmAPI.ui.log('Error while initializing STA: '+ error);
            clrmAPI.ui.log(error);
        }
    };

    this.unload = function(reason, oncomplete, onerror){

        switch(reason) {
            case 'uninstall':
                sta.unload(function(){
                    sta.uninstall(oncomplete, onerror);
                }, onerror);
                break;
            case 'newversion':
            case 'shutdown':
            case 'disable': 
            default:
                sta.unload(oncomplete, onerror);
        }
    };

    this.getMessage = function(){
        return 'Version '+ clrmPackage.metadata.version +
            '&mdash;No messages.';
    };

    this.open = function(){
        sta.launchSTAWindow();
    };

    this.configure = function(){
        sta.launchWindow('configure.html');
    };

    this.isOkayToUpdate = function(){
        return true;
    };

};