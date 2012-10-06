// Author:  Henry Feild
// File:    Constants.java
// Date:    21-Apr-2011
//
// %%LICENSE%%
package edu.umass.ciir.crowdlogger;

import java.io.File;

/**
 * Specifies a number of constants for the project.
 * 
 * @author hfeild
 *
 * %%LICENSE_WEB%%
 */
public class Constants
{
    /** 
     * Where the server will place the recieved e-artifacts. 
     */
    public final static String OUTPUT_FILE_NAME_BASE = 
        "%%EARTIFACT_WRITE_FILE%%" + File.separator + "eartifacts";
    
    /**
     * The maximum number of lines or e-artifacts allowed per output file.
     */
    public final static long MAX_EARTIFACTS_PER_FILE = 
        %%MAX_EARTIFACTS_PER_FILE%%;
    
    /** 
     * The max size of a bundle of e-artifacts. 
     */
    public final static int MAX_BUNDLE_SIZE = 100;
    
    /** 
     * The size at which the e-artifact buffer for an anonymizer will
     *  be emptied.
     */
    public final static int FULL_BUFFER_SIZE = 2000;
    
    /** 
     * The number of milliseconds after which an anonymizer's e-artifact
     * buffer will be emptied.
     */
    public final static long FLUSH_BUFFER_DELAY = 1 * 1000; // One second.
    
    /**
     * The list of anonymizer URLs.
     */
    public final static String[] ANONYMIZER_URLS = {
        %%ANONYMIZERS%%
    }; 
 
    /**
     * The server's URL.
     */
    public final static String SERVER_URL = "%%MASTER_SERVER%%";
    
    /**
     * The probability that a bundle will be sent to the server rather than
     * another anonymizer.
     */
    public final static double PROB_OF_SENDING_TO_SERVER = 0.4;
    
}
