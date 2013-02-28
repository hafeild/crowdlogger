/**
 * @fileOverview Provides the initialization for the search task assistant.
 * If you want to swap out any of the components, this is the place to do it.
 *
 * <p><i>
 * Copyright (c) 2010-2012      <br>
 * University of Massachusetts  <br>
 * All Rights Reserved
 * </i></p>
 * 
 * @author hfeild
 */

var staBackend, model, view, controller;

jQuery(document).ready(init);

// Initializes things. 
function init(){
    if( staBackend ){
        view = new View(jQuery, staBackend.searchModel);
        controller = new Controller(view, staBackend.searchModel);
        controller.init();
        jQuery(window).unload(function(){
            controller.destroy();
        });
    } else {
        opener.jQuery('#sta').trigger('load.window.sta');
    }
}