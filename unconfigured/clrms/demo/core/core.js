
var RemoteModule = function( clrmPackage, clrmAPI ){
    var demo,
        that = this;

    this.id = 'Demo';

    this.init = function(){
        console.log('>> Initializing...');
        demo = new that.Demo( clrmPackage, clrmAPI );
        // Launch the window in about 1 sec from now.
        console.log('>> Setting demo to launch medium window in 1 sec.');
        setTimeout( demo.launchMediumWindow, 1000 );
    };

    this.unload = function(oncomplete){
        demo.unload(oncomplete);
    };
}