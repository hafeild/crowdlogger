<?php

error_reporting(E_ALL);
ini_set('display_errors', '1');

require( dirname(__FILE__) . '/../import.php' );
require( 'generateID.php' );

/**
 *  Returns an unused id to the user.
 */
$username = "";
$isValidUsername = false;

//print "At beginning.<br>" ;
//print "myIDTab: " . $myIDTab . "<br>";
//print "myHost: " . $myHost . "<br>";


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
/*
// Generate a new user id (making sure it's not already in the db).
do {
   // Generate a random username.
   $username = md5(uniqid("",true));

   // Check if this username is already taken.
   $query = "select * from {$myInfoTab} where reg_id = \"{$username}\"";

   // Run the query.
   $result = @ mysql_query( $query, $connection );

   // Translate the output to an array.
   $row =  @ mysql_fetch_array( $result );

   // If the row array is null, then we know the username hasn't been used
   // yet.
   $isValidUsername =  ($row == null);

//   if( !$isValidUsername )
//      print "username already in use: " . $username . "<br>";

} while( !$isValidUsername );
*/

$username = generateRandomID(
    $myHost, $myUser, $myPW, $myDB, $myInfoTab, "reg_id" );
$referal_id = generateRandomID(
    $myHost, $myUser, $myPW, $myDB, $myReferTab, "referal_id" );

// Insert the name into the database.
$query = "update $myInfoTab set  consent_date = '".
     date( "r" ) . "', referal_id = '{$referal_id}' where reg_id = '{$username}'";
if( !(@ mysql_query( $query, $connection ) ) )
  print "Error inserting into table.";

print "id:".$username;

//print "In middle.<br>" ;

// Unlock the table.
$query = "UNLOCK TABLES";
if( !(@ mysql_query( $query, $connection ) ) )
   die( "Couldn't unlock." );

//print "At end.<br>" ;

?>
