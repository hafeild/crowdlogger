package edu.umass.ciir.crowdlogger.test;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.logging.Logger;

import edu.umass.ciir.crowdlogger.server.BigDecimalLagrangeInterpolator;
import edu.umass.ciir.crowdlogger.server.EEArtifactDecryptor;

public class SSSSTester
{
    private HashMap<BigDecimal, BigDecimal> points;
    private String trueIntercept;
    private String cipherText;
    
    private static final Logger logger = 
        Logger.getLogger(SSSSTester.class.getName());
    
    public SSSSTester(String[][] pointsArray, 
            String trueIntercept, String cipherText )
    {
        points = new HashMap<BigDecimal, BigDecimal>();
        this.trueIntercept = trueIntercept;
        this.cipherText = cipherText;
        
        for( int i = 0; i < pointsArray.length; i++ )
        {
            points.put( 
                    new BigDecimal( pointsArray[i][0] ), 
                    new BigDecimal( pointsArray[i][1] ));
        }
    }
    
    public boolean runTest()
    {
        BigDecimalLagrangeInterpolator lagrange = 
            new BigDecimalLagrangeInterpolator( points );
        
        String result = lagrange.evaluateAndRound( new BigDecimal( 0 ) );
        System.out.println( "Result: " + result );
        
        System.out.println( "Match?: " + (result.equals( this.trueIntercept )));
        
        String result2 = lagrange.evaluateAndRound( new BigDecimal( 3 ));
        System.out.println( "Result for x=3: " + result2 );
        
        return true;
    }
    
    
    public static void main(String[] args)
    {
        String trueIntercept = "608375017745352119000495708316353808485004039356";

        String[][] pointsArray = { 
                {"5","16197527372967386708285657060651166363951960768494159042505557746585937532433191"},
                {"6","27791243339710383320082858510118515770846041173737482824770720118650486371404410"},
                {"8","65850603397297185510561260354244364044166994521358901866236517892412330449090660"},
                {"4","8441137328311903256087759685034368735348377172924138460054341744524719383827472"},
                {"9","94059404880724266233106830529292946410079846330626691923858191786146571786767867"}};
        String cipherText = "U2FsdGVkX1+jXjLsCWRRxooxWWJjeTPJY5RZGlwtzX7UAZgAJhxms0gCXWEHdQge";

        SSSSTester test = new SSSSTester( pointsArray, trueIntercept, cipherText );
        test.runTest();
    }

 }
