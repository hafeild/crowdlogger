/**
 * @fileOverview <p>Provides the UI API for the CrowdLogger Remote Modules 
 * (CRMs)-side interface (CRMI).</p>
 *
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

/**
 * Provides the UI API for the CrowdLogger Remote Modules (CRMs)-side interface 
 * (CRMI).
 */
var CLRMIUserInterfaceAPI = function(api){
    // Private variables.
    var defaultWindowOptions = {
            url: '',
            name: '',
            specs: ''
        },
        that = this;

    // Private functions.
    var copyDefaults;

    // Public functions.
    this.openWindow;


    // Private function definitions.
    copyDefaults = function(obj, defaults){
        var x, objWithDefaults = {};
        for(x in defaults){
            objWithDefaults[x] =  (x in obj) ? obj[x] : defaults[x];
        }
        for(x in obj){
            if( !(x in objWithDefaults) ){
                objWithDefaults[x] = obj[x];
            }
        }
        return objWithDefaults;
    };


    // Public function definitions.
    // this.alert = function(message){
    //     api.base.sendMessage({command: 'alert', message: message});
    // };

    /**
     * Opens a new window and returns a reference to it.
     *
     * @param {object} options    A map of options. The following are supported:
     * <ul>
     *     <li>{string} contents     The HTML to go inside. This gets URI
     *                               escaped and then loaded via data:text/html.
     *                               If neither contents nor url are provided,
     *                               an about:blank page is opened.
     *     <li>{string} url          The URL to load (overrides contents). If
     *                               neither contents nor url are provided,
     *                               an about:blank page is opened.
     *     <li>{string} name         The name of the window to open.
     *     <li>{string} specs        The window.open specs. See 
     *                           http://www.w3schools.com/jsref/met_win_open.asp
     *                               for more information.
     * </ul>
     * @return A reference to the window.
     */
    this.openWindow = function(options){
        var opts = copyDefaults(options, defaultWindowOptions);

        if( opts.contents ){
            opts.url = 'data:text/html,'+ encodeURI(opts.contents);
        }
        return window.open(opts.url, opts.name, opts.specs);
    }
}