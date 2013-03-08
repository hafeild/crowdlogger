/**
 * @fileOverview Provides functions for getting and setting preferences.<p>
 * 
 * See the CROWDLOGGER.preferences namespace.<p>
 * 
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */


if( CROWDLOGGER.preferences === undefined ) {

/**
 * @namespace Contains utilities for getting and setting preferences.
 */
CROWDLOGGER.preferences = {
    // Gets the preference object for the given browser.
    init: function(){
//B_DEBUG
        CROWDLOGGER.debug.log( "In CROWDLOGGER.preferences.pref function.\n" );
//E_DEBUG
        var browser_name = CROWDLOGGER.version.info.get_browser_name();
        if( browser_name === "ff3" || browser_name === "ff4" ) {
            var pref = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService).
                getBranch("crowdlogger.");
//B_DEBUG
                CROWDLOGGER.debug.log( "\tpref: " + pref + "\n" );
//E_DEBUG
            CROWDLOGGER.preferences.pref = pref;
        } else if( browser_name === "chrome" ){
            CROWDLOGGER.preferences.pref = localStorage;
        }
    }
};


/**
 * This is a closure that will define the g/set_char_pref, g/set_bool_pref,
 * and gs/et_int_pref functions in the CROWDLOGGER.preferences namespace.
 */
CROWDLOGGER.preferences.init = function(){

    //B_DEBUG
    CROWDLOGGER.debug.log( "In CROWDLOGGER.preferences.pref function.\n" );
    //E_DEBUG

    // The bowser we're using.
    var browser_name = CROWDLOGGER.version.info.get_browser_name();
    if( browser_name === "ff3" || browser_name === "ff4" ) {
        var pref = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService).
            getBranch("crowdlogger.");
        //B_DEBUG
        CROWDLOGGER.debug.log( "\tpref: " + pref + "\n" );
        //E_DEBUG
        CROWDLOGGER.preferences.pref = pref;
    } else if( browser_name === "chrome" ){
        CROWDLOGGER.preferences.pref = localStorage;
    }


    //B_DEBUG
    CROWDLOGGER.debug.log( "Entering anonymous closure to set up " +
        "g/set_*_pref functions.\n" );
    CROWDLOGGER.debug.log( "\tBrowser name: " + browser_name + "\n" );
    //E_DEBUG

    /**
     * Retrieves the preference in Firefox.
     *
     * @param {string} pref_name The name of the preference.
     * @param {string} default_value The value to return if the preference 
     *                               has yet to be set.
     */
    var get_char_pref_firefox = function( pref_name, default_value ){
        var value;

        try{ 
            value = CROWDLOGGER.preferences.pref.getCharPref( pref_name );
        } catch( e ) {
            value = default_value;
        }

        return value;
    };

    /**
     * Sets the given preference in Firefox.
     *
     * @param {string} pref_name The name of the preference.
     * @param {string} value The value to return if the preference 
     *                       has yet to be set.
     */
    var set_char_pref_firefox = function( pref_name, value ){
        CROWDLOGGER.preferences.pref.setCharPref( pref_name, value );
    
//B_DEBUG
        CROWDLOGGER.debug.log( "Setting " + pref_name + " to " + value + "\n" );
//E_DEBUG

    };



    /**
     * Retrieves the preference in Firefox.
     *
     * @param {string} pref_name The name of the preference.
     * @param {boolean} default_value The value to return if the preference 
     *                                has yet to be set.
     */
    var get_bool_pref_firefox = function( pref_name, default_value ){
        var value;

        try{
            value = CROWDLOGGER.preferences.pref.getBoolPref( pref_name );
        } catch( e ) {
            value = default_value;
        }

        return value;
    };


    /**
     * Sets the given boolean preference in Firefox.
     *
     * @param {string} pref_name The name of the preference.
     * @param {string} value The value to return if the preference 
     *                       has yet to be set.
     */
    var set_bool_pref_firefox = function( pref_name, value ){
        CROWDLOGGER.preferences.pref.setBoolPref( pref_name, value );
    };



    /**
     * Retrieves the preference in Firefox.
     *
     * @param {string} pref_name The name of the preference.
     * @param {int} default_value The value to return if the preference 
     *                            has yet to be set.
     */
    var get_int_pref_firefox = function( pref_name, default_value ){
        var value;

        try{
            value = CROWDLOGGER.preferences.pref.getIntPref( pref_name );
        } catch( e ) {
            value = default_value;
        }

        return value;
    };

    /**
     * Sets the given int preference in Firefox.
     *
     * @param {string} pref_name The name of the preference.
     * @param {int} value The value to return if the preference 
     *                       has yet to be set.
     */
    var set_int_pref_firefox = function( pref_name, value ){
        CROWDLOGGER.preferences.pref.setIntPref( pref_name, value );
    };


    // CHROME CODE

    /**
     * Retrieves the preference in Chrome.
     *
     * @param {string} pref_name The name of the preference.
     * @param {?} default_value The value to return if the preference 
     *                               has yet to be set.
     * @param {string} type One of "boolean", "int", or "string"; specifies
     * what the return value should be parsed as.
     */    
    var get_pref_chrome = function( pref_name, default_value, type ){
        var value = default_value;

        if( CROWDLOGGER.preferences.pref["crowdlogger_" + pref_name] === 
                undefined ){
            return default_value;
        } else {
            var value = CROWDLOGGER.preferences.pref["crowdlogger_"+pref_name];

            if( type === "boolean" ) {
                return value === "true";
            } else if( type === "int" ) {
                return parseInt( value );
            } else {
                return value;
            }
        }

        return value;  
    };

    /**
     * Sets the boolean preference in Chrome.
     *
     * @param {string} pref_name The name of the preference.
     * @param {?} value The value to set. 
     */    
    var set_pref_chrome = function( pref_name, value ){
        //B_DEBUG
        CROWDLOGGER.debug.log( "Setting " + pref_name + " to " + value + "\n" );
        //E_DEBUG

        CROWDLOGGER.preferences.pref["crowdlogger_"+pref_name] = value;
    };

    
    // Figure out which browser this is and set the function to use accordingly.
    if( browser_name === "ff3" || browser_name === "ff4" ) {
        /**
         * Gets the value of the specified string preference.
         * @name CROWDLOGGER.preferences.get_char_pref
         * @function 
         * @param {string} pref_name The preference name.
         * @param {Stirng} default_value The default value.
         * @return {string} The value associated with pref_name.
         */
        CROWDLOGGER.preferences.get_char_pref = get_char_pref_firefox;
        /**
         * Sets the value of the specified string preference.
         * @name CROWDLOGGER.preferences.set_char_pref
         * @function 
         * @param {string} pref_name The preference name.
         * @param {Stirng} value The value to set.
         */
        CROWDLOGGER.preferences.set_char_pref = set_char_pref_firefox;

        /**
         * Gets the value of the specified boolean preference.
         * @name CROWDLOGGER.preferences.get_bool_pref
         * @function 
         * @param {string} pref_name The preference name.
         * @param {boolean} default_value The default value.
         * @return {boolean} The value associated with pref_name.
         */
        CROWDLOGGER.preferences.get_bool_pref = get_bool_pref_firefox;
        /**
         * Sets the value of the specified boolean preference.
         * @name CROWDLOGGER.preferences.set_bool_pref
         * @function 
         * @param {string} pref_name The preference name.
         * @param {boolean} value The value to set.
         */
        CROWDLOGGER.preferences.set_bool_pref = set_bool_pref_firefox;

        /**
         * Gets the value of the specified int preference.
         * @name CROWDLOGGER.preferences.get_int_pref
         * @function 
         * @param {string} pref_name The preference name.
         * @param {int} default_value The default value.
         * @return {int} The value associated with pref_name.
         */
        CROWDLOGGER.preferences.get_int_pref  = get_int_pref_firefox;
        /**
         * Sets the value of the specified int preference.
         * @name CROWDLOGGER.preferences.set_int_pref
         * @function 
         * @param {string} pref_name The preference name.
         * @param {int} value The value to set.
         */
        CROWDLOGGER.preferences.set_int_pref = set_int_pref_firefox;


    } else if( browser_name === "chrome" ) {
        CROWDLOGGER.preferences.get_char_pref = 
            function(k,v){ return get_pref_chrome(k,v,"string");};
        CROWDLOGGER.preferences.set_char_pref = set_pref_chrome;
        CROWDLOGGER.preferences.get_bool_pref = 
            function(k,v){ return get_pref_chrome(k,v,"boolean");};
        CROWDLOGGER.preferences.set_bool_pref = set_pref_chrome;
        CROWDLOGGER.preferences.get_int_pref  =
            function(k,v){ return get_pref_chrome(k,v,"int");};
        CROWDLOGGER.preferences.set_int_pref  = set_pref_chrome;
    }
};


} // END CROWDLOGGER.preferences NAMESPACE
