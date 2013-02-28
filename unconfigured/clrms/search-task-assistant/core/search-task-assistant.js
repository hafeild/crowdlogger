


RemoteModule.prototype.SearchTaskAssistant = function( api, sta, clrmPackage ){

    // Private variables.
    var that = this,
        specs = {
            width: 200,
            height: 800,
            location: 'no',
            status: 'no',
            toolbar: 'no'
        }
        elm;

    // Private function declarations.
    var initializeSTAWindow, onSTAWindowUnloaded;

    // Public variables.
    this.isDisplayed = false; this.windowID = 'STA'; this.staWindow;

    // Public function declarations.
    this.init, this.launchSTAWindow;

    // Private function definitions.

    /**
     * Initializes the STA window, including giving it access to the current
     * STA instance (sta).
     * 
     * @param {Window} win  A reference to the STA window.
     */
    initializeSTAWindow = function(win){
        that.staWindow = win;
        win.staBackend = sta;
        win.init();
    };

    /**
     * Called whenever the STA window unloads.
     */
    onSTAWindowUnloaded = function(){
        that.isDisplayed = false;
    };


    // Public function definitions.

    /**
     * Initializes things.
     */
    this.init = function(){
        // Add a new element to the current window. The STA window, when it
        // comes to life, can communicate with us through that element.
        elm = jQuery('<div id="sta"></div>').appendTo('body');
        elm.on('load.window.sta', function(event, win){
            that.isDisplayed = true;
            initializeSTAWindow(win);
        });
    };


    /**
     * Launches the STA window. If the window already exists, then it is 
     * brought into focus.
     */
    this.launchSTAWindow = function(){ 
        if( that.isDisplayed ) {
            that.staWindow.focus();
        } else {
            initializeSTAWindow( api.ui.openWindow({
                content: clrmPackage.html['search-task-assistant.html'],
                resources: clrmPackage,
                name: that.windowID,
                specsMap: specs
            }));
        }
    };

    /**
     * Forces all unsaved data to be saved, open STA windows to be closed, 
     * and listeners to be removed.
     *
     * @param {function} oncomplete     A function to invoke when all cleanup
     *                                  steps have completed.
     */
    this.unload = function(oncomplete){
        elm.off('load.sta');
        jQuery('#sta').remove();
        oncomplete();
    }


}
