

RemoteModule.prototype.makePage = function(page_data){
    var page = {
        is_serp_click: false,
        url: "",
        title: "",
        favicon: "",
        dwell_time: 0,
        initial_access: -1,
        last_access: -1
    }; 

    for( field in page){
        page[field] = page_data[field] === undefined ? 
            page[field] : page_data[field];
    }
    return page;
};
