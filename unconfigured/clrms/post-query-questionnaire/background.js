
// This is a required class. CrowdLogger will make an instance of this when
// the module is loaded.
var RemoteModule = function( clrmPackage, clrmAPI ){
    var pqq,
        that = this;

    // Required. Called when the CLRM first starts up.
    this.init = function(){
        // We will use the PostQueryQuestionnaire object to perform most of 
        // the core tasks.
        pqq = new that.PostQueryQuestionnaire( clrmPackage, clrmAPI );
    };

    // Required. Called when the CLRM is unloaded for any of the reasons
    // listed below.
    this.unload = function(reason, oncomplete, onerror){
        // You can change what gets called for each of the reasons.
        switch(reason){
            case 'uninstall':
            case 'newversion':
            case 'shutdown':
            case 'disable': 
            default:
                pqq.unload(oncomplete, onerror);
        }
    };

    // Required. This is periodically called by CrowdLogger to see if you have
    // any pending messages for the user. These messages are displayed next
    // to the CLRM on the status page.
    this.getMessage = function(){
    };

    // Required. This is called when the user clicks the "Open" button for this
    // CLRM. You could, e.g., open a window with a set of options, etc.
    this.open = function(){
    };

    // Required. This is called when the user clicks the "Configure" button for
    // this CLRM. 
    this.configure = function(){
    };

    // Required. This is called when CrowdLogger or the User wants to update
    // the current install. If you are in the middle of processing something,
    // you'll want this to return false.
    this.isOkayToUpdate = function(){
        return true;
    };
};

// ========================================================================== //
// ========================================================================== //
// ========================================================================== //

// This class is where all the important logic is.
RemoteModule.prototype.PostQueryQuestionnaire = function(clrmPackage, clrmAPI){
    // Private members.
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
        openedWindow;
    const QUESTIONNAIRE_PAGE = "questionnaire.html",
          UPLOAD_SERVER_URL = "http://localhost:8080/upload.php";

    // Private function names.
    var init, addListeners, onSearch, openQuestionnaire;

    // Public variables.
    this.currentQueryInfo;        

    // Private functions definitions.

    // Initializes everything, including setting up listeners.
    init = function(){
        addListeners();
    };

    // Adds listeners for search events.
    addListeners = function(){
        clrmAPI.user.realTime.addActivityListeners({
                'query-entered': onSearch
        });
    };

    // Defines what to do when a search is detected.
    onSearch = function(eventName, eventData){
        that.currentQueryInfo = eventData;
        clrmAPI.ui.openWindow({
            content: clrmPackage.html[QUESTIONNAIRE_PAGE],
            resources: clrmPackage,
            name: QUESTIONNAIRE_PAGE,
            specsMap: windowSpecs,
            callback: openQuestionnaire
        });
    };

    // Opens the questionnaire dialog.
    openQuestionnaire = function(win){
        // clrmBackend is defined in the JavaScript within questionnaire.html.
        // This will allow the questionnaire code to access this object.
        win.clrmBackend = that;
        win.start();
        win.focus();
        openedWindow = win;
        win.addEventListener('unload', function(){
            openedWindow = undefined;
        });
    };

    // Public functions.

    // De-registers our listeners and closes open windows.
    this.unload = function(oncomplete, onerror){
        // Close the questionnaire window if it's open.
        that.closeWindow();
        oncomplete();
    };

    // Uploads the given information to the server.
    this.uploadData = function(data, onsuccess, onerror){
        clrmAPI.ssa.sendPostData({
            url: UPLOAD_SERVER_URL,
            data: data,
            on_success: function(response){
                response = JSON.parse(response);
                if(response.accepted && onsuccess){
                    onsuccess();
                } else if(!response.accepted && onerror){
                    onerror(response.error || 'No error reported.');
                }
            },
            on_error: onerror
        });
    };

    // Closes the open window.
    this.closeWindow = function(){
        try{
            if(openedWindow){ 
                openedWindow.close(); 
                openedWindow = undefined;
            }
        } catch(e) {}
    };

    // Invoked on creation.
    init();
};