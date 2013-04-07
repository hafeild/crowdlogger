

RemoteModule.prototype.SearchTaskAssistant.prototype.makePage = 
        function(pageData){

    'use strict';
    
    var page = {
            isSerpClick: false,
            url: "",
            title: "",
            favicon: "",
            dwellTime: 0,
            initialAccess: -1,
            lastAccess: -1
        },
        field; 

    for(field in page){
        page[field] = pageData[field] === undefined ? 
            page[field] : pageData[field];
    }
    return page;
};
