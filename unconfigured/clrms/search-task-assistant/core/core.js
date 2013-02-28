

var RemoteModule = function(clrmPackge, api ){
    var that = this, sta;

    this.id = "Search Task Assistant";

    this.init = function(){
        that.sta = {};
        var sta = that.sta; // For convenience.

        sta.searchTaskIdentifier = new this.SearchTaskIdentifier( sta );
        sta.searchTaskModel = new this.SearchTaskModel( sta );
        sta.searchTaskAssistant = new this.searchTaskAssistant( 
            api, sta, clrmPackge );

        sta.util =  new this.Util();

        sta.Search = that.Search;
        sta.Task = that.Task;
        sta.makePage = that.makePage;
    };

    this.unload = function(oncomplete){
        that.sta.searchTaskAssistant.unload();
    };
};