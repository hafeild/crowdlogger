/**
 * @fileOverview Provides functions to access files on disk.<p>
 * 
 * See the  CROWDLOGGER.io.file namespace.<p>
 * 
 * %%LICENSE%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */


// Define the CROWDLOGGER.io namespace if it isn't already.
if( CROWDLOGGER.io === undefined ) {
    CROWDLOGGER.io = {};
}


if( CROWDLOGGER.io.file === undefined ){

/**
 * @namespace Provides functions to access files on disk.
 */
CROWDLOGGER.io.file = {};


/**
 * Initializes the activity and error log IO functions.
 * These are initialized in here, rather than individually because they
 * use a function that we want to keep private, namely being able to write
 * to arbitrary files.
 */
CROWDLOGGER.io.file.init = function(){
    // Private functions available.
    var clear_file;
    var get_extension_directory_handle;
    var get_file_handle;
    var write_to_file;
    var read_file;

    // For file locking.
    var read_locks = {};
    var write_locks = {};

    /**
     * Opens the activity log file in a new window.
     */
    CROWDLOGGER.io.file.display_activity_log = function(){
        window.open( "file://" + get_file_handle(
            CROWDLOGGER.preferences.get_char_pref( "activity_log_name" ) ).
            path );
    };

    /**
     * Writes the given message to the error log, followed by a new line.
     *
     * @param {string} message The message to write to the error log.
     */
    CROWDLOGGER.io.file.write_to_error_log = function( message ){
        var file = get_file_handle( 
            CROWDLOGGER.preferences.get_char_pref( "error_log_name" ) );

        //B_DEBUG
        CROWDLOGGER.debug.log( "\nTO ERROR LOG:\n\t" + message + "\n\n" );
        //E_DEBUG

        if( !file ){
            CROWDLOGGER.debug.log( "Error writing to error log!\n" );
            return null;
        }
   
        // Write the message to the activity log.
        write_to_file( file, message+"\n" );
    };
    
    
    /**
     * Writes the given message to the activity log, followed by a new line.
     *
     * @param {string} message The message to write to the activity log.
     */
    CROWDLOGGER.io.file.write_to_activity_log = function( message ) {
        var file = get_file_handle( 
            CROWDLOGGER.preferences.get_char_pref( "activity_log_name" ) );

        //B_DEBUG
        CROWDLOGGER.debug.log( "\nTO ACTIVITY LOG:\n\t" + message + "\n\n" );
        //E_DEBUG
 
        if( !file ){
            CROWDLOGGER.debug.log( "Error writing to activity log!\n" );
            return null;
        }
   
        // Write the message to the activity log.
        write_to_file( file, message+"\n" );
    };


    /**
     * An alias for CROWDLOGGER.io.file.write_to_activity_log.
     * @name CROWDLOGGER.io.file.log
     * @function
     *
     * @param {string} message The message to write to the activity log.
     */
    CROWDLOGGER.io.file.log = CROWDLOGGER.io.file.write_to_activity_log;



    /**
     * Clears the error log.
     */
    CROWDLOGGER.io.file.clear_error_log = function() {
        // Get the file.
        var file = get_file_handle(
            CROWDLOGGER.preferences.get_char_pref( "error_log_name" ) );

        // Clear it.
        clear_file( file );
    };


    /**
     * Clears the activity log.
     */
    CROWDLOGGER.io.file.clear_activity_log = function() {
        // Get the file.
        var file = get_file_handle(
            CROWDLOGGER.preferences.get_char_pref( "activity_log_name" ) );

        // Clear it.
        clear_file( file );
    };

    

    /**
     * Asynchronously reads the contents of the activity log and sends it
     * to the given callback function.
     * 
     * @param {function} callback The callback function to invoke when the
     *      activity log has been read into memory. It should take one 
     *      parameter: a string containing the contents of the activity log. 
     */
    CROWDLOGGER.io.file.read_activity_log = function( callback ){
        var file = get_file_handle(
            CROWDLOGGER.preferences.get_char_pref( "activity_log_name" ) );

        if( !file ){
            CROWDLOGGER.debug.log( "Error reading from the activity log!\n" );
            return null;
        }

        // Read the activity log.
        read_file( file, callback );
    };

    /**
     * Asynchronously reads the contents of the error log and sends it
     * to the given callback function.
     * 
     * @param {function} callback The callback function to invoke when the
     *      error log has been read into memory. It should take one 
     *      parameter: a string containing the contents of the activity log. 
     */
    CROWDLOGGER.io.file.read_error_log = function( callback ){
        var file = get_file_handle(
            CROWDLOGGER.preferences.get_char_pref( "error_log_name" ) );

        if( !file ){
            CROWDLOGGER.debug.log( "Error reading from the error log!\n" );
            return null;
        }

        // Read the activity log.
        read_file( file, callback );
    };

    
    /**
     * Asynchronously reads the entire contents of a file and sends it to
     * the given callback function. The callback should take one parameter:
     * a string containing the contents of the file.
     * @funciton
     * @private
     * @member CROWDLOGGER.io.file
     *
     * @param {Object} file The nsIFile to read.
     * @param {function} callback A callback function to invoke when the file
     *      has been read. It should take one parameter: a string containing
     *      the contents of the file.
     */
    read_file = function(){
        var lock_timeout = 10; // 10 milliseconds.
        var read, wait_to_read;

        // Asynchronously reads the given file. On completion, the contents
        // is given to the callback function.
        /** @ignore */
        read = function( file, callback ){
            // Most of what is below was taken from 
            // https://developer.mozilla.org/en/Code_snippets/File_I%2F%2FO

            // In short, everything from the file will be added to a stream
            // asynchronously. We make an observer that waits for the stream
            // to be closed. When it is, we know the file contents have all
            // been read and we can go ahead and call the callback function.

            var app_info = Components.classes["@mozilla.org/xre/app-info;1"].
              getService(Components.interfaces.nsIXULAppInfo);

            var is_on_branch = app_info.platformVersion.indexOf("1.8") == 0;

            var ios = Components.classes["@mozilla.org/network/io-service;1"].
                      getService(Components.interfaces.nsIIOService);

            var file_uri = ios.newFileURI( file );

            var channel = ios.newChannelFromURI( file_uri );

            // An observer that will wait for the stream to finish filling up. 
            var observer = {
                /** @ignore */
                onStreamComplete : 
                        function( loader, context, status, length, result ){

                    // The incoming data is in byte format, so we need to
                    // convert it.
                    var data;

                    // Taken from http://mxr.mozilla.org/mozilla/source/
                    // calendar/base/src/calProviderUtils.js
                    var result_converter = Components.
                        classes["@mozilla.org/intl/scriptableunicodeconverter"]
                        .createInstance(Components.interfaces.
                        nsIScriptableUnicodeConverter);

                    result_converter.charset = 
                        CROWDLOGGER.preferences.get_char_pref( 
                            "log_encoding", "UTF-8");

                    data = result_converter.convertFromByteArray(
                        result, length);

                    //B_DEBUG
                    //CROWDLOGGER.debug.log( "Data: " + data + "\n" );
                    //E_DEBUG

                    // Invoke the callback function.
                    callback( data );

                    // We're finished reading, so decrement the read lock count.
                    read_locks[file.path] = 
                        Math.max(read_locks[file.path]-1, 0);
                }
            };

            var sl = Components.classes["@mozilla.org/network/stream-loader;1"].
                     createInstance(Components.interfaces.nsIStreamLoader);

            // Start reading the contents.
            if (is_on_branch) {
              sl.init( channel, observer, null );
            } else {
              sl.init(observer);
              channel.asyncOpen( sl, channel );
            }
        };

        // Reads the file and sends the output to the callback as soon as
        // all of the writes are finished.
        /** @ignore */
        wait_to_read = function( file, callback ){
            // Make sure we have read and write locks for this file.
            if( write_locks[file.path] === undefined ){
                write_locks[file.path] = 0;
            }
            if( read_locks[file.path] === undefined ){
                read_locks[file.path] = 0;
            }
            

            // Timeout for a bit if there are still write locks out.
            if( write_locks[file.path] > 0 ){
                setTimeout( function(){ 
                    read( file, callback );  
                }, lock_timeout );
                return false;
            }

            // We can start reading.
            read_locks[file.path]++;

            // Attempt to read.
            try{
                read( file, callback );
            } catch( e ) {
                CROWDLOGGER.debug.log( 
                    "!!! Error reading from file " + file.path + ": " + 
                    e + "\n" );
                // We have to assume the read count was not decremented.
                read_locks[file.path] = Math.max( read_locks[file.path]-1, 0 );
            }
            
        };

        return wait_to_read;

    }();


    /**
     * Writes the given message to the file specified file.
     * @function
     * @private
     * @member CROWDLOGGER.io.file
     *
     * @param {Object} file The nsIFile file handle to write to.
     * @param {string} message The message to write to the given file.
     */
    write_to_file = function( file, message ){
        var buffer, next_ticket_to_process, next_free_ticket, max_ticket_num;
        var get_ticket_number, process_write_request, write;
        var buffer_timeout = 10; // 10 milliseconds.
        var lock_timeout   = 10; // 10 milliseconds.
        
        // We'll start off with some maximum ticket capacity (it'll wrap around
        // at the end, and we'll just hope that it's sufficiently large that
        // we won't run into problems with the snake eating it's tail.
        max_ticket_num = 1000000;
        next_ticket_to_process = 0;
        next_free_ticket = 0;
        
        // Write the given message to the given file.
        /** @ignore */
        write = function( file, message ){
            var charset = CROWDLOGGER.preferences.get_char_pref( 
                "log_encoding", "UTF-8" );

            // Open up the file stream and set it to append.
            var fo_stream = Components.
                classes["@mozilla.org/network/file-output-stream;1"].
                createInstance(Components.interfaces.nsIFileOutputStream);
            fo_stream.init( file, 0x02 | 0x08 | 0x10, 0600, 0 );//append

            // We must use a conversion stream here to properly handle 
            // multi-byte character encodings
            var converter_stream = Components.
                classes['@mozilla.org/intl/converter-output-stream;1'].
                createInstance(Components.interfaces.nsIConverterOutputStream);
            converter_stream.init( fo_stream, charset, message.length, 
                Components.interfaces.nsIConverterInputStream.
                    DEFAULT_REPLACEMENT_CHARACTER);

            // Append the message to the end of the file.
            converter_stream.writeString( message );

            // Close the streams.
            converter_stream.close();
            fo_stream.close();

        };

        // Processes the current write.
        /** @ignore */
        process_write_request = function( file, message ){
            if( write_locks[file.path] === undefined ){
                write_locks[file.path] = 0;
            }
            if( read_locks[file.path] === undefined ){
                read_locks[file.path] = 0;
            }
 
            /*//B_DEBUG
            CROWDLOGGER.debug.log( "write_locks: " + write_locks + "\n\t" +
                "write_locks[file.path]: " + 
                write_locks[file.path] + "\n" );
            //E_DEBUG*/

            // Are there still locks out? (there shouldn't be any write
            // locks...but there may be read locks)
            if( write_locks[file.path] > 0 ){
                CROWDLOGGER.debug.log( "!!! There are write locks out...BAD!\n" );
            }

            // Keep trying unless the locks are all in.
            if( write_locks[file.path] > 0 || read_locks[file.path] > 0 ){
                setTimeout( function(){ 
                    process_write_request( file, message );
                } , lock_timeout );
                return false;
            }

            // We're now writing.
            write_locks[file.path]++;

            try{
                write( file, message );
            } catch( e ){
                CROWDLOGGER.debug.log( "There was an error writing data to " +
                    "the file: " + e + "\n" );
            }


            // We're finished writing.
            write_locks[file.path]--;
            
            // Update the current ticket.
            next_ticket_to_process = (next_ticket_to_process+1)%max_ticket_num;
        
        };

        
        // Gets the next free ticket. We're hoping that the order of operations
        // will cut down on the possibility of race conditions.
        /** @ignore */
        get_ticket_number = function(){
            next_free_ticket = (next_free_ticket+1) % max_ticket_num;
            if( next_free_ticket > 0 ){
                return next_free_ticket-1;
            } else {
                return max_ticket_num-1;
            }
        };

        // Holds the queue of the pending file write operations.
        /** @ignore */
        buffer = function( file, message, ticket_number ) {
            if( ticket_number ==  next_ticket_to_process ) {
                process_write_request( file, message );
            } else {
                setTimeout( function(){ 
                    buffer( file, message, ticket_number );
                }, buffer_timeout );
            }

        };


        return function( file, message ){
            var ticket_number = get_ticket_number();
            buffer( file, message, ticket_number );
        };
    }(); 
 
    
    /**
     * Get's the file handle for the given filname. It is assumed that the
     * file is located in a subdirectory called crowdlogger in the profile 
     * directory.
     * @function
     * @private
     * @member CROWDLOGGER.io.file
     *
     * @param {string} filename The name of the file to get a handle for.
     * @return {Object} The nsIFile for the given file name.
     */
    get_file_handle = function( filename ){
        
        // Get the extension directory handle.
        var file = get_extension_directory_handle();
    
        // Make sure it's valid.
        if( !file ){
            return null;
        }
    
        // Append the given filename to the handle.
        file.append( filename );
    
        return file;
    };
    
    
    /**
     * Returns a handle to the extension directory. If the crowdlogger subdirectory
     * does not exist, it is created.
     * @function
     * @private
     * @member CROWDLOGGER.io.file
     *
     * @return {Object} A directory handle (nsIFile).
     */
    get_extension_directory_handle = function(){
    
        var dir, dir_service;
    
        // Get the service through which we get the profile directory.
        dir_service = 
            Components.classes["@mozilla.org/file/directory_service;1"].
            getService(Components.interfaces.nsIProperties);
    
        // Make sure it is not null.
        if( !dir_service )
        {
            return null;
        }
    
        // Get the profile directory.
        dir = dir_service.get("ProfD", Components.interfaces.nsIFile);
    
        // Make sure it's not null.
        if( !dir ){
            return null;
        }
    
        // Append our extension's directory name to the end of the directory.
        dir.append(
            CROWDLOGGER.preferences.get_char_pref("extension_directory_name") );
    
        // Check if the directory exists. If not, create it.
        if( !dir.exists() ){
            dir.create( Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755 );
        }
    
        return dir;
    };
    

    /**
     * Clears the given file. Currently, this is done by removing the file
     * altogether.
     *
     * @param {object} file An nsIFile object.
     */
    clear_file = function( file ){
        if( file && file.exists() ){
            file.remove(false); // Non-recursive.
        }
    };
};

}


