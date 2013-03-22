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
                for(i = 0; i < batch.length; i++){
                    installedCLRMs[batch[i].clrmid] = batch[i].metadata;
                    installedCLRMs[batch[i].clrmid].id = batch[i].id;
                    crowdlogger.debug.log('Adding '+ 
                        JSON.stringify(installedCLRMs[batch[i].clrmid]));
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
                        availableCLRMs[clrmid].localOnly = true;
                    } else {
                        var versionCmp = 
                            crowdlogger.util.compare_version_numbers(
                                availableCLRMs[clrmid].version, 
                                installedCLRMs[clrmid].version);
                        if( versionCmp > 0 ){
                            availableCLRMs[clrmid].updateAvailable = true;
                        }
                    }
                    availableCLRMs[clrmid].installed = true;
                    availableCLRMs[clrmid].id = installedCLRMs[clrmid].id;
                    availableCLRMs[clrmid].enabled = 
                        installedCLRMs[clrmid].enabled;
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
     * @param {object} clrmMetadata  The metadata for the CLRM to generate
     *                               the DOM element for.
     */
    generateCLRMElement = function( jq, clrmMetadata ){
        var elm = jq('<div>').addClass('clrm-container').
            attr('data-clrmid', clrmMetadata.clrmid);
        if( clrmMetadata.installed ){
            elm.addClass('installed');
        } else {
            elm.addClass('not-installed');
        }

        if( clrmMetadata.enabled ){
            elm.addClass('enabled');
        } else {
            elm.addClass('not-enabled');
        }

        var clrm = jq('<div>').addClass('clrm').
            attr('data-clrmid', clrmMetadata.clrmid).appendTo(elm);
        jq('<span>').addClass('ribbon installed enabled').html('installed').
            appendTo(clrm);
        jq('<span>').addClass('ribbon installed not-enabled').html('disabled').
            appendTo(clrm);

        if( clrmMetadata.logoURL ){
            jq('<img/>').attr({src: clrmMetadata.logoURL, alt:''}).
                appendTo(clrm);
        }
        jq('<span>').addClass('name').html(clrmMetadata.name).appendTo(clrm);

        var info = jq('<div>').addClass('info').
            attr({
                'data-clrmid': clrmMetadata.clrmid,
                'data-metadata': JSON.stringify(clrmMetadata)
            }).appendTo(elm);
        jq('<h2>').html(clrmMetadata.name).appendTo(info);
        jq('<p>').html(clrmMetadata.description).appendTo(info);

        jq('<span>').addClass('button installed').
            attr('data-type', 'uninstall').html('Remove').appendTo(info);
        jq('<span>').addClass('button not-installed').
            attr('data-type', 'install').html('Install').appendTo(info);

        jq('<span>').addClass('button installed enabled').
            attr('data-type', 'disable').html('Disable').appendTo(info);
        jq('<span>').addClass('button installed not-enabled').
            attr('data-type', 'enable').html('Enable').appendTo(info);


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
     * Installs and loads a CLRM from a string.
     *
     * @param {object} clrmMetadata     The metadata for the CLRM to install.
     * @param {function} onSuccess      A function to invoke upon successfully
     *                                  installing the CLRM.
     * @param {function} onError        A function to invoke upon error.
     */
    this.installLocalCLRM = function( clrmPackage, onSuccess, onError ){
        clrmPackage.clrmid = clrmPackage.metadata.clrmid;
        crowdlogger.debug.log('Entering installLocalCLRM');
        var install = function(){
            crowdlogger.debug.log('In install...sending:');
            crowdlogger.debug.log(clrmPackage);
            // Load the package. 
            crowdlogger.api.cli.base.loadCLRMFromString(
                JSON.stringify(clrmPackage), function(){
                    // Once loaded, save the state as enabled.
                    clrmPackage.metadata.enabled = true;
                    crowdlogger.io.log.write_to_clrm_db({
                        data: [clrmPackage],
                        on_success: onSuccess
                    }); 
                }, onError 
            );
        };

        // See if there's already a version of this saved.
        crowdlogger.io.log.get_clrm_entry({
            clrmid: clrmPackage.metadata.clrmid,
            on_success: function(package){
                crowdlogger.debug.log('Heard back from database; package: '+ 
                    package);
                if(package && package.id){ clrmPackage.id = package.id; }
                install();
            },
            on_error: onError
        });
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
        if( !clrmMetadata.packageURL ){
            if( onError ){ onError('installCLRM requires the CLRM metadata '+
                'to include a "packageURL" field.'); }
            return;
        }

        // Fetch the URL and save it.
        crowdlogger.io.network.send_get_data(clrmMetadata.packageURL, null,
            function(response){ 
                var package = JSON.parse(response);
                if(clrmMetadata.id){
                    package.id = clrmMetadata.id;
                }
                package.clrmid = package.metadata.clrmid;
                crowdlogger.io.log.write_to_clrm_db({
                    data: [package],
                    on_success: onSuccess
                });
            }, function(e){}
        );
    };

    this.uninstallCLRM = function( clrmid, onSuccess, onError ){
        crowdlogger.debug.log('In uninstallCLRM...');
        var uninstall =function(){
            crowdlogger.debug.log('\tIn uninstallCLRM.uninstall...');
            that.removeCLRMFromDB( clrmid, onSuccess, onError)
        };

        var unload = function(){
            crowdlogger.debug.log('\tIn uninstallCLRM.unload...');
            that.unloadCLRM({
                clrmid: clrmid,
                reason: 'uninstall',
                onSuccess: uninstall,
                onError: onError
            });
        };

        // Load the clrm if it isn't already.
        var load = function(){
            crowdlogger.debug.log('\tIn uninstallCLRM.load...');
            that.loadCLRMIfNecessary( clrmid, unload, onError );
        };

        //load();
        unload();
    };

    this.removeCLRMFromDB = function( clrmid, onSuccess, onError ){
        crowdlogger.io.log.update_clrm_db({
            on_success: onSuccess,
            on_error: onError,
            foreach: function(entry){
                if( entry.clrmid === clrmid ){
                    return {delete: true, stop: true}
                }
            }
        });
    };

    this.enableCLRM = function( clrmid, onSuccess, onError ){
        // Get the associated package.
        crowdlogger.io.log.get_clrm_entry({
            clrmid: clrmid,
            on_success: function(package){
                // Load the package.
                crowdlogger.api.cli.base.loadCLRMFromString(
                    JSON.stringify(package), function(){
                        // Once loaded, save the state as enabled.
                        package.metadata.enabled = true;
                        package.metadata.loaded = true;
                        crowdlogger.io.log.write_to_clrm_db({
                            data: [package],
                            on_success: onSuccess
                        });
                    }, onError );
            },
            on_error: onError
        });
    };

    this.disableCLRM = function( clrmid, onSuccess, onError ){
        that.unloadCLRM({
            clrmid: clrmid, 
            reason: 'disable', 
            onSuccess: onSuccess, 
            onError: onError
        });
    };   

    /**
     * Unloads a CLRM and records this in the CLRM DB.
     *
     * @param {object} opts  A map of options.
     * REQUIRED
     * <ul>
     *     <li>{string} clrmid     The id of the CLRM to unload.
     *     <li>{string} reason     The reason ('uninstall', 'disable',
     *                             'shutdown', 'newversion').
     * </ul>
     * OPTIONAL:
     * <ul>
     *     <li>{function} onSuccess Invoked when the CLRM has been successfully
     *                              unloaded.
     *     <li>{function} onError   Invoked when an error is encountered.
     * </ul>
     */
    this.unloadCLRM = function( opts ){
        opts = opts || {};
        if( !opts || !opts.reason || !opts.clrmid ){
            if(opts.onError){
                opts.onError('Insufficient parameters to unloadCLRM.');
            }
            return;
        }

        // Get the associated package.
        crowdlogger.io.log.get_clrm_entry({
            clrmid: opts.clrmid,
            on_success: function(package){
                // Unload the package
                crowdlogger.api.cli.base.unloadCLRM(opts.clrmid, opts.reason, 
                    function(){
                        // Once unloaded, save the state as disabled.
                        if( opts.reason.match(/(uinstall)|(disable)/) ){
                            package.metadata.enabled = false;
                        }
                        package.metadata.loaded = false;
                        crowdlogger.io.log.write_to_clrm_db({
                            data: [package],
                            on_success: opts.onSuccess
                        });
                    }, opts.onError );
            },
            on_error: opts.onError
        });
    };

    this.unloadAllCLRMs = function(reason, onSuccess, onError){
        crowdlogger.io.log.read_clrm_db({
            on_error: onError, 
            chunk_size: 5,
            on_success: function(){ 
                crowdlogger.debug.log('getInstalledCLRMListing is finished!');
                if(onSuccess){onSuccess();}
            },
            on_chunk: function(batch, next){
                crowdlogger.debug.log('Processing chunk!');
                function process(i) {
                    if( i >= batch.length ){
                        next();
                    } else {
                        unloadCLRM({
                            clrmid: batch[i].clrmid,
                            reason: reason,
                            onSuccess: function(){ process(i+1); },
                            onError: onError
                        })
                    }
                }
                process(0);
            }
        });
    };

    this.loadCLRMIfNecessary = function( clrmid, onSuccess, onError ){
        // Get the associated package.
        crowdlogger.io.log.get_clrm_entry({
            clrmid: clrmid,
            on_success: function(package){
                // Unload the package
                if(package.metadata.loaded){
                    if(onSuccess){ onSuccess() };
                } else {
                    crowdlogger.api.cli.base.loadCLRMFromString(
                        JSON.stringify(package), function(){
                            // Once loaded, save the state as enabled.
                            package.metadata.enabled = true;
                            package.metadata.loaded = true;
                            crowdlogger.io.log.write_to_clrm_db({
                                data: [package],
                                on_success: onSuccess
                            });
                        }, onError );
                }
            },
            on_error: onError
        });

    };


    this.loadAllEnabledCLRMs = function(onSuccess, onError){
        crowdlogger.io.log.read_clrm_db({
            on_error: onError, 
            chunk_size: 5,
            on_success: function(){ 
                crowdlogger.debug.log('getInstalledCLRMListing is finished!');
                if(onSuccess){onSuccess();} 
            },
            on_chunk: function(batch, next){
                crowdlogger.debug.log('Processing chunk!');
                function process(i) {
                    if( i >= batch.length ){
                        next();
                    } else {
                        if( batch[i].metadata.enabled ){
                            crowdlogger.debug.log('Loading '+ batch[i].clrmid);
                            crowdlogger.api.cli.base.loadCLRMFromString(
                            JSON.stringify(batch[i]), function(){
                                // Once loaded, save the state as enabled.
                                batch[i].metadata.loaded = true;
                                crowdlogger.io.log.write_to_clrm_db({
                                    data: [batch[i]],
                                    on_success: function(){process(i+1);},
                                    on_error: onError
                                });
                            }, onError );
                        } else {
                            crowdlogger.debug.log('Skipping '+ batch[i].clrmid);
                            batch[i].metadata.loaded = false;
                            crowdlogger.io.log.write_to_clrm_db({
                                data: [batch[i]],
                                on_success: function(){process(i+1);},
                                on_error: onError
                            });
                        }
                    }
                }
                process(0);
            }
        });
    };

}