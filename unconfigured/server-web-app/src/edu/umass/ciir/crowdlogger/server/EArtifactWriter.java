// Author:  Henry Feild
// File:    WriteEArtifacts.java
// Date:    21-Apr-2011

package edu.umass.ciir.crowdlogger.server;

import edu.umass.ciir.crowdlogger.Constants;

import javax.servlet.*;
import javax.servlet.http.*;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.logging.Logger;

import org.json.JSONException;
import org.json.JSONObject;


/**
 * Writes incoming e-artifacts to a file. The file the e-artifact is written 
 * to is it's job or experiment id followed by a dash followed by the first 
 * letter of the private field cipher text. Multiple files are open at the same
 * time, but this is limited so as to avoid having too many files open.
 * 
 * @author hfeild
 */
public class EArtifactWriter
{
    public static final int MAX_OPEN_FILES = 25;
    
    private HashMap<String, FileWriter> openFiles;
    private String outputDirectory;
    private ArrayList<String> recentFiles;
    
    private static final Logger logger = 
        Logger.getLogger(EArtifactWriter.class.getName());
    
    /**
     * Initializes a new writer that will output e-artifacts to files in the
     * specified output directory.
     * 
     * @param outputDirectory The directory where the output files will go.
     */
    public EArtifactWriter( String outputDirectory )
    {
        openFiles = new HashMap<String, FileWriter>();
        recentFiles = new ArrayList<String>();
        this.outputDirectory = outputDirectory;
        
        logger.info( "EArtifactWriter initialized to write files to " +
        		"directory: " + outputDirectory );
    }
    

    /**
     * Write an e-artifact to a file in the output directory (the one given to
     * the constructor). The file the e-artifact is written to is it's job or
     * experiment id followed by a dash followed by the first letter of the
     * private field cipher text.
     * 
     * @param eartifact The e-artifact to write.
     * 
     * @throws JSONException
     * @throws IOException
     */
    public void writeEArtifact( JSONObject eartifact ) 
        throws JSONException, IOException
    {
        // The file name is based on the job id and the primary cipher text.
        String experimentId = eartifact.getString("experiment_id");
        String primaryCipherText = eartifact.getString("primary_cipher_text");

        String charId = primaryCipherText.charAt(35) + "";
        charId = charId.replaceAll( "\\W", "zz" );
 
        // Form the file name.
        String filename = outputDirectory + 
            File.separator + experimentId.replaceAll("\\W", "_") + "-" + 
            charId + ".eartifacts";
        
        // Check if the file is open.
        if( !openFiles.containsKey( filename ) )
        {
            // It's not open, so open it. But first, close another file if we
            // are at the limit.
            if( recentFiles.size() >= MAX_OPEN_FILES )
            {
                String removedFilename = recentFiles.remove(0);
                logger.info( "Attempting to close file " + removedFilename );
                if( openFiles.containsKey( removedFilename ) )
                {
                    FileWriter file = openFiles.remove( removedFilename );
                    file.close();
                    logger.info( "File closed." );
                }
            }
            
            logger.info( "Opening file: " + filename );
            recentFiles.add( filename );
            FileWriter newFile = new FileWriter( filename, true );
            openFiles.put(filename, newFile);
        }
        
        // It's open, so write the file.
        openFiles.get(filename).append( eartifact.toString() + "\n" );
        
        
    }
    
    /**
     * Closes all of the open output files.
     * 
     * @throws IOException
     */
    public void closeFiles() throws IOException
    {
        logger.info( "Closing all files." );
        for( String filename : openFiles.keySet() )
        {
            logger.info( "Closing file: " + filename );
            FileWriter file = openFiles.get( filename );
            file.close();
        }
        
        openFiles = new HashMap<String, FileWriter>();
        recentFiles = new ArrayList<String>();
    }
}
