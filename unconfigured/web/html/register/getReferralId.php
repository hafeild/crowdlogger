<?php

error_reporting(E_ALL);
ini_set('display_errors', '1');

require( dirname(__FILE__) . '/../import.php' );
require( 'generateID.php' );

/**
 *  Returns an unused id to the user.
 */
$reg_id = getParam( 'userID' );

if( $reg_id == "" ){
    exit;
}

// Connect to mysql.
if( !($connection = @ mysql_connect( $myHost, $myUser, $myPW ) ) )
   die( "Could not connect to mysql." );
// Connect to database.
if( !mysql_select_db( $myDB, $connection ) )
   die( "Could not connect to database." );


// Lock the myIDTab table.
$query = "LOCK TABLES $myInfoTab WRITE";
if( !(@ mysql_query( $query, $connection) ) )
   die( "Couldn't lock." ); 


// Check if the id passed in is valid.
if( !reg_idIsValid( $reg_id, $myInfoTab, $connection ) )
   exit;


$query = "select referal_id from $myInfoTab where reg_id = '$reg_id'";
// Translate the output to an array.
$result = @mysql_query( $query, $connection );
$row =  @mysql_fetch_array( $result );

$code = $row['referal_id'];

// Check if the code is null -- this means the user doesn't have  referal id
// yet.
if( $code == "" || $code == "NULL" )
{
    $code = generateRandomID(
        $myHost, $myUser, $myPW, $myDB, $myReferTab, "referal_id" );

    // Insert the name into the database.
    $query = "update $myInfoTab set referal_id = '{$code}' " .
        "where reg_id = '{$reg_id}'";
    if( !(@ mysql_query( $query, $connection ) ) )
      print "Error inserting into table.";

}



print "id:$code";

// Unlock the table.
$query = "UNLOCK TABLES";
if( !(@ mysql_query( $query, $connection ) ) )
   die( "Couldn't unlock." );


/**
 * Returns the post parameter, if present (default is ""). The string is
 * escaped using mysql_real_escape_string().
 *
 * @param name    The name of the parameter to get from $_POST.
 * @return    The value passed in for name or "" if name is not in $_POST.
 */
function getParam( $name )
{
   //return isset($_GET[$name]) ? mysql_real_escape_string($_GET[$name]) : "";
   return isset($_POST[$name]) ? mysql_real_escape_string($_POST[$name]) : "";
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


?>
