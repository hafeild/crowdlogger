<?php

/**
 * Compares two version strings, e.g., "5.0.0.32" and "5.0.1.3".
 * 
 * @param v1  A version string.
 * @param v2  A version string.
 * @return -1, 0, or 1 if v1 is less than, equal to, or greater than v2.
 */
function compareVersions( $v1, $v2 ){
    // Perform the comparison -- check major, mid, and minor numbers.
    $v1Parts = preg_split( "/\./", $v1 );
    $v2Parts = preg_split( "/\./", $v2 );

    $maxLength = max( count($v1Parts), count($v2Parts) );

    for( $i = 0; $i < $maxLength; $i++ ) 
    {
        $curV1Val = ($i < count($v1Parts) ? intval($v1Parts[$i]) : 0);
        $curV2Val = ($i < count($v2Parts) ? intval($v2Parts[$i]) : 0);

        if( $curV1Val < $curV2Val ){
            return -1;
        } else if( $curV1Val > $curV2Val ){
            return 1;
        }
    }
    // If we've reached here, the versions must be the same.
    return 0;
}