// Author:  Henry Feild
// File:    EArtifactDecryptor.java
// Date:    12-May-2011

package edu.umass.ciir.crowdlogger.server;


import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileWriter;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.HashMap;
import java.util.Scanner;
import java.util.logging.Logger;

import org.json.JSONException;
import org.json.JSONObject;

import edu.umass.ciir.crowdlogger.server.artifact.ArtifactBag;
import edu.umass.ciir.crowdlogger.server.artifact.EArtifactBag;


/**
 * Writes incoming e-artifacts to a file.
 * 
 * @author hfeild
 */
public class EArtifactDecryptor 
{
	private BasicDecryptor decryptor;
	private HashMap<String, EArtifactBag> eartifactBags;
	// support -> {distinct, impressions}
	private HashMap<Long, Long[]> unsupportedArtifactStats;
	private long numberOfDistinctArtifactsSupported;
	private long numberOfArtifactInstancesSupported;
	
	private long totalDistinctArtifacts;
	private long totalArtifacts;
	
	private static final Logger logger = 
	    Logger.getLogger(EArtifactDecryptor.class.getName());
	
	
	/**
	 * Initializes an instance by creating the private key cipher that will be
	 * used to decrypt cipher text.
	 * 
	 * @param privateKeyFilename The path and name of the file that contains the
	 * 		private key. This should be in the format output by OpenSSL.
	 * 
	 * @throws FileNotFoundException
	 * @throws IOException
	 * @throws GeneralSecurityException 
	 */
	public EArtifactDecryptor() 
		throws FileNotFoundException, IOException, GeneralSecurityException
	{		
	    decryptor = new BasicDecryptor();
	    eartifactBags = new HashMap<String, EArtifactBag>();
	    unsupportedArtifactStats = new HashMap<Long, Long[]>();
	    numberOfDistinctArtifactsSupported = 0;
	    numberOfArtifactInstancesSupported = 0;
	    
	    totalDistinctArtifacts = 0;
	    totalArtifacts = 0;
	}

	

	
	/**
	 * Decrypts what e-artifacts are sufficiently supported from the given
	 * input files and summarizes the rest.
	 * 
	 * @param eartifactFilename The name of the file containing e-artifacts
	 *     (one e-artifact per line).
	 * @param outputFilename The name of the file to which the decrypted
	 *     e-artifacts should be written. Note that they will still be
	 *     encrypted with AES; they must be aggregated and interpolated to
	 *     decrypt.
	 *     
	 * @throws IOException
	 * @throws JSONException 
	 */
	public void decrptEArtifactFile( 
	        String[] eartifactFilenames, 
	        String outputFilename ) throws IOException, JSONException
	{
	    // Open the output file.
	    FileWriter outputFile = new FileWriter( outputFilename );
	    
	    for( int i = 0; i < eartifactFilenames.length; i++ )
	    {
	        // Open the input file
	        Scanner eartifactFile = new Scanner( 
	                new File(eartifactFilenames[i]) );
	        
	        // Read and process each line from the input file.
	        String line;
	        try{
	            while( (line = eartifactFile.nextLine() ) != null )
	            {
	                try{
	                // Read the e-artifact.
	                JSONObject eartifact = new JSONObject( line );
	                String primaryCipherText = eartifact.getString( 
	                    "primary_cipher_text" );
	                
	                logger.info( "Adding e-artifact with primary " +
	                		"cipher text: " + primaryCipherText );

	                // Check if we need to create a new
	                if( !eartifactBags.containsKey(primaryCipherText) )
	                {
	                    eartifactBags.put(primaryCipherText, 
	                            new EArtifactBag() );
	                }
	                
	                // Add in the new object.
	                eartifactBags.get( primaryCipherText ).
	                    addEArtifact( eartifact );
	                } catch ( JSONException e ) {
	                    logger.severe( "Excpetion reading line [" + line +"]:"+
	                            e.toString() ); 
	                }
	            }

	        } catch ( Exception e ){
	            logger.severe( "Exception reading file " + eartifactFilenames[i] +
	                    ": " + e.toString() );
	        } finally {
	            // Close all of the files we opened.
	            eartifactFile.close();
	        }
	    }
	    
	    logger.info( "Found " + eartifactBags.size() + " distinct e-artifacts." );
	    // Go through each of the eartifacts and attempt to decrypt it.
	    for( EArtifactBag eab : eartifactBags.values() )
	    {
	        ArtifactBag ab = eab.decrypt();
	        
	        // If it is null, add the given info to the unsupported artifact 
	        // structure.
	        if( null == ab )
	        {
	            
	            long support = eab.getAmountOfSupport();
	            long instances = eab.getNumberOfInstances();
	            
	            Long[] stats = {new Long(1), instances};
	            if( unsupportedArtifactStats.containsKey( support ) )
	            {
	                stats = unsupportedArtifactStats.get( support );
	                stats[0]++;
	                stats[1] += instances;
	            }
	            
	            logger.info( "Current e-artifact bag is null. Support: " +
	                    support + "; instances: " + instances );
	            
	            unsupportedArtifactStats.put( support, stats );
	            
	        }
	        // Otherwise, write it to file and update the necessary counts.
	        else
	        {
	            numberOfDistinctArtifactsSupported++;
	            numberOfArtifactInstancesSupported += ab.getNumberOfInstances();
	            outputFile.write( ab.toString() + "\n" );
	        }
	        
	        totalDistinctArtifacts++;
	        totalArtifacts += eab.getNumberOfInstances();
	    }
	    
	    // Loop through the unsupported stats and write them to file.
	    for( Long support : unsupportedArtifactStats.keySet() )
	    {
	        Long[] stats = unsupportedArtifactStats.get( support );
	        JSONObject json = new JSONObject();
	        json.put( "support", support );
	        json.put( "distinct", stats[0] );
	        json.put( "instances", stats[1] );
	        
	        outputFile.write( json.toString() + "\n" );
	    }
	    
	    System.out.println( 
	            "Total artifacts:    " + totalArtifacts  + "\n" +
	            "Distinct artifacts: " + totalDistinctArtifacts + "\n" +
	            "Total supported artifacts:    " + numberOfArtifactInstancesSupported + "\n" +
	            "Distinct supported artifacts: " + numberOfDistinctArtifactsSupported );
	    
	    outputFile.flush();
	    outputFile.close();
	}
	
	
	
	public static void main( String[] args )
	{
	    String help = "Usage: edu.umass.ciir.crowdlogger.server." +
	    		"DecryptEArtifacts " +
	    		"<output file> <e-artifact input file>";
	    
	    if( args.length < 2 )
	    {
	        System.out.println( help );
	        System.exit( 0 );
	    }
	    

	    String outputFilename     = args[0];
	    String[] inputFilenames   = new String[args.length-1];
	    
	    for( int i = 1; i < args.length; i++ )
	    {
	        inputFilenames[i-1] = args[i]; 
	    }
	     
	    try {
	        
	        EArtifactDecryptor dea = new EArtifactDecryptor();
	        logger.info( "About to proceess " + inputFilenames.length + 
	                " input files." );
	        dea.decrptEArtifactFile(inputFilenames, outputFilename);
	        
	        
	    } catch ( Exception e ) {
	        e.printStackTrace();
	    }
	}
	
}
