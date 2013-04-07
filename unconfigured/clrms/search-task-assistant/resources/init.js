/**
 * @fileOverview Provides the initialization for the search task assistant.
 * If you want to swap out any of the components, this is the place to do it.
 *
 * <p><i>
 * Copyright (c) 2010-2013      <br>
 * University of Massachusetts  <br>
 * All Rights Reserved
 * </i></p>
 * 
 * @author hfeild
 */

var sta, model, view, controller;

jQuery(document).ready(init);

// Initializes things. 
function init(){
    if( sta && start ){
        start();
    } else if(opener) {
        opener.jQuery('#sta').trigger('load.window.sta', window);
    } else {
        window.close();
    }
}