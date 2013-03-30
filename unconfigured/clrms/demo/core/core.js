
var RemoteModule = function( clrmPackage, clrmAPI ){
    var demo,
        that = this;

    this.init = function(){
        demo = new that.Demo( clrmPackage, clrmAPI );
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

    this.getMessage = function(){
        return 'Version '+ clrmPackage.metadata.version +'; no messages.';
    };

    this.open = function(){
        demo.launchWindow('demo.html');
    };

    this.configure = function(){
        demo.launchWindow('configure-demo.html');
    };

    this.isOkayToUpdate = function(){
        return true;
    };
}