<?php

/**
 *  File:	 checkStatus.php
 *  Date:    21-Dec-2010
 *  Author:	 Henry Feild
 *  Purpose: Lets a user know what they have won, if anything. Expects
 *	         a registration id as a parameter (regID). The output format
 *	         is: 
 *
 *	    	    <date>  <win url>  <redeemed?>
 *
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');

require( dirname(__FILE__) . '/../import.php' );

$reg_id = getParam( 'regID' );


// Verify that the reg_id is not blank -- quit if it is.
if( $reg_id == "" )
{
    print "false";
    exit;
}


// Connect to mysql.
if( !($connection = @ mysql_connect( $myHost, $myUser, $myPW ) ) )
   die( "Could not connect to mysql." );
// Connect to database.
if( !mysql_select_db( $myDB, $connection ) )
   die( "Could not connect to database." );

// Lock the myInfoTab table.
$query = "LOCK TABLES $myDrawingTab READ";
if( !(@ mysql_query( $query, $connection) ) )
   die( "Couldn't lock." );


$query = "select * from $myDrawingTab where reg_id = '{$reg_id}'";
// Run the query.
$result = mysql_query( $query, $connection );

// Translate the output to an array.
while( $row =  mysql_fetch_array( $result ) )
{

    // Check that the row is not expired!!
    if( time() < strtotime( $row['exp_date'] ) ) 
        printf( "%s\t%s\t%s\n", $row['date'], $row['url'], $row['redeemed'] );
}

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
   //return isset($_POST[$name]) ? mysql_real_escape_string($_POST[$name]) : "";
   return isset($_GET[$name]) ? mysql_real_escape_string($_GET[$name]) : "";
}


?>
