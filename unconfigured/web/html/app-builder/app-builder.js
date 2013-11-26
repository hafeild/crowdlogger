/**
 * @fileOverview Provides the logic behind the app builder.
 * 
 * <p>
 * %%LICENSE%%
 * </p>
 *
 * @author hfeild
 * @version %%VERSION%%
 */
var AppBuilder = function() {
    // Private vars.
    var that = this,
        appPackage,
        currentHTML,
        populating = false;

    // Private functions.
    var initTinyMCE,
        initListeners,
        saveCurrentHTML,
        createNewAppPackage,
        createAppPackageFromString,
        populateData,
        backup;

    // Public vars.

    // Public functions.
    this.start;
    this.getAppPackage;


    // Private function definitions.

    /**
     * Initializes all of the TinyMCE text areas.
     */
    initTinyMCE = function(){
        tinymce.init({
            selector:'.html-editor',
            //theme : "modern",
            toolbar: 'save | undo redo | styleselect | fontsizeselect | '+
                     'fontselect | table | bold italic | code',
            plugins: 'code,table,save,print,paste,fullscreen,visualchars',
            save_enablewhendirty: true,
            save_onsavecallback: function(){
                saveCurrentHTML(
                    currentHTMLName, 
                    tinyMCE.activeEditor.getContent() 
                );
            }
        });
    };

    /**
     * Places listeners on buttons, etc.
     */
    initListeners = function(){
        jQuery(document).on('click', function(e){
            var jelm = jQuery(e.target);
            switch(jelm.attr('id')) {
                case 'export':
                    exportPackage();
            }
        });

        jQuery('.app-input form').change(function(){
            if(!populating){
                appPackage.metadata = readInAppMetadata();
                backup();
            }
        });
    };

    /**
     * Saves the given HTML to its place in the resources part of the app
     * package.
     *
     * @param {string} name    The name of the HTML file to save.
     * @param {string} content The content of the HTML file to save.
     */
    saveHTML = function(name, content) {
        appPackage.html[name] = content;
    };

    /**
     * Loads the HTML currently saved under the given name into the editor.
     *
     * @param {string} name  The name of the HTML page to load.
     */
    loadHTML = function(name) {
        appPackage.html[name] = appPackage.resources.html[name] || '';
        tinyMCE.activeEditor.setContent(appPackage.html[name]);
    }

    /**
     * Creates the shell for a CrowdLogger Remote Module.
     *
     * @return An empty app package.
     */
    createNewAppPackage = function() {
        return {
            module: {},
            html: {},
            css: {},
            js: {},
            metadata: {}
        };
    };

    /**
     * Reads in the app metadata from the form.
     *
     * @return the metadata entered by the user.
     */
    readInAppMetadata = function(){
        var i,
            data = jQuery('.app-input form').serializeArray(),
            metadata = generateEmptyMetadata();

        for(i = 0; i < data.length; i++) {
            if( metadata[data[i].name] !== undefined ){
                if( metadata[data[i].name].push ){
                    metadata[data[i].name].push(data[i].value);
                } else {
                    metadata[data[i].name] = data[i].value;
                }
            }
        }

        return metadata;
    };

    /**
     * Creates an empty metadata object.
     *
     * @return An empty metadata object.
     */
    generateEmptyMetadata = function(){
        return {
            clrmid: '',
            name: '',
            version: '',
            categories: [],
            description: '',
            packageURL: '',
            permissions: [],
            minCLVersion: '',
            logoURL: ''
        };
    }

    /**
     * Backs up the app to local storage.
     */
    backup = function() {
        if( Storage ){
            localStorage.appPackage = JSON.stringify(appPackage);
            console.log('Backing up...');
        }
    };

    /**
     * Exports the app as a JSON download.
     */
    exportPackage = function(){
        // Opens a new window with the app package in JSON.
        // window.open('data:application/json,'+ 
        //     encodeURI(JSON.stringify(appPackage)));
        var download = new Blob([JSON.stringify(appPackage)], 
            {type:'application/json'});
        var link = jQuery('<a href="'+ URL.createObjectURL(download) +
            '" download="'+ appPackage.metadata.clrmid + 
            '.json"></a>').appendTo(document.body);
        link[0].click();
    };

    /**
     * Fills everything in the metadata form and the file lists.
     */
    populateData = function(){
        populating = true;

        // Populate the metadata form.
        var key;
        for(key in appPackage.metadata){
            if( typeof(appPackage.metadata[key]) === "object" ){
                jQuery('input[name="'+key+'"][value="'+ 
                    appPackage.metadata[key]+'"]').prop('checked', true);
            } else {
                jQuery('input[name="'+key+'"]').val(appPackage.metadata[key]);
            }

        }

        // Populate the file lists.
        // TODO

        populating = false;
    };

    // Public function definitions.

    /**
     * Gets everything started -- initializes the editors and places listeners.
     */
    this.start = function(){
        initTinyMCE();
        initListeners();
        if( Storage && localStorage.appPackage ){
            try{
                appPackage = JSON.parse(localStorage.appPackage);
                populateData();
            } catch(e) {
                appPackage = generateEmptyPackage();
            }
        } else {
            appPackage = generateEmptyPackage();
        }
    };

    /**
     * @return The app package.
     */
    this.getAppPackage = function(){
        return appPackage;
    }

    this.readInAppMetadata = readInAppMetadata;
};

// Get things started.
jQuery(document).ready(function(){
    appBuilder = new AppBuilder();
    appBuilder.start();
});
