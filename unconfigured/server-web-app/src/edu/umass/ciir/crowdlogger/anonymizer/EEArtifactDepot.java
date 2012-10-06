// Author:  Henry Feild
// File:    DepositEArtifacts.java
// Date:    21-Apr-2011

package edu.umass.ciir.crowdlogger.anonymizer;

import edu.umass.ciir.crowdlogger.Constants;

import java.io.*;
import java.util.ArrayList;

import javax.servlet.*;
import javax.servlet.http.*;

import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.StatusLine;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.protocol.HTTP;
import org.apache.http.NameValuePair;
import org.apache.http.client.entity.UrlEncodedFormEntity;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Iterator;
import java.util.Random;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;


/**
 * Receives incoming encrypted artifacts (e-artifacts) and buffers them, 
 * periodically randomly packaging and sending them to other anonymizers or
 * the server itself.
 *
 * @author hfeild
 */
public class EEArtifactDepot extends HttpServlet
{
    // A buffer of the received e-artifacts.
    private final static List<String> eartifactsBuffer = 
        Collections.synchronizedList(new ArrayList<String>());
    
    // A timer that will be used to flush the buffer.
    private static Timer timer = new Timer( true );
    private static Object isFirstLock = new Object();
    private static boolean isFirst = true;
    
  
//    // FOR DEBUGGING
//    private String messages;
//
//    /**
//     * Constructor.
//     */
//    public DepositEArtifacts()
//    {
//        messages = "";
//    }

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
     * (e-artifacts) separated by a new line character. This will add those
     * e-artifacts to a global list. Once added, that list will either be
     * split into random bundles and sent on to another anonymizer or the server
     * or a timer will be set which will perform the same action but at a future
     * time (in the event that no more e-artifact bundles come in after this 
     * one).
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
        synchronized( isFirstLock )
        {
            if( isFirst )
            {
                //Scheduling timer.
//                System.out.println( "Scheduling timer." );
                timer.scheduleAtFixedRate(
                        new TimerTask(){
                            public void run()
                            {
                                flushEArtifacts();
                            }
                        }, 10, Constants.FLUSH_BUFFER_DELAY );
                isFirst = false;
            }
        }
        

        response.setContentType("text/html");
        PrintWriter out = response.getWriter();
        out.println(
            "<!DOCTYPE html PUBLIC \"-//W3C//DTD HTML 4.01 Transitional//EN\" "+
            "\"http://www.w3.org/TR/html4/loose.dtd\">" );


        String eartifacts = request.getParameter( "eartifacts" );
        
        if( null != eartifacts && processEArtifacts( eartifacts ) )
        {
            out.println( printEArtifacts() );
            out.println( "success" );
        }
        else
        {
            out.println( "failure" );
        }
  
        out.close();
    }
    
    

    /**
     * Adds the given eartifacts to the eartifactsBuffer list.
     *
     * @param eartifacts A string consisting of e-artifacts separated by 
     *      newlines.
     * @return <code>true</code> if successful.
     */
    private boolean processEArtifacts( String bundle )
    {
        //B_DEBUG
        //messages += "Processing e-artifact bundle<br>";
        //E_DEBUG

        // Keeps track of whether or not there was a problem.
        boolean success = true;
        
        // Split up the bundle into it's constituent components. 
        String[] eartifacts = bundle.trim().split( "\\n" );
        
        // We want to make sure that no other threads are access the buffer.

        synchronized( eartifactsBuffer )

        {
            //                System.out.println( 
            //                        "processEArtifacts has eartifactsBuffer lock." );
            // Add each of the e-artifacts to the buffer.
            for( int i = 0; i < eartifacts.length; i++ )
            {

                //B_DEBUG
                //messages += "Adding [" + eartifacts[i] + "] to buffer<br>";
                //E_DEBUG
//                if( !eartifacts[i].equals( "" ) )
//                {
                    eartifactsBuffer.add( eartifacts[i] );
//                }
            }
            //                System.out.println( "processEArtifacts about to release " +
            //                		"eartifactsBuffer lock." );
        }
        //            System.out.println( "processEArtifacts has released " +
        //            		"eartifactsBuffer lock." );

        return success;
    }

    
    
    /**
     * Joins all of the e-artifacts in the eartifactsBuffer list into a string.
     * 
     * @return A string consisting of all of the e-artifacts in the 
     * eartifactsBuffer list.
     */
    private String printEArtifacts() 
    {
        String ret = "";

        synchronized( eartifactsBuffer ) 
        {
            Iterator<String> i = eartifactsBuffer.iterator(); 
            while (i.hasNext())
            {
                ret += i.next() + "<br>";
            }
        }

        return ret;
    }

    
    /**
     * Attempts to flush and then reset the eartifactsBuffer list.
     * 
     * <b>NOTE: Make sure you call this in a synchronized block w.r.t. the
     * eartifactsBuffer object.</b>
     * 
     * @return <code>true</code> if the flush was success and the list was
     *      reset.
     */
    private boolean flushEArtifacts()
    {
//        System.out.println( "Flushing..." );
        //B_DEBUG
        //messages += "Flushing artifacts<br>";
        //E_DEBUG

        // Keeps track of whether we successfully flushed and reset th
        // eartifactsBuffer list.
        boolean flushSuccess = false;
     
        //String[] currentBuffer;
        List<String> currentBuffer = new ArrayList<String>();
        synchronized( eartifactsBuffer )
        {
//            System.out.println( "flushEArtifacts has eartifactsBuffer lock." );
            //currentBuffer = new String[eartifactsBuffer.size()];
            for( String eartifact : eartifactsBuffer )
            {
                currentBuffer.add( eartifact );
            }
            eartifactsBuffer.clear();
            
//            System.out.println( "flushEArtifacts about to release eartifactsBuffer lock." );
        }
//        System.out.println( "flushEArtifacts has released eartifactsBuffer lock." );
        
        if( bundleAndSendEArtifacts( currentBuffer ) )
        {
            
            //B_DEBUG
            //messages += "Bundling and sending successful; buffer size: " +
            //    eartifactsBuffer.size() + "<br>";
            //E_DEBUG
            
            flushSuccess = true;
        }
        else
        {
            //B_DEBUG
            //messages += "Bundling and sending FAILED<br>";
            //E_DEBUG
            synchronized( eartifactsBuffer )
            {
//                System.out.println( "flushEArtifacts has eartifactsBuffer lock." );

                for( String eartifact : currentBuffer )
                {
                    eartifactsBuffer.add( eartifact ); 
                }
//                System.out.println( "flushEArtifacts about to return eartifactsBuffer lock." );
            }
//            System.out.println( "flushEArtifacts has returned eartifactsBuffer lock." );
            
//            System.err.println( "bundleAndsendArtifacts() returned 'false'." );
        }
        
        
        
        return flushSuccess;
    }
    
    
    /**
     * Randomly divides the eartifactsBuffer list into bundles (whose size is
     * dictated by Constants.MAX_BUNDLE_SIZE) and then sends each bundle to
     * another anonymizer or the server (randomly). 
     *
     * <b>NOTE: Make sure you call this in a synchronized block w.r.t. the
     * eartifactsBuffer object.</b>
     * 
     * @return <code>true</code> if the data was bundled and sent successfully.
     */
    private static boolean bundleAndSendEArtifacts( List<String> buffer )
    {
        // Keeps track of whether we have successfully created and
        // sent the bundles.
        boolean success = true;
        
        // Create the bundles.
        String[] bundles = bundleEArtifacts( buffer );

        //B_DEBUG
        //messages += "Bundles to send: " + bundles.length + "<br>";
        //E_DEBUG
       

 
        // For all our random-related adventures.
        Random random = new Random();
        
        // Go through each bundle, but stop early if we are not successful.
        for( int i = 0; i < bundles.length && success; i++ )
        {
            // Decide if we should send them to the server or somewhere else.
            if( random.nextDouble() <= Constants.PROB_OF_SENDING_TO_SERVER )
            {

                //B_DEBUG
                //messages += "Sending bundle " + i + " to the server<br>";
                //E_DEBUG

                // Send to the server.
                success = success &&
                    sendEArtifacts( Constants.SERVER_URL, bundles[i] );
            }
            else
            {
                //B_DEBUG
                //messages += "Sending bundle " + i + " to an anonymizer<br>";
                //E_DEBUG
                
                // Keep trying to send the bundle to a random anonymizer until s
                // it goe through.
                boolean messageSent = false;
                while( !messageSent )
                {
                    // Send to one of the anonymizers.
                    int randIndex = 
                        random.nextInt( Constants.ANONYMIZER_URLS.length );

                    messageSent = 
                        sendEArtifacts( Constants.ANONYMIZER_URLS[randIndex],
                                bundles[i] );
                }
            }
        }
        
        return success;
    }
    

    /**
     * Randomly places each of the e-artifacts in the eartifactsBuffer list in a
     * random bundle (which can have no more than Constants.MAX_BUNDLE_SIZE
     * e-artifacts in it). Each bundle is a string of e-artifacts delimited by
     * a new line.
     * 
     * @return The randomly create bundles.
     */
    private static String[] bundleEArtifacts( List<String> buffer )
    {

        //B_DEBUG
        //messages += "Bundling e-artifacts<br>";
        //E_DEBUG

        // The number of bundles.
        int numberOfBundles = (int) Math.ceil( ( 1.0 * buffer.size() )/ 
                Constants.MAX_BUNDLE_SIZE );

        //B_DEBUG
        //messages += "Bundles: " + numberOfBundles + "(" +
        //   ( 1.0 * eartifactsBuffer.size() / 
        //        Constants.MAX_BUNDLE_SIZE ) + ")<br>";
        //E_DEBUG
        
        // Create an array to hold the bundles. Each bundle will be a string
        // consisting of e-artifacts delimited by new lines.
        String[] bundles = new String[numberOfBundles];
        int[] bundleSizes = new int[numberOfBundles];
        
        // Initialize the bundles.
        for( int i = 0; i < bundles.length; i++ )
        {
            bundles[i] = "";
            bundleSizes[i] = 0;
        }
        
        // Shuffle the order of the eartifacts.
        Collections.shuffle( buffer );
        
        // Keep track of the current bundle index. We'll increment this
        // as soon as a bundle reaches its maximum size.
        int bundleIndex = 0;
        
        // We'll use a string builder for each bundle so that we don't copy
        // as much. We're starting it off pretty large.
        StringBuilder currentBundle = new StringBuilder( 
                500 * Constants.MAX_BUNDLE_SIZE );
        
        // Iterate over the e-artifacts adding each to a random bundle.
        for( String eartifact : buffer )
        {
            
            // Check if the current bundle is too big; if so, move on to the
            // next bundle.
            if( bundleSizes[bundleIndex] > Constants.MAX_BUNDLE_SIZE &&
                    (bundleIndex+1) < bundles.length )
            {
                // Convert the bundle to a string.
                bundles[bundleIndex] = currentBundle.toString();
                // Reset the current bundle -- we're using the same space, 
                // though, so that should help memory usage.
                currentBundle.delete( 0, currentBundle.length() );
                // Move on to the next bundle.
                bundleIndex++;
            }
            
            // Add the current e-artifact to that bundle.
            //bundles[bundleIndex] += eartifact+ "\n";
            currentBundle.append( eartifact ).append( '\n' );
            bundleSizes[bundleIndex]++;
        }
        // Convert the current bundle to a string and add it to the list.
        if( bundleIndex < bundles.length )
        {
//            System.out.println( "bundles.length: " + bundles.length );
            bundles[bundleIndex] = currentBundle.toString();
        }
        
        
        return bundles;
    }
    
    /**
     * Sends the given bundle to the url under the parameter name 'eartifacts'
     * using the POST method.
     * 
     * @param url       The url to send the bundle to.
     * @param bundle    The bundle of e-artifacts to send.
     * 
     * @return <code>true</code> if the message was successfully sent.
     */
    public static boolean sendEArtifacts( String url, String bundle )
    {
//        System.out.println( "Sending bundle to [" + url + "]<br>" );
        //B_DEBUG
        //messages += "Sending bundle [" + bundle_ + "] to [" + url_ + "]<br>";
        //E_DEBUG

        // Keeps track of whether we have successfully sent the bundle.
        boolean success = true;

        // If the bundle is empty, don't waste a post.
        if( bundle.equals( "" ) || bundle.equals( "\n" ) )
        {
            return true;
        }
        
        // Create the request.
        HttpClient client = new DefaultHttpClient();

        // Create the post with the given url.
        HttpPost method = new HttpPost( url );

        // Add a parameter 'eartifacts' that holds the bundle.
        List<NameValuePair> params = new ArrayList<NameValuePair>();
        params.add( new BasicNameValuePair( "eartifacts", bundle ) );

        HttpResponse response = null;

        try
        {
            method.setEntity( new 
                    UrlEncodedFormEntity( params, HTTP.UTF_8 ) );
            response = client.execute( method );
        }
        catch (ClientProtocolException e)
        {
            //messages += "ERROR: ClientProtocolException raised<br>";
            e.printStackTrace();
            //success = false;
        }
        catch (IOException e)
        {
            //messages += "ERROR: IOException raised<br>";
            e.printStackTrace();
            //success = false;
        }
         
        if( null == response )
        {
            success = false;
            System.out.println( "ERROR! No response." );
        }
        else 
        {
            StatusLine status = response.getStatusLine();
            if( null == status || 
                    ( status.getStatusCode() < 200 || 
                      status.getStatusCode() >= 300 )  )
            {
                success = false;
                System.out.println( "ERROR! No status or is bad code." );
            }
        }

        return success;
    }


    public static String streamToString( InputStream is )
    {
        //StringWriter writer = new StringWriter();
        //IOUtils.copy( is, writer, "UTF-8" );
        //return writer.toString();

        try{
        final char[] buffer = new char[0x10000];
        StringBuilder out = new StringBuilder();
        Reader in = new InputStreamReader(is, "UTF-8");
        int read;
        do {
          read = in.read(buffer, 0, buffer.length);
          if (read>0) {
            out.append(buffer, 0, read);
          }
        } while (read>=0);
        
        return out.toString();
        } 
        catch( Exception e )
        {
            return "";
        }
    }
}
