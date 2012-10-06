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
public class BasicDecryptor 
{
	public static final int AES_KEY_SIZE = 256;
	
	private Cipher pkCipher;
	private Base64 b64;
	
	private static final Logger logger = 
	    Logger.getLogger(BasicDecryptor.class.getName());
	
	
	/**
	 * Initializes the decryptor. Use this constructor if you are <i>not</i> 
	 * planning to perform public-private key en/decryption. 
	 */
	public BasicDecryptor()
	{
	    // For base 64 operations.
        b64 = new Base64();
	}
	
	/**
	 * Initializes an instance by creating the private key cipher that will be
	 * used to decrypt cipher text. Use this constructor if you plan to use
	 * public-private key en/decryption.
	 * 
	 * @param privateKeyFilename The path and name of the file that contains the
	 * 		private key. This should be in the format output by OpenSSL.
	 * 
	 * @throws FileNotFoundException
	 * @throws IOException
	 * @throws GeneralSecurityException 
	 */
	public BasicDecryptor( String privateKeyFilename ) 
		throws FileNotFoundException, IOException, GeneralSecurityException
	{		
	    this();
	    
		// Initialize the private key cipher.
		initPKCipher( new FileInputStream( privateKeyFilename ) );

        logger.info( "EEArtifactDecryptor initialized using private file: " +
                privateKeyFilename );
	}
	
	
	/**
	 * Initializes an instance by creating the private key cipher that will be
	 * used to decrypt cipher text.
	 * 
	 * @param privateKeyFile The private key's FileInputStream.
	 * 
	 * @throws GeneralSecurityException 
	 * @throws IOException
	 */
	private void initPKCipher( FileInputStream privateKeyFile ) 
		throws GeneralSecurityException, IOException
	{
		PKCS8Key pkcs8 = new PKCS8Key( privateKeyFile, null );
		byte[] decrypted = pkcs8.getDecryptedBytes();
		PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec( decrypted );
		
		PrivateKey pk = pkcs8.getPrivateKey();
		
		//System.out.println( "key: " + pkcs8.getPrivateKey() );
		
		pkCipher = Cipher.getInstance("RSA");
		SecretKeySpec aeskeySpec;
		
		pkCipher.init(Cipher.DECRYPT_MODE, pk);
		
		logger.info( "Public key cipher initialized" );
	}
	
	
	/**
	 * Takes a cipher text encrypted using the public key corresponding to this
	 * instance's private key and decrypts it into the plain text.
	 * 
	 * @param rsaCipherText The cipher text to decrypt.
	 * 
	 * @return	The plaintext verion of the given cipher text.
	 * 
	 * @throws BadPaddingException 
	 * @throws IllegalBlockSizeException 
	 */
	public char[] decipherRSA( String rsaCipherText ) 
		throws IllegalBlockSizeException, BadPaddingException 
	{
	    logger.info( "Dechipering RSA cipher text: " +
	            rsaCipherText );
	    
		return new String( Base64.decodeBase64(
		        pkCipher.doFinal( 
		                prepareRSACipherText(rsaCipherText) 
		                ) ) ).toCharArray();
	}
	
	
	/**
	 * Decrypts a cipher text encrypted with AES 256.
	 * 
	 * @param key  The password needed for decryption.
	 * @param cipherText The text to decrypt.
	 * 
	 * @return The clear text version of the cipher text.
	 * 
	 * @throws IOException
	 * @throws GeneralSecurityException
	 */
	public static String decryptAES256( char[] key, String cipherText ) 
	    throws IOException, GeneralSecurityException
	{
	    logger.info( "Dechipering AES cipher text: " + cipherText );
	    return new String( 
	            OpenSSL.decrypt("aes-256-cbc", key, cipherText.getBytes() ) ).
	            replaceAll("\n$", "");
	}
	
	public static String decryptAES256( String key, String cipherText ) 
	    throws IOException, GeneralSecurityException
	{
	    return BasicDecryptor.decryptAES256( 
	            key.toCharArray(), 
	            cipherText );
	}
	
	
	/**
	 * Prepares an RSA encrypted cipher text -- the involves converting to
	 * base64 and removing new lines.
	 * 
	 * @param cipherText The RSA encrypted cipher text.
	 * 
	 * @return The prepared version of the cipher text.
	 */
	public static byte[] prepareRSACipherText( String cipherText )
	{
	    logger.info( "Preparing RSA cipher text." );
	    return Base64.decodeBase64( cipherText.replaceAll("\\n", "") );
	}

}
