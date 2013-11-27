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
    // Private constants.
    const SAVE_FREQ = 2000;

    // Private vars.
    var that = this,
        appPackage,
        currentFileName,
        currentFileType,
        jqJS = jQuery('.js-editor'),
        jqCSS = jQuery('.css-editor'),
        htmlJS = jQuery('.html-editor'),
        jsEditor,
        cssEditor,
        populating = false,
        saving = false,
        isDirty = false;

    // Private functions.
    var initTinyMCE,
        initListeners,
        initSyntaxHiglighting,
        saveCurrent,
        saveMetadata,
        createNewAppPackage,
        createAppPackageFromString,
        populateData,
        backup,
        openFileInEditor;

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
            height: '240px',
            selector:'.html-editor',
            //theme : "modern",
            toolbar: 'undo redo | bold italic underline | fontsizeselect | '+
                     'forecolor backcolor | link unlink | code',
            plugins: 'code,table,save,print,paste,fullscreen,visualchars,'+
                     'textcolor,codemirror,link',
            codemirror: {
                indentOnInit: true, 
                path: '../../../../../codemirror-3.20',
                config: {
                   mode: 'xml',
                   lineNumbers: true
                },
                jsFiles: [
                   'mode/xml/xml.js',
                ]
            },
            save_enablewhendirty: true,
            setup: function(ed){
                ed.on('change', function(e){
                    isDirty = true;
                });
            }
            // save_onsavecallback: function(){
            //     saveCurrentHTML(
            //         currentHTMLName, 
            //         tinyMCE.activeEditor.getContent() 
            //     );
            // }
        });
    };

    /**
     * Initializes the package that handles syntax highlighting.
     */
    initSyntaxHiglighting = function() {
        // JavaScript.
        jsEditor = CodeMirror.fromTextArea(jqJS[0], {
            mode: "javascript",
            lineNumbers: true
        });

        // CSS.
        cssEditor = CodeMirror.fromTextArea(jqCSS[0], {
            mode: "css",
            lineNumbers: true
        });
    };

    /**
     * Places listeners on buttons, etc.
     */
    initListeners = function(){

        // Export.
        jQuery('#export').click(exportPackage);

        // Editing a file.
        jQuery(document).delegate('.name', 'click', function(e){
            var jqElm = jQuery(e.target);
            console.log('Clicked!');
            openFileInEditor(jqElm)
        });

        // Removing a file.
        jQuery(document).delegate('.remove', 'click', function(e){
            var jqElm = jQuery(e.target);
            var fileType = jqElm.parents('.category').attr('data-type');
            var filename = jqElm.parents('.file').find('.name').html();
            removeFile(filename, fileType, jqElm.parents('.file'));
        });

        // Adding a file.
        jQuery(document).delegate('.add', 'click', function(e){
            var jqElm = jQuery(e.target);
            var fileType = jqElm.parents('.category').attr('data-type');
            // Read in the filename.            
            var filename = window.prompt(
                "Please enter a name for the new file.")

            if(!filename){ return; }

            // Add it to the package.
            if( !appPackage[fileType][filename] ){
                appPackage[fileType][filename] = '';
            }

            // Display it.
            var entry = jQuery('#file-template').clone();
            entry.find('.name').html(filename);
            entry.removeClass('hidden').show().attr('id', '');
            jqElm.parents('.category').append(entry);
        });

        // To get the 'close' button to appear next to file names when hovered.
        jQuery('body').on('mouseenter', '.file', function(){
            jQuery(this).find('button').show();
        }).on('mouseleave', '.file', function(){
            jQuery(this).find('button').hide();
        });

        // Save the metadata when it changes.
        jQuery('.app-input form').change(saveMetadata);

        // Save the current file being edited every few seconds.
        setInterval(function(){
            if(isDirty){ saveCurrent(); } 
        }, SAVE_FREQ);

        // Listen for changes to the editors. The changes to the HTML editor 
        // are taken care of elsewhere.
        //jQuery('.js-editor,.css-editor').on('keyup',function(){isDirty=true;});
        jsEditor.on('change', function(){ 
            console.log('Marking as dirty...');
            isDirty = true; 
        });
        cssEditor.on('change', function(){ 
            console.log('Marking as dirty...');
            isDirty = true; 
        });
    };

    /**
     * Opens the current file in the editor.
     */
    openFileInEditor = function(jqElm, count){
        if(count === undefined){ count = 10 };
        // Try 10 times to open.
        if(saving){ 
            console.log('saving = true...'+ count +' tries left...');
            if( count > 0 ){
                setTimeout(function(){openFileInEditor(jqElm, count--);}, 100);
            }
            return;
        }
        console.log( 'Made it!');
        saving = true;

        try {
            //var jqElm = jQuery(elm.target);
            currentFileType = jqElm.parents('.category').attr('data-type');
            currentFileName = jqElm.html();

            console.log('filetype: '+ currentFileType);
            console.log('filename: '+ currentFileName);

            jQuery('.editor-container').hide();

            switch(currentFileType) {
                case "module":
                    console.log('Hey!');
                    jqJS.parent().show();
                    //jqJS.val(appPackage.module);
                    jsEditor.getDoc().setValue(appPackage.module);
                    break;
                case "js":
                    jqJS.parent().show();
                    //jqJS.val(appPackage.js[currentFileName] || '');
                    jsEditor.getDoc().setValue(
                        appPackage.js[currentFileName] || '');
                    break;
                case "css":
                    jqCSS.parent().show();
                    //cssJS.val(appPackage.css[currentFileName] || '');
                    cssEditor.getDoc().setValue(
                        appPackage.css[currentFileName] || '');
                    break;
                case "html":
                    htmlJS.parent().show();
                    tinyMCE.activeEditor.setContent(
                        appPackage.html[currentFileName] || '');
                    break;
            }
        } catch(e) {
            console.log('Error: '+ e);
        }

        saving = false;
    };

    /**
     * Removes a given file from the app and then backs up the package in local
     * storage. If the file is currently displayed, it is no longer displayed.
     * The file entry is removed from the list of files.
     *
     * @param {string} filename    The name of the file to remove.
     * @param {string} fileType    The type of the file.
     * @param {jQuery} jqElm       The jQuery element corresponding the file's
     *                             entry.
     * @parma {int}    count       The number of remaining attempts to delete
     *                             the entry.
     */
    removeFile = function(filename, fileType, jqElm, count){
        if(count === undefined){ count = 10 };
        // Try 10 times to open.
        if(saving){ 
            console.log('saving = true...'+ count +' tries left...');
            if( count > 0 ){
                setTimeout(function(){
                    removeFile(filename, fileType, jqElm, count--);
                }, 100);
            }
            return;
        }

        saving = true;

        try{
            if( fileType === currentFileType && filename === currentFileName){
                jQuery('.editor-container').hide();
                currentFileName = undefined;
                currentFileType = undefined;
            }
            console.log('delete appPackage["'+ fileType +'"]["'+ filename +'"]');
            delete appPackage[fileType][filename];
            jqElm.remove();

            backup();
        } catch(e) {
            console.log('Error while removing file: '+ e);
        }

        saving = false;
    }

    /**
     * Saves the metadata and performs a backup, provided the page is not
     * being automatically populated.
     */
    saveMetadata = function(){
        if(populating || saving) return;
        saving = true;
        try{
            appPackage.metadata = readInAppMetadata();
            backup();
        } catch(e) {}
        saving = false;
    };

    /**
     * Saves the file currently being edited and performs a backup, provided the
     * page is not being automatically populated.
     */
    saveCurrent = function(){
        if(populating || saving) return;
        saving = true;
        try{
            if( currentFileType === "module" ){
                appPackage.module = jqJS.val();
            } else {
                var content;
                switch(currentFileType){
                    case "html":
                        content = tinyMCE.activeEditor.getContent();
                        break;
                    case "css":
                        //content = jqCSS.val();
                        content = cssEditor.getDoc().getValue();
                        break;
                    case "js":
                        // content = jqJS.val();
                        content = jsEditor.getDoc().getValue();
                        break;
                }
                appPackage[currentFileType][currentFileName] = content;
            }
            backup();
        } catch(e) {}
        isDirty = false;
        saving = false;
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
    generateEmptyPackage = function() {
        return {
            module: '',
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
        // First make sure everything is saved.
        saveMetadata();
        saveCurrent();

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

        try{
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
            jQuery('.category').each(function(i,elm){
                var filename,
                    jqElm = jQuery(elm),
                    dataType = jqElm.attr('data-type');

                if( dataType !== "module" ){
                    for(filename in appPackage[dataType]){
                        if(filename){
                            var entry = jQuery('#file-template').clone();
                            entry.find('.name').html(filename);
                            entry.removeClass('hidden').show().attr('id', '');
                            jqElm.append(entry);
                        }
                    }
                }
            });
        } catch(e) {
            console.log('Error while populating: '+ e);
        }

        populating = false;
    };

    // Public function definitions.

    /**
     * Gets everything started -- initializes the editors and places listeners.
     */
    this.start = function(){
        jQuery('#file-template').hide();
        initTinyMCE();
        initSyntaxHiglighting();
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
