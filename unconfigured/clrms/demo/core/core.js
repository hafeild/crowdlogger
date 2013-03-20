
var RemoteModule = function( clrmPackage, clrmAPI ){
    var demo,
        that = this;

    this.init = function(){
        demo = new that.Demo( clrmPackage, clrmAPI );
        // Launch the window in about 1 sec from now.
        setTimeout( function(){ demo.launchWindow('demo.html'); }, 1000 );
    };

    this.unload = function(reason, oncomplete, onerror){
        switch(reason){
            case 'uninstall':
                demo.unload(function(){
                    demo.uninstall(oncomplete, onerror);
                }, onerror);
                break;
            case 'newversion':
            case 'shutdown':
            case 'disable': 
            default:
                demo.unload(oncomplete, onerror);
        }
    };
}