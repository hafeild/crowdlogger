package edu.umass.ciir.crowdlogger.server.artifact;

import java.io.IOException;
import java.math.BigDecimal;
import java.security.GeneralSecurityException;
import java.util.HashMap;
import java.util.logging.Logger;

import org.json.JSONException;
import org.json.JSONObject;

import edu.umass.ciir.crowdlogger.server.BasicDecryptor;
import edu.umass.ciir.crowdlogger.server.BigDecimalLagrangeInterpolator;



/**
 * A structure that holds information about equivalent encrypted artifacts.
 * This includes all of the dinstinct (x,y) points needed for interpolation,
 * job id, the primary cipher text, and a listing of each distinct secondary
 * cipher text along with a frequency count.
 * 
 * @author hfeild
 *
 */
public class EArtifactBag
{
    private String primaryCipherText;
    private String experimentId;
    private HashMap<String, Long> secondaryCipherTexts;
    private HashMap<BigDecimal, BigDecimal> points;
    private long totalInstances;
    private int k;
    
    private static final Logger logger = 
        Logger.getLogger(EArtifactBag.class.getName());
    
    /**
     * Initializes all of the internal data structures.
     */
    public EArtifactBag()
    {
        primaryCipherText = null;
        experimentId = null;
        secondaryCipherTexts = new HashMap<String,Long>();
        points = new HashMap<BigDecimal, BigDecimal>();
        totalInstances = 0;
        k = 0;
    }
    
    /**
     * Initializes all of the internal data structures and rolls add the
     * information for the given e-artifact.
     * 
     * @param eartifact A JSON object with the following fields:
     * <ul>
     *     <li>x</li>
     *     <li>y</li>
     *     <li>k</li>
     *     <li>primary_cipher_text</li>
     *     <li>secondary_cipher_text</li>
     *     <li>experiment_id</li>
     * </ul>
     * @throws JSONException 
     */
    public EArtifactBag( JSONObject eartifact ) throws JSONException
    {
        this();
        addEArtifact( eartifact );
    }
    
    /**
     * Adds the information for the given e-artifact into the current bag.
     * 
     * @param eartifact A JSON object with the following fields:
     * <ul>
     *     <li>x</li>
     *     <li>y</li>
     *     <li>k</li>
     *     <li>primary_cipher_text</li>
     *     <li>secondary_cipher_text</li>
     *     <li>experiment_id</li>
     * </ul>
     * @throws JSONException 
     */
    public void addEArtifact( JSONObject eartifact ) throws JSONException
    {
        // Set the primary cipher text and job id if they haven't already.
        if( null == primaryCipherText )
        {
            primaryCipherText = eartifact.getString( "primary_cipher_text");
            experimentId = eartifact.getString( "experiment_id" );
            k = eartifact.getInt( "k" );
  
        }  

        // Add in the secondary cipher text.
        String secondaryCipherText = 
            eartifact.getString( "secondary_cipher_text" );
        long currentCount = 0;
        if( secondaryCipherTexts.containsKey( secondaryCipherText ) )
        {
            currentCount = 
                secondaryCipherTexts.get( secondaryCipherText );
        }
        secondaryCipherTexts.put(secondaryCipherText, currentCount+1);

        // Add in the (x,y) point.
        BigDecimal x = new BigDecimal( eartifact.getString( "x" ) );
        if( !points.containsKey( x ) )
        {
            BigDecimal y = new BigDecimal( eartifact.getString( "y" ) );
            points.put(x, y);
        }
        
        // Increment the instance count.
        totalInstances++;
    }
    
    /**
     * Checks whether or not there are at least k distinct points, k of
     * which are necessary for interpolation.
     * @return
     */
    public boolean hasSufficientSupport()
    {
        return points.size() >= k;
    }
    
    
    /**
     * Decrypts this eartifact bag if there is suffient support. The
     * decrypted contents are returned in the form of an ArtifactBag.
     * 
     * @return The ArtifactBag equivalent of this EArtrifactBag or null if
     *     there is insufficient support for decryption.
     */
    public ArtifactBag decrypt()
    {
        // Don't keep on going unless we have sufficient support.
        if( !hasSufficientSupport() )
        {
            return null;
        }
        
        ArtifactBag artifactBag = null;
        
        // Get the k -- this requires interpolating over the given points
        // and finding the y-intercept.
        BigDecimalLagrangeInterpolator lagrange = 
            new BigDecimalLagrangeInterpolator( points, k );
        String key = lagrange.evaluateAndRound( new BigDecimal(0) );
        
        // Decrypt the primary cipher text and create a new ArtifactBag
        // object to contain all of the decrypted information.
        try
        {
            String primaryPrivateField = BasicDecryptor.decryptAES256(
                    key, primaryCipherText );
            
            logger.info( "Decrypted 1st field: [" + primaryCipherText + 
                    "] -> [" + primaryPrivateField + "]" );
            
            artifactBag = new ArtifactBag( primaryPrivateField,
                    experimentId, points.size(), totalInstances );
            
            // Go through each of the secondary cipher texts and
            // add them to the artifact bag.
            for( String secondaryCipherText : secondaryCipherTexts.keySet())
            {
                String secondaryPrivateField = 
                    BasicDecryptor.decryptAES256(
                            key, secondaryCipherText );
                
                
                logger.info( "Decrypted 2nd field: [" + secondaryCipherText + 
                        "] -> [" + secondaryPrivateField + "]" );
                
                
                try
                {
                    artifactBag.addSecondaryPrivateField(secondaryPrivateField, 
                            secondaryCipherTexts.get(secondaryCipherText) );
                    
                } catch (JSONException e)
                {
                    // TODO Auto-generated catch block
                    e.printStackTrace();
                }
            }
            
        } catch (IOException e)
        {
            // TODO Auto-generated catch block
            e.printStackTrace();
        } catch (GeneralSecurityException e)
        {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }
        
        return artifactBag;
    }
    
    
    /**
     * Returns the amount of support for this artifact, i.e., the number
     * of distinct (x,y) pairs.
     * 
     * @return The amount of support for this artifact.
     */
    public long getAmountOfSupport()
    {
        return this.points.size();
    }
    
    /**
     * Returns the number of artifact instances that were included in this
     * bag.
     * 
     * @return The number of artifact instance that make up this bag.
     */
    public long getNumberOfInstances()
    {
        return this.totalInstances;
    }
}