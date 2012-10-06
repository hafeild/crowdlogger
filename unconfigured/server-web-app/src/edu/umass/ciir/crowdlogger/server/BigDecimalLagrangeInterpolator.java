// Author:  Henry Feild
// File:    DecryptEArtifacts.java
// Date:    12-May-2011

package edu.umass.ciir.crowdlogger.server;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.logging.Logger;

import edu.umass.ciir.crowdlogger.test.SSSSTester;

public class BigDecimalLagrangeInterpolator extends BigDecimalInterpolator
{
    
    private static final Logger logger = 
        Logger.getLogger(BigDecimalLagrangeInterpolator.class.getName());

    /**
     * Initializes the set of points over which the interpolation will occur.
     * 
     * @param points A map consisting of (x,y) pairs.
     */
    public BigDecimalLagrangeInterpolator(HashMap<BigDecimal, BigDecimal> points)
    {
        super(points);
    }
    
    
    /**
     * Initializes the set of points over which the interpolation will occur
     * and the degree of the polynomial (i.e., the minimum number of points
     * required to interpolate).
     * 
     * @param points A map consisting of (x,y) pairs.
     * @param degree The degree of the original polynomial from which the
     *      points were sampled.
     */
    public BigDecimalLagrangeInterpolator( 
            HashMap<BigDecimal, BigDecimal> points, int k )
    {
        super( points, k );
    }


    /**
     * Calculates the y-value associated with x given the interpolation and
     * rounds it to the nearest whole number.
     * 
     * @param x The x-value to evaluate.
     * 
     * @return The y-value corresponding to the given x, rounded to the nearest
     * whole number.
     */
    @Override
    public String evaluateAndRound( BigDecimal x )
    {
        return round( evaluate( x ) );
    }
    
    
    /**
     * Calculates the y-value associated with x using Lagrange interpolation.
     * 
     * @param x The x-value to evaluate.
     * 
     * @return The y-value corresponding to the given x.
     */
    @Override
    public BigDecimal evaluate( BigDecimal x )
    {
        // Calculate P_k(x) = \sum_{i=0}^{i<k} y_i * l_i(x)

        BigDecimal y = new BigDecimal(0);
        
        BigDecimal[] xs = new BigDecimal[points.size()];
        points.keySet().toArray( xs );
        
        // Need to compute the lagrange bases.
        // Formula: l_j(x) = \prod_{i=0, i!=j}^{k} (x - x_i)/(x_j - x_i)
        for( int j = 0; j < degree; j++ )
        {
            // The current (x,y) pair.
            BigDecimal xJ = xs[j];
            BigDecimal yJ = points.get( xs[j] );
           
            logger.info( "Looking at (" + xJ + ", " + yJ + ")" );
            
            // To keep track of the numerator and denominator of the Lagrange basis.
            BigDecimal lagrangeNumerator = new BigDecimal( "1" );
            BigDecimal lagrangeDenominator = new BigDecimal( "1" );
            
            // Loop through all of the other pairs to make the Lagrange basis l_j.
            for( int i = 0; i < degree; i++ )
            {
                if( i == j )
                    continue;
                
                BigDecimal xI = xs[i];
                BigDecimal yI = points.get( xs[i] );
                // Using BigNumbers here helps with precision.
                lagrangeNumerator = lagrangeNumerator.multiply(
                        x.subtract( xI ) );
                lagrangeDenominator = lagrangeDenominator.multiply(
                        xJ.subtract( xI ) );
            }
            
            logger.info( " y += " + yJ.toPlainString() + " * " 
                    + lagrangeNumerator + " / " + lagrangeDenominator );
            
            // We are multiply this way to minimize the amount of error we get from
            // dividing a smaller number by the denominator.
            y = y.add( yJ.multiply( lagrangeNumerator ).divide(
                    lagrangeDenominator, 5,  RoundingMode.HALF_UP ) );
            
            logger.info( "Current value of y: " + y );
        }
        


        return y;
    }
    
    
    /**
     * Rounds a BigDecimal to the nearest whole number and returns it as a 
     * String.
     * 
     * @param number The decimal to round.
     * 
     * @return The rounded number as a string.
     */
    public static String round(BigDecimal number)
    {
        String result = number.toPlainString();
        
        System.out.println( "Result as string: " + result );
        
        String[] resultParts = result.split( "\\." );
        
        if( resultParts.length == 1 )
        {
            return resultParts[0];
        }
        
        String toRound = resultParts[0].charAt(resultParts[0].length()-1) + 
            "." + resultParts[1].substring(0,Math.min(resultParts[1].length(), 3));
        String lastDigit = Integer.toString( 
                (int) Math.round( new Double(toRound).doubleValue() ) );
        
        String roundedResult = 
            resultParts[0].substring(0, resultParts[0].length()-1) +
            lastDigit;
            
        return roundedResult;
    }
    
    /**
     * Just a sanity check.
     * @param args
     */
    public static void main( String[] args )
    {
        BigDecimal d = new BigDecimal( 
                "608375017745352119000495708316353808485004039356");
        System.out.println( "Rounded decimal 1: "+ d + "\n\t--> "+ round( d ) );
     
        d = new BigDecimal( 
            "608375017745352119000495708316353808485004039356.42384923");
        System.out.println( "Rounded decimal 1: "+ d + "\n\t--> "+ round( d ) );
        
        d = new BigDecimal( 
            "608375017745352119000495708316353808485004039356.52384923");
        System.out.println( "Rounded decimal 1: "+ d + "\n\t--> "+ round( d ) );
    }

}
