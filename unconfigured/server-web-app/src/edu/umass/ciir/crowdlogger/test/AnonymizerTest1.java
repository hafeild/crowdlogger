// Author:  Henry Feild
// File:    AnonymizerTest1.java
// Date:    22-Apr-2011

package edu.umass.ciir.crowdlogger.test;

import edu.umass.ciir.crowdlogger.Constants;
import edu.umass.ciir.crowdlogger.anonymizer.EEArtifactDepot;
import java.util.Random;

/**
 * Submits e-artifacts to the anonymizers. This contains a main that allows
 * several parameters to be specified on the command line. 
 * 
 * @author hfeild
 *
 */
public class AnonymizerTest1
{

    public int clientCount;
    public int bundleCountPerClient;
    public int bundleSize;
    public int eartifactLength;
    
    /**
     * Our client simulator (which can be run via a thread). When run,
     * it will submit some number of bundles to random anonymizers.
     * 
     * @author hfeild
     *
     */
    private class ClientSimulator implements Runnable
    {
        private AnonymizerTest1 testData;
        private int             clientNumber;
        private String          eartifactBody;
        
        /**
         * Initializes the simulator. 
         * 
         * @param testData  Contains important parameters such as the number of
         *      bundels to create and the size of each bundle.
         * @param clientNumber The number of the current client.
         * @param eartifactBody The main chunk of the e-artifact to send. It 
         *      will have some addition information prepended.
         */
        public ClientSimulator( AnonymizerTest1 testData, int clientNumber,
                String eartifactBody )
        {
            this.testData     = testData;
            this.clientNumber = clientNumber;
            this.eartifactBody = eartifactBody;
        }
        
        /**
         * Creates a number of e-artifact bundles and sends them to random
         * anonymizers.
         */
        @Override
        public void run()
        {
            // For all of our randomness needs.
            Random random = new Random();
            
            // Create the bundles.
            for( int bundleNumber = 0; 
                 bundleNumber < testData.bundleCountPerClient; 
                 bundleNumber++ )
            {
                // Create the current bundle.
                String bundle = "";
                
                
                for( int eartifactNumber = 0; 
                     eartifactNumber < testData.bundleSize; 
                     eartifactNumber++ )
                {
                    // Add the current bundle.
                    bundle += clientNumber + "-" + bundleNumber + "-" +
                        eartifactNumber + "-" + eartifactBody + "\n";
                }
                
                // Send it to a random anonymizer.
                boolean success = false;
                while( !success )
                {
                    int randAnonymizerIndex = 
                        random.nextInt(Constants.ANONYMIZER_URLS.length);
                    success = EEArtifactDepot.sendEArtifacts(
                            Constants.ANONYMIZER_URLS[randAnonymizerIndex], 
                                bundle );
                }
            }
            
            
            /*
            try
            {
                wait( random.nextInt(5) * 10 );
            } catch (InterruptedException e)
            {
                // TODO Auto-generated catch block
                e.printStackTrace();
            }
            */
        }
        
    }
    
    /**
     * Sets all the parameters to their defaults (1).
     */
    public AnonymizerTest1()
    {
        this( 1, 1, 1, 1 );
    }
    
    /**
     * Initializes the parameters for the test.
     * 
     * @param clientCount The number of clients to simulate.
     * @param bundleCountPerClient The number of bundles to submit from each 
     *      simulated client.
     * @param bundleSize The number of e-artifact to package in each bundle.
     * @param eartifactLength The size of the e-artifact itself. The true length
     *      will be a little longer than this because each artifact has the
     *      thread number, bundle number, and e-artifact number prepended to it. 
     */
    public AnonymizerTest1( int clientCount, int bundleCountPerClient, 
                            int bundleSize,  int eartifactLength )
    {
        this.clientCount          = clientCount;
        this.bundleCountPerClient = bundleCountPerClient;
        this.bundleSize           = bundleSize;
        this.eartifactLength      = eartifactLength;
    }
    
    
    /**
     * Runs the test by creating <code>clientCount</code> threads (our simulated
     * clients), each of which creates <code>bundleCountPerClient</code> 
     * bundles of <code>bundleSize</code> e-artifacts, of which each is at least
     * <code>eartifactLength</code> characters long.
     */
    public void runTest()
    {   
        // Holds all of the threads.
        Thread[] threads = new Thread[clientCount];
        
        // Create the main part of the e-artifact -- the character 'a' repeated
        // eartifactLength times.
        String eartifactBody = "";
        for( int i = 0; i < eartifactLength; i++ )
        {
            eartifactBody += "a";
        }
        
        // Create the threads, but don't run them yet.
        for( int i = 0; i < clientCount; i++ )
        {
            threads[i] = new Thread( new ClientSimulator( this, i, eartifactBody ) );
        }
        
        // Run the threads.
        for( int i = 0; i < threads.length; i++ )
        {
            threads[i].run();
            
        }
    }
    
    /**
     * Initiates a test.
     * 
     * @param args Should contain parameters for the test.
     */
    public static void main( String[] args )
    {
        int clientCount = 1;
        int bundleCountPerClient = 1;
        int bundleSize = 1;
        int eartifactLength = 1;
        
        String usage = "Usage: java edu.umass.ciir.scamp.AnonymizerTest1 " +
        		"[options]\n\nOptions:\n\t" +
        		"--help  Print this message and exit\n\t" +
        		"--clients=X Create X clients\n\t" +
        		"--bundlesPerClient=X Each client will submit X bundles\n\t" +
        		"--bundleSize=X Each bundle will have X e-artifacts in it\n\t" +
        		"--eartifactLength=X Each eartifact will have at least X " +
        		"characters\n";
        
        // Go through arguments.
        for( int i = 0; i < args.length; i++ )
        {
            if( args[i].equals( "--help" ) )
            {
                System.out.println( usage );
                System.exit( 0 );
            }
            else if( args[i].startsWith( "--clients=") )
            {
                clientCount = Integer.parseInt( args[i].replaceFirst( 
                        "--clients=", "" ) );
            }
            else if( args[i].startsWith( "--bundlesPerClient=") )
            {
                bundleCountPerClient = Integer.parseInt( args[i].replaceFirst( 
                        "--bundlesPerClient=", "" ) );
            }
            else if( args[i].startsWith( "--bundleSize=") )
            {
                bundleSize = Integer.parseInt( args[i].replaceFirst( 
                        "--bundleSize=", "" ) );
            }
            else if( args[i].startsWith( "--eartifactLength=") )
            {
                eartifactLength = Integer.parseInt( args[i].replaceFirst( 
                        "--eartifactLength=", "" ) );
            }
        }
        
        // Print out the settings.
        System.out.println( "Using the following settings:\n\t" +
        		"Number of clients:        " + clientCount + "\n\t" +
        		"Number of bundles/client: " + bundleCountPerClient + "\n\t" +
        		"E-Artifacts/bundle:       " + bundleSize + "\n\t" +
        		"Min. size/e-artifact:     " + eartifactLength + "\n" );
        
        // Create a test instance and run it.
        AnonymizerTest1 test = new AnonymizerTest1( 
               clientCount, bundleCountPerClient, bundleSize, eartifactLength );
        test.runTest();
        
    }
    
    
}
