// Author:  Henry Feild
// File:    EEArtifactDecryptor.java
// Date:    01-May-2011

package edu.umass.ciir.crowdlogger.server;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileWriter;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.InvalidKeyException;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Scanner;
import java.util.logging.Logger;

import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.CipherInputStream;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.spec.SecretKeySpec;

import org.apache.commons.ssl.OpenSSL;
import org.apache.commons.ssl.PKCS8Key;
import org.apache.commons.ssl.Base64;

import org.json.JSONException;
import org.json.JSONObject;


/**
 * Removes the RSA encryption from a list of doubly-encrypted artifracts 
 * (ee-artifacts).
 * 
 * @author hfeild
 */
public class EEArtifactDecryptor 
{
	public static final int AES_KEY_SIZE = 256;
	
	private BasicDecryptor decryptor;
	
	private static final Logger logger = 
	    Logger.getLogger(EEArtifactDecryptor.class.getName());
	
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
	public EEArtifactDecryptor( String privateKeyFilename ) 
		throws FileNotFoundException, IOException, GeneralSecurityException
	{		
		// Get the decryptor.
	    decryptor = new BasicDecryptor( privateKeyFilename );
		
		logger.info( "EEArtifactDecryptor initialized using private file: " +
		        privateKeyFilename );
	}

	
	/**
	 * Takes an encrypted artifact (e-artifact) which has been additionally
	 * encrypted with private-public key encryption. The input should be a 
	 * JSON string with two fields: 
	 * <ul>
	 *     <li>rsa_protected_key</li>
           <li>encrypted_data</li>
	 * </ul>
	 * 
	 * The encrypted_data portion is decrypted and the clear text is returned.
	 * 
	 * @param eartifact A JSON string encoding an encrypted artifact.
	 * 
	 * @return The clear text of the encrypted_data field of the JSON string.
	 * @throws JSONException 
	 * @throws GeneralSecurityException 
	 * @throws IOException 
	 */
	public String decrypteEEArtifact( String eeartifact ) 
	    throws JSONException, IOException, GeneralSecurityException 
	{
	    logger.info( "Decrypting eeartifact: " + eeartifact );
	    // Decode the e-artifact so we can read it's fields.
	    JSONObject eartifactObject = new JSONObject( eeartifact );

	    // Get the key for the cipher text, which is encrypted with RSA.
	    char[] aesKey = decryptor.decipherRSA( 
	               eartifactObject.getString( "rsa_protected_key" ) );
	       
	    // Decrypt the cipher text.    
	    String clearText = BasicDecryptor.decryptAES256( aesKey, 
	                    eartifactObject.getString( "encrypted_data" ) ); 
	    logger.info( "Decrypted to: " + clearText );
	    return clearText;
	}
	
	/**
	 * Decrypts each line of the given e-artifact file and writes the
	 * plain text to the given output file.
	 * 
	 * @param eartifactFilename The name of the file containing e-artifacts
	 *     (one e-artifact per line).
	 * @param outputFilename The name of the file to which the decrypted
	 *     e-artifacts should be written. Note that they will still be
	 *     encrypted with AES; they must be aggregated and interpolated to
	 *     decrypt.
	 *     
	 * @throws IOException
	 */
	public void decrptEEArtifactFile( 
	        String[] eeartifactFilenames, 
	        String outputDirectory ) throws IOException
	{
	    // This takes care of writing.
        EArtifactWriter writer = new EArtifactWriter( outputDirectory );
	    
        for( int i = 0; i < eeartifactFilenames.length; i++ )
        {
            logger.info( "Processing new input file: " +eeartifactFilenames[i]);
            
            // Open the input and output files.
            Scanner eartifactFile = new Scanner( 
                    new File(eeartifactFilenames[i]) );
            //FileWriter outputFile = new FileWriter( outputDirectory );

            // Read and process each line from the input file.
            String line;
            try{
                while( (line = eartifactFile.nextLine() ) != null )
                {
                    try{
                    logger.info( "Extracted line: " + line );
                    // Extract the artifact.
                    JSONObject eartifactObject = 
                        new JSONObject( decrypteEEArtifact( line ) );

                    // Write it to file.
                    writer.writeEArtifact( eartifactObject );
                    } catch( JSONException e ) {
                        logger.severe( "Error processing line [" +line + "]: " +
                        		e.toString() );
                    }
                    
                }

            } catch ( Exception e ){
                logger.severe( "Error processing the file: " + e.toString() );
            } finally {
                // Close all of the files we opened.
                eartifactFile.close();
                writer.closeFiles();
            }
        }
	}
	
	/**
	 * A test of the decryption abilities.
	 * @throws IOException
	 * @throws GeneralSecurityException
	 */
	public void test( ) //String privateKeyFilename ) 
	    throws IOException, GeneralSecurityException
	{
		
		//String privateKeyFilename = "private.pem";
		
		//EEArtifactDecryptor dea = new EEArtifactDecryptor( privateKeyFilename );
		
		String rsaCipherText = "WFS+XsKG8kxuLA0eTxZNsFIw6NtuypY4hh9cEJ/QEXTc" +
				"6UWmDgCEc6P9hgPMeY4t\nnn4xRsv1FT79jvu6xf5f8mk/6OuGHYNA5rzio" +
				"1pZ7tB5N++9U4e90S2C532d4N9r\n7nNIOVsvpS77raIz17J0QB6dW3Mk+v" +
				"vnXxsAmiMaQ89YYzIvYOWDZ5mkuq3Fqaqg\nsf9vKr6UFpET0fLk0/FAvoO" +
				"ivsAkdgjidunCusUpnaACjdDVzT73Ou39qy8nGZ0r\n/BSJccMhv74dc2UY" +
				"zRKMEN4VXmW3tDji6GVZABlhRd2AxjCTN6G3tNAAElpd/kfI\ntW1c04qqI" +
				"iwZlrfCD8xyTg==";
		String aesCipherText = "U2FsdGVkX183pPpJB4Rqy+siZ5IsE5Ny/UzibhW+DoSH" +
				"8KVoV8ZDwl9ITyte4EkG\nLbQkP4u7Q29itAAY5yc2LDHLkhlKWOQhyb+Nz" +
				"y8IxthB3TY2ruHpyiIB4K6VYUM3\nzDfZCrhOvCCY1aLoqnpc9nsaST1fp+" +
				"9NoHTzNlYtiC0ZMV+i1wsrqG7Lc+uGczcI\nGklI4quGY15qSGT9OZKGzTe" +
				"nX3U75MXkx/+PmzgYoTwhwe6zHKdJDqYAL2Mcz9CU\n";

		char[] aesKey = decryptor.decipherRSA( rsaCipherText );
	
		//char[] tmp = "ffa96e8dfd859214d196d55cf76651554231644f".toCharArray();
		
		String plainText = 
		    BasicDecryptor.decryptAES256( aesKey, aesCipherText ); 
		
		System.out.println("DECRYPTED: [" + plainText + "]");
		
		
		////
		
//		//char[] password = {'c','h','a','n','g','e','i','t'};
//		char[] password = "712473557782432476780901149139536920971863775009".toCharArray();
//		byte[] cipherText = "U2FsdGVkX1+jXjLsCWRRxmB5dtb2UAkCJQljONcYkAo=".getBytes();
//
//		// Encrypt!
////		byte[] encrypted = OpenSSL.encrypt("aes-256-cbc", password, data);
////		System.out.println("ENCRYPTED: [" + new String(encrypted) + "]");
//
//		// Decrypt results of previous!
//		byte[] data = OpenSSL.decrypt("aes-256-cbc", password, cipherText );
//		System.out.println("DECRYPTED: [" + new String(data) + "]");
	}
	
	public static void main( String[] args )
	{
	    String help = "Usage: edu.umass.ciir.crowdlogger.server." +
	    		"DecryptEArtifacts <private key filename> " +
	    		"<output directory> <e-artifact input files...>\n\n" +
	    		"Input file should have one doublely-encrypted artifact per line.\n" +
	    		"The ee-artifacts should be in JSON format with two fields:\n" +
	    		"\trsa_protected_key\n" +
	    		"\tencrypted_data\n\n" +
	    		"The output directory will contain one file per experiment id " +
	    		"+ the\nfirst character of the private field cipher text.";
//	    		"one sub-directory per " +
//	    		"distinct experiment id each experiment's directory will "+
//	    		"contain up to nine files, where each file will contain all " +
//	    		"the e-artifacts that being with a common number (1--9), "+
//	            "one e-artificat per line";
	    
	    if( args.length < 3 )
	    {
	        System.out.println( help );
	        System.exit( 0 );
	    }
	    
	    String privateKeyFilename = args[0];
	    String outputDirectory    = args[1];
        String[] inputFilenames = new  String[args.length - 2];
        for( int i = 2; i < args.length; i++ )
        {
            inputFilenames[i-2] = args[i];
        }
	    

	     
	    try {
	        //DecryptEArtifacts.test( args[0] );
	        
	        EEArtifactDecryptor dea = 
	            new EEArtifactDecryptor(privateKeyFilename);
	        
	        dea.decrptEEArtifactFile(inputFilenames, outputDirectory);
	        
	    } catch ( Exception e ) {
	        e.printStackTrace();
	    }
	}
	
}
