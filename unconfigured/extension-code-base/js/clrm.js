/**
 * @fileOverview Provides the base CrowdLogger-side interface (CLI) for 
 * CrowdLogger remote modules (CRMs).<p>
 * 
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

var CLRM = function(crowdlogger){
    // Private members.
    const T = 5;
    var that = this;

    // Private functions.
    var getAvailableCLRMListing, // I.e., from the server.
        getInstalledCLRMListing, // Some of these will be local.
        getOverviewCLRMListings, // Includes available and installed.
        generateCLRMElement;


    // Private function definitions.
    /**
     * Fetches the metadata list of available CLRMs from the server. The 
     * listing is a map of clrmid's to their meta data objects (maps).
     *
     * @param {function} callback  Called when the listing has been made. 
     */
    getAvailableCLRMListing = function( callback, onError ){
        crowdlogger.io.network.send_get_data(
            crowdlogger.io.network.get_server_url('clrm_listing_url'),    
            '', callback, onError );
    };

    /**
     * Collects the metadata of all installed CLRMs. The 
     * listing is a map of clrmid's to their meta data objects (maps).
     *
     * @param {function} callback  Called when the listing has been made. 
     */
    getInstalledCLRMListing = function( callback, onError ){
        var installedCLRMs = {};
        crowdlogger.debug.log('Reading clrm db to find installed CLRMs');
        crowdlogger.io.log.read_clrm_db({
            on_error: onError, 
            chunk_size: 5,
            on_success: function(){ 
                crowdlogger.debug.log('getInstalledCLRMListing is finished!');
                callback(installedCLRMs); 
            },
            on_chunk: function(batch, next){ 
                crowdlogger.debug.log('Processing chunk!');
                var i;
                for(i = 0; i < batch.size; i++){
                    installedCLRMs[batch[i].clrmid] = batch[i].package.metadata;
                }
                next();
            }
        });
    };

    /**
     * Collects the metadata of all available and installed CLRMs. If a
     * CLRM is installed, its metadata will include a 'installed: true' field. 
     * The listing is a map of clrmid's to their meta data objects (maps).
     *
     * @param {function} callback  Called when the listing has been made. 
     */
    getOverviewCLRMListing = function( callback, onError ){
        crowdlogger.debug.log('Getting overview clrm listing');

        var availableCLRMs, installedCLRMs;
        function combine(){

            if(availableCLRMs && installedCLRMs){
                crowdlogger.debug.log('Retrieved available and installed CLRMs');
                var clrmid;
                for(clrmid in installedCLRMs){
                    if( !availableCLRMs[clrmid] ){
                        availableCLRMs[clrmid] = installedCLRMs[clrmid];
                    }
                    availableCLRMs[clrmid].installed = true;
                }
                setTimeout(function(){callback(availableCLRMs);}, T);
            }
        }
        getAvailableCLRMListing(function(d){
            crowdlogger.debug.log('Retrieved available CLRMs');

            availableCLRMs=JSON.parse(d); 
            combine();
        }, onError);
        getInstalledCLRMListing(function(d){
            crowdlogger.debug.log('Retrieved installed CLRMs');
            installedCLRMs=d; 
            combine();
        }, onError);
    };

    /**
     *
     * @param {jquery} jq  The jQuery object for the page on which the CLRM
     *                     will be placed.
     * @param {object} clrmMetaData  The metadata for the CLRM to generate
     *                               the DOM element for.
     */
    generateCLRMElement = function( jq, clrmMetaData ){
        var elm = jq('<div>').addClass('clrm-container').
            attr('data-clrmid', clrmMetaData.clrmid);
        if( clrmMetaData.installed ){
            elm.addClass('installed');
        } else {
            elm.addClass('not-installed');
        }

        var clrm = jq('<div>').addClass('clrm').
            attr('data-clrmid', clrmMetaData.clrmid).appendTo(elm);
        jq('<span>').addClass('install-ribbon installed').html('installed').
            appendTo(clrm);
        if( clrmMetaData.logoURL ){
            jq('<img/>').attr('src', clrmMetaData.logoURL).appendTo(clrm);
        }
        jq('<span>').addClass('name').html(clrmMetaData.name).appendTo(clrm);

        var info = jq('<div>').addClass('info').
            attr({
                'data-clrmid': clrmMetaData.clrmid,
                'data-metadata': JSON.stringify(clrmMetaData)
            }).appendTo(elm);
        jq('<h2>').html(clrmMetaData.name).appendTo(info);
        jq('<p>').html(clrmMetaData.description).appendTo(info);

        jq('<span>').addClass('button installed').
            attr('data-type', 'uninstall').html('Remove').appendTo(info);
        jq('<span>').addClass('button not-installed').
            attr('data-type', 'install').html('Install').appendTo(info);
        jq('<span>').addClass('button').
            attr('data-type', 'dismiss').html('Dismiss').appendTo(info);

        return elm;
    };

    // Public functions.
    /**
     * Adds available and installed CLRMs (apps and studies) to the given
     * page. The page should have a jQuery instances and two DOM elements, one
     * with the id 'apps' and another with the id 'studies'.
     *
     * @param {object} doc        The document to populate.
     * @param {function} callback The function to invoke upon successful 
     *                            completion.
     * @param {function} onError  The function to invoke on an error.
     */
    this.populateCLRMLibraryPage = function( doc, callback, onError ){
        var jq = doc.defaultView.jQuery;

        var onSuccess = function(allMetadata){
            crowdlogger.debug.log('Adding CLRMs to library page.');
            var clrmid;
            for(clrmid in allMetadata){
                var metadata = allMetadata[clrmid];
                crowdlogger.debug.log('Attempting to add '+ clrmid);
                crowdlogger.debug.log('Metadata: '+ JSON.stringify(metadata));
                try{
                    var used = false;
                    var jqElm = generateCLRMElement(jq, metadata);

                    if(metadata.categories.indexOf('app') >= 0){
                        crowdlogger.debug.log('Adding to apps.');
                        jq('#apps').append(jqElm);
                        used = true;
                    }
                    if(metadata.categories.indexOf('study') >= 0){
                        crowdlogger.debug.log('Adding to studies.');
                        if( used ){
                            jq('#studies').append(jqElm.clone());
                        } else {
                            jq('#studies').append(jqElm);
                        }
                        used = true;
                    }
                    if(!used){
                        crowdlogger.debug.log(
                            'Hmm...didn\'t add it to anything...');
                    }
                } catch(e) {
                    crowdlogger.debug.log('Error populating library! '+ e);
                }
            }
            if( callback ){ callback() };
        };

        getOverviewCLRMListing(onSuccess, onError);
    };

    /**
     * Launches a CLRM Library page.
     */
    this.launchCLRMLibraryPage = function(){
        crowdlogger.gui.windows.open_dialog( 
            crowdlogger.gui.windows.get_local_page('clrm_library_url') );
    };

    /**
     * Installs a CLRM.
     *
     * @param {object} clrmMetadata     The metadata for the CLRM to install.
     * @param {function} onSuccess      A function to invoke upon successfully
     *                                  installing the CLRM.
     * @param {function} onError        A function to invoke upon error.
     */
    this.installCLRM = function( clrmMetadata, onSuccess, onError ){
        // Download the CLRM package.

        // Install it.

        // Save it. (should it be saved before we install it?)
        // -- add an 'installed' flag at this point, rather than at the
        // assume it for everything that's installed.

        onSuccess();
    };

    this.uninstallCLRM = function( clrmid, onSuccess, onError ){
        onSuccess();
    };

}

