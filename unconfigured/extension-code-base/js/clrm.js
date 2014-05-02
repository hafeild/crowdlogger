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
    const T = 5,
        UPDATE_CHECK_FREQ = 6*60*60*1000; // 6 hours
    var that = this;

    // Private functions.
    var getAvailableCLRMListing, // I.e., from a given repository.
        getAvailableCLRMListings,// I.e., from all registered repositories.
        getInstalledCLRMListing, // Some of these will be local.
        getOverviewCLRMListings, // Includes available and installed.
        generateCLRMElement,
        populateCLRMElement, 
        init,
        trackUpdates;

    // Public functions.
    this.init; this.populateCLRMLibraryPage; this.launchCLRMLibraryPage;
    this.installLocalCLRM; this.installCLRM; this.uninstallCLRM; 
    this.removeCLRMFromDB; this.enableCLRM; this.disableCLRM;
    this.unloadCLRM; this.unloadAllCLRMs; this.loadCLRMIfNecessary;
    this.loadAllEnabledCLRMs; this.open; this.configure; this.getMessage;
    this.updateCLRM; this.updateAllCLRMs; this.addRepository; 
    this.removeRepository;

    // Private function definitions.

    /**
     * Check for CLRM updates and installs updates when available.
     *
     * @param {int} freq The frequency to check for udpates.
     */
    trackUpdates = function(freq){
        setInterval(that.updateAllCLRMs, freq);
    };

    /**
     * Fetches the metadata list of available CLRMs from the server. The 
     * listing is a map of clrmid's to their meta data objects (maps).
     *
     * @param {function} callback  Called when the listing has been made. 
     */
    // getAvailableCLRMListing = function( callback, onError ){
    //     crowdlogger.io.network.send_get_data(
    //         crowdlogger.io.network.get_server_url('clrm_listing_url'),    
    //         'date='+ (new Date().getTime() +'&v='+ 
    //             crowdlogger.version.info.get_extension_version()), 
    //         callback, onError );
    // };
    getAvailableCLRMListing = function( url, callback, onError ){
        crowdlogger.io.network.send_get_data( url,
            'date='+ (new Date().getTime() +'&v='+ 
                crowdlogger.version.info.get_extension_version()), 
            callback, onError );
    };

    /**
     * Fetches the metadata list of available CLRMs from the registered 
     * repositories. These are then merged into a single listed. The listing is
     * a map of clrmid's to their meta data objects (maps).
     *
     * @param {function} callback  Called when the listing has been made. 
     */
    getAvailableCLRMListings = function( callback, onError, urls ){
        if( !urls ) {
            urls = [crowdlogger.io.network.get_server_url(
                'clrm_listing_url')].concat(
                    JSON.parse(crowdlogger.preferences.get_char_pref(
                        'clrm_repositories')));
        }

        var i = 0, 
            metadata = {};

        // Merges the metadata between repositories.
        var addMetadata = function(i, data){
            var name,
                urlParts = urls[i].split(/\//),
                domain = urlParts.length > 1 ? urlParts[2] : urls[i];
            data = JSON.parse(data);


            // For each of the names in the metadata, prepend the domain.
            for( name in data ){
                var newName = domain +'__'+ name;
                metadata[newName] = data[name];
                metadata[newName].clrmid = newName;
            } 

            i++;

            // Process the next url.
            if( i < urls.length ){
                getAvailableCLRMListing(urls[i], function(data){
                    addMetadata(i, data)
                }, onError);
            } else {
                callback(metadata);
            }
        };
        
        getAvailableCLRMListing(urls[i], function(data){
            addMetadata(i, data)
        }, onError);
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
        getAvailableCLRMListings(function(metadata){
            crowdlogger.debug.log('Retrieved available CLRMs');

            //availableCLRMs = JSON.parse(d); 
            availableCLRMs = metadata;
            combine();
        }, onError);
        getInstalledCLRMListing(function(d){
            crowdlogger.debug.log('Retrieved installed CLRMs');
            installedCLRMs = d; 
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
    populateCLRMElement = function( elm, clrmMetadata ){
        var msg;
        //elm.attr('data-clrmid', clrmMetadata.clrmid);
        elm.attr({
            'data-clrmid': clrmMetadata.clrmid,
            'data-metadata': JSON.stringify(clrmMetadata)
        });

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

        if( crowdlogger.preferences.get_bool_pref('dev_mode', false) ){
            elm.addClass('dev-mode');
        } else {
            elm.addClass('not-dev-mode');
        }

        elm.find('[data-id=clrm]').attr('data-clrmid', clrmMetadata.clrmid);


        if( clrmMetadata.logoURL ){
            elm.find('[data-id=logo]').attr('src', clrmMetadata.logoURL);
        }

        elm.find('[data-id=name]').html(clrmMetadata.name);

        elm.find('[data-id=description]').html(clrmMetadata.description);

        // Sets the message if there is a spot for it in the element we are
        // populating.
        msg = elm.find('[data-id=message]');
        if( msg.length > 0 ){
            crowdlogger.api.cli.base.invokeCLRMMethod({
                clrmid: clrmMetadata.clrmid,
                method: 'getMessage',
                on_success: function(message){
                    crowdlogger.debug.log('Attempting to add message to page:');
                    crowdlogger.debug.log(message);
                    msg.html(message);
                },
                on_error: function(e){
                    msg.html('Error retrieving messages...'+ e);
                }
            });
        }

        return elm;
    };


    // Public functions.

    /**
     * Initializes things, including checking for updates.
     */
    this.init = function(){

        // Update all CLRMs and load the enabled ones.
        that.updateAllCLRMs(
            that.loadAllEnabledCLRMs, 
            that.loadAllEnabledCLRMs);

        // Track updates.
        trackUpdates(UPDATE_CHECK_FREQ);
    };

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
    this.populateCLRMLibraryPage = function(doc, callback, onError, 
            installedOnly){
        var jq = doc.defaultView.jQuery;

        var onSuccess = function(allMetadata){
            crowdlogger.debug.log('Adding CLRMs to library page.');
            var clrmid;
            for(clrmid in allMetadata){
                var metadata = allMetadata[clrmid];

                if( !metadata.installed && installedOnly ){
                    continue;
                }

                crowdlogger.debug.log('Attempting to add '+ clrmid);
                crowdlogger.debug.log('Metadata: '+ JSON.stringify(metadata));
                try{
                    var used = false;
                    //var jqElm = generateCLRMElement(jq, metadata);
                    var jqElm = populateCLRMElement(
                        jq('#clrm-template').clone().attr('id', ''), metadata);
                    jqElm.show();

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
            on_success: function(thePackage){
                crowdlogger.debug.log('Heard back from database; package: '+ 
                    thePackage);
                if(thePackage && thePackage.id){ clrmPackage.id = thePackage.id; }
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
     * @param {object} fields           A set of fields to set in the installed
     *                                  version, e.g., {enabled: true}.
     */
    this.installCLRM = function( clrmMetadata, onSuccess, onError, fields ){
        // Download the CLRM package.
        if( !clrmMetadata.packageURL ){
            if( onError ){ onError('installCLRM requires the CLRM metadata '+
                'to include a "packageURL" field.'); }
            return;
        }

        // Fetch the URL and save it.
        crowdlogger.io.network.send_get_data(clrmMetadata.packageURL, 
            't='+ (new Date().getTime()),
            function(response){ 
                var thePackage = JSON.parse(response), field;
                if(clrmMetadata.id){
                    thePackage.id = clrmMetadata.id;
                }
                for( field in fields ){
                    thePackage.metadata[field] = fields[field];
                }

                thePackage.metadata.clrmid = clrmMetadata.clrmid;
                thePackage.clrmid = thePackage.metadata.clrmid;
                crowdlogger.io.log.write_to_clrm_db({
                    data: [thePackage],
                    on_success: onSuccess
                });
            }, 
            onError
        );
    };

    /**
     * Uninstalls a CLRM by its id. This involves unloading the CLRM and then
     * with an 'uninstall' reason and then removing it from the database of
     * installed CLRMs. The CLRM must currently be installed.
     *
     * @param {string} clrmid           The id of the CLRM to uninstall.
     * @param {function} onSuccess      A function to invoke upon successfully
     *                                  uninstalling the CLRM.
     * @param {function} onError        A function to invoke upon error.
     */
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
                on_success: uninstall,
                on_error: onError
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

    /**
     * Removes a CLRM from the installed CLRM database.
     *
     * @param {string} clrmid     The id of the CLRM to remove.
     * @param {function} onSuccess      A function to invoke upon successfully
     *                                  removing the CLRM.
     * @param {function} onError        A function to invoke upon error.
     */
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

    /**
     * Enables a CLRM by its id. The CLRM must be installed. If there is an
     * error loading the CLRM, it will be marked in the database as enabled,
     * but the 'loaded' field will be set to false.
     *
     * @param {object} clrmid           The id of the CLRM to enable.
     * @param {function} onSuccess      A function to invoke upon successfully
     *                                  enabling the CLRM.
     * @param {function} onError        A function to invoke upon error.
     */
    this.enableCLRM = function( clrmid, onSuccess, onError ){
        // Get the associated package.
        crowdlogger.debug.log('Enabling package '+ clrmid);
        crowdlogger.io.log.get_clrm_entry({
            clrmid: clrmid,
            on_success: function(thePackage){
                // Load the package.
                crowdlogger.debug.log('Loading package '+ thePackage.clrmid +'...');
                crowdlogger.api.cli.base.loadCLRMFromString(
                    JSON.stringify(thePackage), function(){
                        // Once loaded, save the state as enabled.
                        thePackage.metadata.enabled = true;
                        thePackage.metadata.loaded = true;
                        crowdlogger.io.log.write_to_clrm_db({
                            data: [thePackage],
                            on_success: onSuccess
                        });
                    }, function(){
                        crowdlogger.debug.log('Package '+ thePackage.clrmid +
                            ' loaded; marking as enabled.');
                        // Once loaded, save the state as enabled.
                        thePackage.metadata.enabled = true;
                        thePackage.metadata.loaded = false;
                        crowdlogger.io.log.write_to_clrm_db({
                            data: [thePackage],
                            on_success: onSuccess
                        });
                    }
                );
            },
            on_error: onError
        });
    };

    /**
     * Disables a CLRM by id. The CLRM must exist in the installed CLRM 
     * database. If loaded, the CLRM will be unloaded with a reason of 
     * 'disable'. In the database, the CLRM will be marked as disabled and
     * unloaded.
     *
     * @param {string} clrmid           The id of the CLRM to disable.
     * @param {function} onSuccess      A function to invoke upon successfully
     *                                  disabling the CLRM.
     * @param {function} onError        A function to invoke upon error.    
     */
    this.disableCLRM = function( clrmid, onSuccess, onError ){
        that.unloadCLRM({
            clrmid: clrmid, 
            reason: 'disable', 
            on_success: onSuccess, 
            on_error: onError
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
     *     <li>{function} on_success Invoked when the CLRM has been successfully
     *                              unloaded.
     *     <li>{function} on_error   Invoked when an error is encountered.
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
            on_success: function(thePackage){
                // Unload the package
                crowdlogger.api.cli.base.unloadCLRM(opts.clrmid, opts.reason, 
                    function(){
                        // Once unloaded, save the state as disabled.
                        if( opts.reason.match(/(uinstall)|(disable)/) ){
                            thePackage.metadata.enabled = false;
                        }
                        thePackage.metadata.loaded = false;
                        crowdlogger.io.log.write_to_clrm_db({
                            data: [thePackage],
                            on_success: opts.on_success
                        });
                    }, opts.on_error );
            },
            on_error: opts.on_error
        });
    };

    /**
     * Unloads each installed CLRM. Any errors encountered are emitted and the
     * next CLRM is processed.
     *
     * @param {string} reason           The reason ('uninstall', 'disable',
     *                                  'shutdown', 'newversion').
     * @param {function} onSuccess      A function to invoke upon successfully
     *                                  installing the CLRM.
     * @param {function} onError        A function to invoke upon error.    
     */
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
                        that.unloadCLRM({
                            clrmid: batch[i].clrmid,
                            reason: reason,
                            on_success: function(){ process(i+1); },
                            on_error: function(e){
                                if(onError){
                                    setTimeout(function(){onError(e)}, T);
                                }
                                process(i+1);
                            }
                        })
                    }
                }
                process(0);
            }
        });
    };

    /**
     * Loads an installed CLRM, but only if it is not currently loaded.
     *
     * @param {string} clrmid           The id of the CLRM to load.
     * @param {function} onSuccess      A function to invoke upon successfully
     *                                  loading the CLRM.
     * @param {function} onError        A function to invoke upon error.    
     */
    this.loadCLRMIfNecessary = function( clrmid, onSuccess, onError ){
        // Get the associated package.
        crowdlogger.io.log.get_clrm_entry({
            clrmid: clrmid,
            on_success: function(thePackage){
                // Unload the package
                if(thePackage.metadata.loaded){
                    if(onSuccess){ onSuccess() };
                } else {
                    crowdlogger.api.cli.base.loadCLRMFromString(
                        JSON.stringify(thePackage), function(){
                            // Once loaded, save the state as enabled.
                            thePackage.metadata.enabled = true;
                            thePackage.metadata.loaded = true;
                            crowdlogger.io.log.write_to_clrm_db({
                                data: [thePackage],
                                on_success: onSuccess
                            });
                        }, onError );
                }
            },
            on_error: onError
        });
    };

    /**
     * Loads all enabled CLRMs. When an error is encountered, it is emitted and
     * processing moves on to the next CLRM. 
     *
     * @param {function} onSuccess      A function to invoke upon successfully
     *                                  enabling all CLRMs.
     * @param {function} onError        A function to invoke upon error.    
     */
    this.loadAllEnabledCLRMs = function(onSuccess, onError){
        var update, install, enable;

        crowdlogger.debug.log('Loading all enabled CLRMs');

        enable = function(clrmid, onSuccess, onError){
            crowdlogger.debug.log('Enabling '+ clrmid);
            that.enableCLRM( clrmid, onSuccess, onError );
        };

        install = function(clrmMetadata, onSuccess, onError){
            crowdlogger.debug.log('Updating '+ clrmMetadata.clrmid);
            that.installCLRM(clrmMetadata, function(){
                enable(clrmMetadata.clrmid, onSuccess, onError);
            }, onError);
        };

        update = function(clrmListing){
            var instlledCLRMs = [], processNext, clrmid, onErr;

            for(clrmid in clrmListing){
                if(clrmListing[clrmid].installed)
                instlledCLRMs.push(clrmListing[clrmid]);
            }

            processNext = function(){
                if(instlledCLRMs.length > 0){
                    var clrmMetadata = instlledCLRMs.shift();
                    if( clrmMetadata.updateAvailable ){
                        install(clrmMetadata, processNext, onErr);
                    } else if( clrmMetadata.enabled ) {
                        enable(clrmMetadata.clrmid, processNext, onErr);
                    } else {
                        processNext();
                    }
                } else {
                    if(onSuccess){ onSuccess(); }
                }
            };

            processNext();
        };

        onErr = function(e){
            if(onError){ setTimeout(function(){onError(e)}, T);}
            processNext();
        }

        getOverviewCLRMListing(update, onError);
    };


    /**
     * Invokes the given CLRM's 'open' method.
     *
     * @param {string} clrmid           The id of the CLRM.
     * @param {function} onSuccess      A function to invoke upon successfully
     *                                  opening the CLRM.
     * @param {function} onError        A function to invoke upon error.    
     */
    this.open = function(clrmid, onSuccess, onError){
        crowdlogger.api.cli.base.invokeCLRMMethod({
            clrmid: clrmid,
            method: 'open',
            on_success: onSuccess,
            on_error: onError
        });
    };

    /**
     * Invokes the given CLRM's 'configure' method.
     *
     * @param {string} clrmid           The id of the CLRM.
     * @param {function} onSuccess      A function to invoke upon successfully
     *                                  opening the CLRM's configuration.
     * @param {function} onError        A function to invoke upon error.    
     */
    this.configure = function(clrmid, onSuccess, onError){
        crowdlogger.api.cli.base.invokeCLRMMethod({
            clrmid: clrmid,
            method: 'configure',
            on_success: onSuccess,
            on_error: onError
        });
    };

    /**
     * Invokes the given CLRM's 'getMessage' method.
     *
     * @param {string} clrmid           The id of the CLRM.
     * @param {function} onSuccess      A function to invoke with the result of
     *                                  invoking the getMessage method.
     * @param {function} onError        A function to invoke upon error.    
     */
    this.getMessage = function(clrmid, onSuccess, onError){
        crowdlogger.api.cli.base.invokeCLRMMethod({
            clrmid: clrmid,
            method: 'getMessage',
            on_success: onSuccess,
            on_error: onError
        });
    };

    /**
     * Updates the given CLRM by unloading and installing the update. If the
     * currently loaded CLRM is not ready to be updated, the update is installed
     * in the database, but the currently loaded version is kept untouched.
     *
     * @param {object} clrmMetadata     The CLRM's metadata.
     * @param {function} onSuccess      A function to invoke upon successfully
     *                                  opening the CLRM.
     * @param {function} onError        A function to invoke upon error.    
     */
    this.updateCLRM = function(clrmMetadata, onSuccess, onError){
        var install, unload;
        install = function(enable){
            enable = enable === undefined ? clrmMetadata.enabled : enable;
            crowdlogger.debug.log('Installing '+ clrmMetadata.clrmid);
            that.installCLRM(clrmMetadata, function(){
                if( enable ){
                    crowdlogger.debug.log('Enabling '+ clrmMetadata.clrmid);
                    that.enableCLRM(clrmMetadata.clrmid, onSuccess, onError);
                } else if(onSuccess) {
                    onSuccess();
                }
            }, onError, {enabled: clrmMetadata.enabled});
        };

        unload = function(isOkayToUpdate){
            if( isOkayToUpdate ){
                crowdlogger.debug.log('Unloading '+ clrmMetadata.clrmid);
                that.unloadCLRM({
                    clrmid: clrmMetadata.clrmid, 
                    reason: 'newversion',
                    on_success: install,
                    on_error: install
                });
            } else {
                install(false);
            }
        };

        // Check that the CLRM is in a good spot to uninstall.
        crowdlogger.api.cli.base.invokeCLRMMethod({
            clrmid: clrmMetadata.clrmid, 
            method: 'isOkayToUpdate',
            on_success: unload,
            on_error: install
        });
    };

    /**
     * Updates all installed CLRMs, if updates are available. If a CLRM has an
     * update, it is unloaded (if possible) prior to being updated. Unless an
     * error is encountered, the stored version will be updated regardless of
     * whether a CLRM is loaded or read to be updated. If there is a problem
     * with any of the CLRMs, an error is emitted and the next one is processed.
     *
     * @param {function} onSuccess      A function to invoke upon successfully
     *                                  updating all the installed CLRMs.
     * @param {function} onError        A function to invoke upon error.    
     */
    this.updateAllCLRMs = function(onSuccess, onError){
        crowdlogger.debug.log('Updating all CLRMS...');

        var update = function(clrmListing){
            var updatableCLRMs = [], clrmid, processNext;
            for(clrmid in clrmListing){
                if( clrmListing[clrmid].updateAvailable ){
                    updatableCLRMs.push( clrmListing[clrmid] );
                }
            }

            processNext = function(){
                if(updatableCLRMs.length > 0){
                    crowdlogger.debug.log('Found update:');
                    crowdlogger.debug.log(updatableCLRMs[0]);
                    that.updateCLRM(
                        updatableCLRMs.shift(), 
                        processNext, 
                        function(e){
                            if(onError){ setTimeout(function(){onError(e)});}
                            processNext();
                        });
                } else if(onSuccess){ 
                    onSuccess();
                }
            }

            processNext();
        };

        getOverviewCLRMListing(update, onError);
    };

    /**
     * Adds the given URL to the list of CLRM repositories. Repository URLs
     * should point to a page that will produce a JSON listing of CLRMs
     * available from that repository.
     *
     * @param {string} url   The URL of the repository.
     */
    this.addRepository = function(url){
        var urls = JSON.parse(
            crowdlogger.preferences.get_char_pref('clrm_repositories'));
        urls.push(url);
        crowdlogger.preferences.set_char_pref('clrm_repositories', 
            JSON.stringify(urls));
    };

    /**
     * Removes the given URL from the list of CLRM repositories (if it is 
     * found). 
     *
     * @param {string} url   The URL of the repository.
     */
    this.removeRepository = function(url){

        var i, newURLs = [],
            origURLs = JSON.parse(
                crowdlogger.preferences.get_char_pref('clrm_repositories'));
        for(i = 0; i < origURLs.length; i++){
            if( origURLs[i] !== url ){
                newURLs.push(origURLs[i]);
            }
        }
        crowdlogger.preferences.set_char_pref('clrm_repositories', 
            JSON.stringify(newURLs));
    };

}