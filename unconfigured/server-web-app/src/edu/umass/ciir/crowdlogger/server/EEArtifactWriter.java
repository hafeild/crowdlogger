// Author:  Henry Feild
// File:    WriteEArtifacts.java
// Date:    21-Apr-2011

package edu.umass.ciir.crowdlogger.server;

import edu.umass.ciir.crowdlogger.Constants;

import javax.servlet.*;
import javax.servlet.http.*;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;


/**
 * Writes incoming e-artifacts to a file.
 * 
 * @author hfeild
 */
public class EEArtifactWriter extends HttpServlet
{
    // A lock that ensures that two threads are not writing to the
    // output file simultaneously.
    private static Object FILE_LOCK = new Object();
    private static int    linesWrittenToCurrentFile = 0;
    private static String currentFileNameBase = "";
    private static int    currentFileExtension = 1; // 1, 2, 3, etc.
 
    // For our dates (used for file extensions).
    private static DateFormat dateFormatter = 
        new SimpleDateFormat( "dd-MMM-yyyy" );
    
    /**
     * This is for developmental purposes. It should be taken out before 
     * deploying. It will take a GET request and pass it on to doPost, which
     * is meant for taking POST requests.
     * 
     * @param request The request.
     * @param response The response.
     * 
     * @throws ServletException
     * @throws IOException
     */
    public void doGet( HttpServletRequest request, 
        HttpServletResponse response)  throws ServletException, IOException
    {
        doPost( request, response );
    }


    
    /**
     * Processes a POST request that should contain a parameter named
     * "eartifacts". The value should be a string of encrypted artifacts
     * (e-artifacts) separated by a new line character. This will write those
     * e-artifacts to a file.
     * 
     * @param request The request.
     * @param response The response.
     * 
     * @throws ServletException
     * @throws IOException
     */
    public void doPost( HttpServletRequest request, 
        HttpServletResponse response)  throws ServletException, IOException
    {
        response.setContentType("text/html");
        PrintWriter out = response.getWriter();
        out.println(
            "<!DOCTYPE html PUBLIC \"-//W3C//DTD HTML 4.01 Transitional//EN\" "+
            "\"http://www.w3.org/TR/html4/loose.dtd\">" );

        String eartifacts = request.getParameter( "eartifacts" );
        out.println( "--> eartifacts: " + eartifacts + "<br>" );
        if( null != eartifacts && writeEArtifactsToFile( eartifacts ) )
        {
            out.println( "success" );
        }
        else
        {
            out.println( "failure" );
        }

    }
    
    
    
    /**
     * Writes the given e-artifacts file.
     *
     * @param bundle A string consisting of e-artifacts separated by 
     *      newlines.
     * @return <code>true</code> if successful.
     */
    public boolean writeEArtifactsToFile( String bundle )
    {   
        // Removoe leading/trailing whitespace.
        bundle = bundle.trim();
        
        // Short cute if this bundle is empty.
        if( bundle.equals( "" ) )
        {
            return true;
        }
        
        try
        {
            // Make sure we're the only ones accessing the file right now.
            synchronized( FILE_LOCK )
            {
                // Create the new file name (append the day to the end).
                String filename = Constants.OUTPUT_FILE_NAME_BASE + "." +
                    dateFormatter.format( new Date() );
                
                
                // Get the number of e-artifacts in the current bundle.
                int sizeOfBundle = 0;
                for( int i = 0; i < bundle.length(); i++ )
                {
                    if( bundle.charAt(i) == '\n')
                    {
                        sizeOfBundle++;
                    }
                }
                
                // Check if the above is a new file (i.e., the first file of 
                // the day. If not, check if to many e-artifacts have been 
                // written to the current file.
                if( filename.equals( currentFileNameBase ) )
                {
                    // Too many lines have been written to the current file,
                    // so we're going to increment the extension and create a 
                    // new file.
                    if( linesWrittenToCurrentFile > 
                           (Constants.MAX_EARTIFACTS_PER_FILE - sizeOfBundle) )
                    {
                        currentFileExtension++;
                        linesWrittenToCurrentFile = 0;
                    }
                }
                else
                {
                    // Update the filename base and reset the file extension.
                    currentFileNameBase = filename;
                    currentFileExtension = 1;
                    linesWrittenToCurrentFile = 0;
                }
                
                // Add the extension to the file name. We are padding it with
                // 0's so we'll get something like;
                //    outputfile.001
                //    outputfile.002
                //    ...
                filename += String.format( ".%03d", currentFileExtension );
                
                // Update the number of lines added to this file.
                linesWrittenToCurrentFile += sizeOfBundle;
                
                // Create a new writer to append to our output file.
                BufferedWriter out = new BufferedWriter(
                        new FileWriter( filename, true ) );

                out.write( bundle + "\n" );
                                
                out.close();
            }

            // If we reached here, we'll consider the write successful.
            return true;
            
        } catch (IOException e)
        {
            e.printStackTrace();
            // If there was an error, we will report they the write was
            // not successful.
            return false;
        }

    }
    
    
}
