<?php

// VERIFYID.PHP

error_reporting(E_ALL);
ini_set('display_errors', '1');

require( dirname(__FILE__) . '/../import.php' );
require( 'generateID.php' );

/**
 *  Registers a user, which translates to accepting demographic information.
 */
// Initialize all of the user attributes.
$reg_id                         = getParam( 'userID' );

// Verify that the reg_id is not blank -- quit if it is.
if( $reg_id == "" )
{
    print "invalid";
    exit;
}

/*
if( $reg_id == "the_dev" )
{
    print "valid";
    exit;
}
*/
// Connect to mysql.
if( !($connection = @ mysql_connect( $myHost, $myUser, $myPW ) ) )
   die( "Could not connect to mysql." );
// Connect to database.
if( !mysql_select_db( $myDB, $connection ) )
   die( "Could not connect to database." );


// Check if the id passed in is valid.
if( !reg_idIsValid( $reg_id, $myInfoTab, $connection ) )
{
   print "invalid";
} else {
   print "valid";
}


/**
 * Checks the given table to see if the given id is present.
 * 
 * @param id          The user id to verify.
 * @param table          The table to look the ip up in.
 * @param connection  The database connection.
 * @return true if the user id is in the table, false otherwise.
 */
function reg_idIsValid( $reg_id, $table, $connection ) 
{
    $retValue = false;

    // Lock the myIDTab table so we can verify that the supplied ID is valid.
/*    $query = "LOCK TABLES $table READ";
    if( !(@ mysql_query( $query, $connection) ) )
       die( "Couldn't lock." ); 
*/    
    $query = "select * from {$table} where reg_id = \"{$reg_id}\"";
    // Run the query.
    $result = @ mysql_query( $query, $connection );
    
    // Translate the output to an array.
    $row =  @ mysql_fetch_array( $result );
    
    // If the row array is null, then we know the reg_id isn't valid.
    if( $row != null )
       $retValue = true;
 
/*
    // Unlock the table.
    $query = "UNLOCK TABLES";
    if( !(@ mysql_query( $query, $connection ) ) )
       die( "Couldn't unlock." );
*/    
    return $retValue;
}

/**
 * Returns the post parameter, if present (default is ""). The string is
 * escaped using mysql_real_escape_string().
 *
 * @param name    The name of the parameter to get from $_POST.
 * @return    The value passed in for name or "" if name is not in $_POST.
 */
function getParam( $name )
{
   return isset($_GET[$name]) ? mysql_real_escape_string($_GET[$name]) : "";
}

?>
