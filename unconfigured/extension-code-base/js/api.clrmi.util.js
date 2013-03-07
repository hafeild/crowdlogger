/**
 * @fileOverview <p>Provides utilities to the CrowdLogger Remote Module (CLRM)
 * Interface (CLRMI).</p>
 *
 * %%COPYRIGHT%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

CLRMI.prototype.Util = function(){
    var that = this;

    /**
     * An exception. Holds an error message.
     */
    this.CLRMIException = function(message){
        this.toString = function(){ return message; };
    };

    /**
     * Checks if <code>argsMap</code> contains all of the field names specified
     * in <code>requiredFields</code>.
     *
     * @param {object} argsMap                   A map of arguments.
     * @param {array of strings} requiredFields  The names of fields that should
     *                                           appear in <code>argsMap</code>.
     * @param {string} functionName              The name of the function the
     *                                           check is for (for error 
     *                                           reporting).
     * @throws CLRMIException if any of the required fields are not found.
     */
    this.checkArgs = function(argsMap, requiredFields, functionName){
        var i, missingArgs = [];
        argsMap = argsMap || {};
        for( i = 0; i < requiredFields.length; i++ ){
            if( argsMap[requiredFields[i]] === undefined ){
                missingArgs.push(requiredFields[i]);
            }
        }
        if( missingArgs.length > 0 ){
            throw new that.CLRMIException('Call to '+ functionName +
                ' is missing the following required fields: '+ 
                missingArgs.join(','));
        }
    };



};