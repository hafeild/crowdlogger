
RemoteModule.prototype.Demo = function( clrmPackage, clrmAPI ){

    console.log('>> Declaring private variables...');
    // Private variables.
    var that = this,
        windowSpecs = {
            width: 600,
            height: 500,
            location: 'no',
            status: 'no',
            toolbar: 'no',
            resizable: 'yes',
            scrollbars: 'yes'
        },
        elm,
        openWindows = {},
        elmsToUpdateOnActivity = [];

    const STORE_NAME = 'userInput';

    // Private function declarations.
    var initializeWindow, init, onWindowUnload, printToWindows, 
        addGlobalActivityListeners;

    // Public variables.
    this.clrmAPI = clrmAPI;

    // Public function declarations.
    this.init, this.launchWindow, this.unload, this.addElmToActivityListeners,
    this.displayLastNSearches;

    // Private function definitions.

    /**
     * Initializes a demo window, including giving it access to the current
     * demo instance.
     * 
     * @param {Window} win  A reference to the demo window.
     */
    initializeWindow = function(win){
        win.demoBackend = that;
        win.init();
        win.focus();
        openWindows[win.name] = win;
        win.addEventListener('unload', onWindowUnload);
    };

    /**
     * Removes a window's entry from the openWindows list.
     */
    onWindowUnload = function(event){
        delete openWindows[event.currentTarget.name];
    }

    /**
     * Initializes things.
     */
    init = function(){
        // Add a new element to the current window. The demo windows, when they
        // come to life, can communicate with us through that element.
        elm = jQuery('<div id="demo"></div>').appendTo('body');
        elm.on('load.window.demo', function(event, win){
            initializeWindow(win);
        });

        // Listen for new interaction events.
        addGlobalActivityListeners();

        // Create a store where we can save data, if it doesn't already exist.
        clrmAPI.storage.listStores({
            on_success: function(stores){
                if( stores.indexOf(STORE_NAME) < 0 ){
                    clrmAPI.storage.addStores({
                        stores: [STORE_NAME]
                    })
                }
            }
        });
    };

    /**
     * Adds listeners for user activities. This will cause those events to be
     * printed to the body of any open Demo window.
     */
    addGlobalActivityListeners = function(){
        console.log('Adding activity listeners');
        var eventToMessage = function(eventName, eventData){
            var i = 0;
            for(i = 0; i < elmsToUpdateOnActivity.length; i++){
                try{
                    var newElm = jQuery('<div>').
                        prependTo(elmsToUpdateOnActivity[i]);
                    newElm.text( JSON.stringify(eventData) );
                } catch(e) {
                    delete elmsToUpdateOnActivity[i];
                    i--;
                }
            }
        };

        clrmAPI.user.realTime.addActivityListeners({
            'query-entered': eventToMessage,
            'page-loaded': eventToMessage,
            'link-clicked': eventToMessage,
            'page-focused': eventToMessage
        });
    };

    // Public function definitions.

    /**
     * Launches a medium Demo window. If the window already exists, then it is 
     * brought into focus.
     *
     * @param {string} url     The URL of the resource to open.
     */
    this.launchWindow = function(url){ 
        clrmAPI.ui.openWindow({
            content: clrmPackage.html[url],
            resources: clrmPackage,
            name: url,
            specsMap: windowSpecs
        });
    };

    /**
     * Removes all listeners and closes windows.
     */
    this.unload = function(oncomplete){
        var id;
        elm.off('load.demo');
        elm.remove();
        for( id in openWindows ){
            openWindows[id].close();
        }
        oncomplete();
    };

    /**
     * Prints the most recent n search queries from the user's interaction
     * history. These go on a displayed window.
     * 
     * @param {int} n          The number of searches to display.
     * @param {jQuery} jqElm   The jQuery element to append searches to.
     */
    this.displayLastNSearches = function(n, jqElm){
        var searchesSeen = 0;

        // Clear any previous search listings.
        jqElm.html('');

        var onChunk = function(data, next, abort){
            var i = 0;
            for(i = 0; i < data.length && searchesSeen < n; i++){
                if( data[i].e === 'search' ){
                    searchesSeen++;
                    var newElm = jQuery('<div>').appendTo(jqElm);
                    newElm.text(JSON.stringify(data[i]));
                }
            }
            searchesSeen < n ? next() : abort();
        };

        clrmAPI.user.history.getInteractionHistory({
            on_chunk: onChunk,
            reverse: true,
            chunk_size: 250
        });
    };

    /**
     * Adds the given jQuery element to the list of elements to be updated 
     * whenever a new event rolls in.
     *
     * @param {jQuery} elm   The jQuery element to update on new events.
     */
    this.addElmToActivityListeners = function(jqElm){
        elmsToUpdateOnActivity.push(jqElm);
    };

    /**
     * Saves some data.
     *
     * @param {array of objects} data  The data to save.
     * @param {function} onSuccess     Invoked when everything has been saved.
     * @param {function} onError       Invoked if there was a problem.
     */
    this.saveData = function(data, onSuccess, onError){
        clrmAPI.storage.save({
            data: data,
            store: STORE_NAME,
            on_success: onSuccess,
            on_error: onError
        });
    };

    /**
     * Retrieves all the data we've saved.
     *
     * @param {object} opts  A map of options:
     * <ul>
     *    <li>{function} on_chunk    Invoked on each chunk of data.
     *    <li>{function} on_success  Invoked when everything has been read.
     *    <li>{function} on_error    Invoked if there is a problem.
     *    <li>{boolean} reverse      If true, reads from most recent to oldest.
     * </ul>
     */
    this.readData = function(opts){
        opts.store = STORE_NAME;
        clrmAPI.storage.read(opts);
    }

    // Initialize things.
    init();
};