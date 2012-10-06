// Author:  Henry Feild
// File:    DecryptEArtifacts.java
// Date:    12-May-2011

package edu.umass.ciir.crowdlogger.server;

import java.util.HashMap;
import java.util.Map;
import java.math.BigDecimal;

/**
 * Contains functions for an implementation of an interpolation method, such
 * as Lagrange or Newtonian interpolation.
 * 
 * 
 * @author hfeild
 *
 */
public abstract class BigDecimalInterpolator
{
    /** Holds all of the (x,y) pairs that we are going to interpolate. */
    protected HashMap<BigDecimal, BigDecimal> points;
    protected int degree;
    
    /**
     * Initializes the set of points over which the interpolation will occur.
     * 
     * @param points A map consisting of (x,y) pairs.
     */
    public BigDecimalInterpolator( HashMap<BigDecimal, BigDecimal> points )
    {
        this( points, points.size()-1 );
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
    public BigDecimalInterpolator( HashMap<BigDecimal, BigDecimal> points,
            int degree )
    {
        this.points = points;
        this.degree = degree;
    }
    
    /**
     * Adds the given (x,y) pair to the list of points over which to 
     * interpolate.
     * 
     * @param x The x-value.
     * @param y The associated y-value.
     */
    public void addPoint( BigDecimal x, BigDecimal y )
    {
        points.put( x, y );
    }
    
    
    /**
     * Calculates the y-value associated with x using Lagrange interpolation.
     * 
     * @param x The x-value to evaluate.
     * 
     * @return The y-value corresponding to the given x.
     */
    public abstract BigDecimal evaluate( BigDecimal x );
    
    /**
     * Calculates the y-value associated with x given the interpolation and
     * rounds it to the nearest whole number.
     * 
     * @param x The x-value to evaluate.
     * 
     * @return The y-value corresponding to the given x, rounded to the nearest
     * whole number.
     */
    public abstract String evaluateAndRound(BigDecimal x);

}
