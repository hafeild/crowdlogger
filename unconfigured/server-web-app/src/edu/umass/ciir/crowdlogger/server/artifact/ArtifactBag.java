package edu.umass.ciir.crowdlogger.server.artifact;

import java.util.logging.Logger;

import org.json.JSONException;
import org.json.JSONObject;

import edu.umass.ciir.crowdlogger.server.BigDecimalLagrangeInterpolator;


/**
 * A structure that holds information about equivalent artifacts.
 * The primary private field, job id, a listing of each distinct secondary
 * private field along with a frequency count, the total number of
 * instances represented in this bag, and the number of distinct x
 * values used to decode it.
 * 
 * @author hfeild
 *
 */
public class ArtifactBag
{
    private String primaryPrivateField;
    private String experimentId;
    private JSONObject secondaryPrivateFields;
    private long numberOfDistinctXs;
    private long totalInstances;
    
    private static final Logger logger = 
        Logger.getLogger(ArtifactBag.class.getName());
    
    /**
     * Initializes most of the bag's information. The secondary private
     * fields must added separately.
     * 
     * @param primaryPrivateField
     * @param experimentId
     * @param numberOfDistinctXs
     * @param totalInstances
     */
    public ArtifactBag( String primaryPrivateField, String experimentId,
            long numberOfDistinctXs, long totalInstances )
    {
        this.secondaryPrivateFields = new JSONObject();
        this.experimentId = experimentId;
        this.primaryPrivateField = primaryPrivateField;
        this.numberOfDistinctXs = numberOfDistinctXs;
        this.totalInstances = totalInstances;
    }
    
    
    
    /**
     * Adds the given secondary private field data to the bag. This
     * overwrites any information about this secondary private field that
     * was added previously.
     * 
     * @param secondaryPrivateField
     * @param count
     * @throws JSONException 
     */
    public void addSecondaryPrivateField( String secondaryPrivateField,
            long count ) throws JSONException
    {
        logger.info( "Adding secondary private field: " + 
                secondaryPrivateField );
        
        secondaryPrivateFields.put( secondaryPrivateField, count );
    }
    
    /**
     * Creates a JSON object out of this bag.
     * 
     * @return A JSON ojbect representation of this bag.
     * 
     * @throws JSONException
     */
    public JSONObject jsonize() throws JSONException
    {
        JSONObject json = new JSONObject();
        
        json.put( "primary_private_field", this.primaryPrivateField );
        json.put( "experiment_id", this.experimentId );
        json.put( "number_of_distinct_parts", this.numberOfDistinctXs );
        json.put( "total_instances", this.totalInstances );
        json.put( "secondary_private_fields", this.secondaryPrivateFields );
        
        return json;
    }
    
    /**
     * Returns this object as a JSON string. 
     */
    public String toString()
    {
        try
        {
            return jsonize().toString();
        } catch (JSONException e)
        {
            // TODO Auto-generated catch block
            e.printStackTrace();
            return null;
        }
    }
    
    /**
     * Returns the amount of support for this artifact, i.e., the number
     * of distinct (x,y) pairs.
     * 
     * @return The amount of support for this artifact.
     */
    public long getAmountOfSupport()
    {
        return this.numberOfDistinctXs;
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


