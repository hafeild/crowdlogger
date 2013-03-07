
var RemoteModule = function( clrmPackage, clrmAPI ){
    var demo,
        that = this;

    this.id = 'Demo';

    this.init = function(){
        demo = new that.Demo( clrmPackage, clrmAPI );
        // Launch the window in about 1 sec from now.
        setTimeout( function(){ demo.launchWindow('demo.html'); }, 1000 );
    };

    this.unload = function(oncomplete){
        demo.unload(oncomplete);
    };
}