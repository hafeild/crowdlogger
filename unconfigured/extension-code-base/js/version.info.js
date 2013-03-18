/**
 * @fileOverview Provides version information about the browser and extension.<p>
 * 
 * See the  CROWDLOGGER.version.info namespace.<p>
 * 
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */


if( CROWDLOGGER.version === undefined ){
    /**
     * @namespace A namespace for version related functions and utilities.
     */
    CROWDLOGGER.version = {};
}


if( CROWDLOGGER.version.info === undefined ){
/**
 * @namespace Contains functions to get and set version information about
 * the CrowdLogger extension.
 */
CROWDLOGGER.version.info = {
    is_firefox: false,
    is_chrome: false,
    first_start_after_update: false,
    first_start_after_install: false
};

CROWDLOGGER.version.info.init = function(){
 
/**
 * A function to get the current browser name. Valid browser names are:
 * <ul>
 *   <li><tt>ff3</tt>: Firefox 3.5--3.6.*</li>
 *   <li><tt>ff4</tt>: Firefox 4.0*</li>
 *   <li><tt>chrome</tt>: Google Chrome [Currently not supported]</li>
 * </ul>
 *
 * @function
 * @return The browser name (ff3, ff4, or chrome).
 */
CROWDLOGGER.version.info.get_browser_name = (function(){
    var browser_name, app_info, version_checker;
    
    // Determine the browser version. We need some sort of check for whether
    // this is chrome or not. One of: chrome, ff3, ff4.
    try {
        app_info = Components.classes["@mozilla.org/xre/app-info;1"].
            getService(Components.interfaces.nsIXULAppInfo);
        version_checker = 
            Components.classes["@mozilla.org/xpcom/version-comparator;1"].
            getService(Components.interfaces.nsIVersionComparator);

        if( version_checker.compare( app_info.version, "3.9" ) > 0 ) {
            browser_name = "ff4";
        } else {
            browser_name = "ff3";
        } 
        
        /**
         * Compares two version numbers.
         * 
         * @param v1 The first version to compare.
         * @param v2 The second version to compare.
         * 
         * @return 0 if v1 === v2; 1 if v1 >== v2; -1 if v1 <== v2.
         */
        this.compareVersions = function(v1, v2){
            return version_checker.compare(v1, v2);
        }

        CROWDLOGGER.version.info.is_firefox = true;
        
    } catch (e) {
        browser_name = "chrome";
        CROWDLOGGER.version.info.is_chrome = true;
    }

    return function(){
        return browser_name;
    };

    
}());
      

/**
 * A function to get the current extension version. 
 *
 * @function
 * @return The extension version.
 */
CROWDLOGGER.version.info.get_extension_version = (function(){
    var extension_version, browser_name;
    
    // Get the browser name.
    browser_name = CROWDLOGGER.version.info.get_browser_name();
    
    // Determine the extension version. How we do this is dependent
    // on the browser name.
    if( browser_name === "ff3" ) {
        // Find the current extension version.
        var em = Components.classes["@mozilla.org/extensions/manager;1"]
                 .getService(Components.interfaces.nsIExtensionManager);
    
        var addon = em.getItemForID( CROWDLOGGER.extension_name );
        
        var extension_version = addon.version;
        
    } else if( browser_name === "ff4" ) {
        extension_version = undefined;

        // We need to call an async. function to figure out what the version is.
        Components.utils.import("resource://gre/modules/AddonManager.jsm");
        AddonManager.getAddonByID(CROWDLOGGER.extension_name, 
            function( addon ) {
                // This is an asynchronous callback function that might not be 
                // called immediately
                extension_version = addon.version;
            }
        );
    } else if( browser_name === "chrome" ) {
        var version = undefined;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', chrome.extension.getURL('manifest.json'), false);
        xhr.send(null);
        var manifest = JSON.parse(xhr.responseText);
        extension_version = manifest.version;
    }
   
    return function(){
        return extension_version;
    };
}());


/**
 * Takes care of assigning a couple of functions that will retrieve
 * information about the prefixes for this browser.
 */
(function(){
    // Get the browser name.
    var browser_name = CROWDLOGGER.version.info.get_browser_name();

    // This is Firefox.
    if( browser_name.match( /^ff/ ) !== null ){
        /** @ignore */
        CROWDLOGGER.version.info.get_extension_prefix = 
            function(){ return "chrome://crowdlogger/content/"; };
    // This is Chrome.
    } else if( browser_name === "chrome" ) {
        /** @ignore */
        CROWDLOGGER.version.info.get_extension_prefix = 
            function(){ return chrome.extension.getURL(""); 
            };
    }

    // For now, the html, xul, and js directories will be the same for both
    // Chrome and Firefox, once the prefix is taken into consideration.
    if( CROWDLOGGER.version.info.get_extension_prefix !== undefined ){
   
        CROWDLOGGER.version.info.get_extension_html_prefix = 
            function(){ 
                return CROWDLOGGER.version.info.get_extension_prefix()+"html/";
            };
        CROWDLOGGER.version.info.get_extension_xul_prefix =
            function(){ 
                return CROWDLOGGER.version.info.get_extension_prefix()+"xul/";
            };
        CROWDLOGGER.version.info.get_extension_js_prefix =
            function(){ 
                return CROWDLOGGER.version.info.get_extension_prefix()+"js/";
            };
        CROWDLOGGER.version.info.get_extension_css_prefix =
            function(){ 
                return CROWDLOGGER.version.info.get_extension_prefix()+"css/";
            };
        CROWDLOGGER.version.info.get_extension_img_prefix =
            function(){ 
                return CROWDLOGGER.version.info.get_extension_css_prefix()+
                    "img/";
            };
   }

})();

};

} // END CROWDLOGGER.version.info NAMESPACE
