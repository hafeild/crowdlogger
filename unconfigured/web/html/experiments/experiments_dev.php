<?php

/**
 * Returns all the experiments with an order number greater than the
 * one passed in via the 'order' GET parameter.
 */

require( dirname(__FILE__) . '/../import.php' );

$experimentsFile = "experiments_dev.txt";

$participantLimit = 200;
$consentDate      = strtotime("Wed Dec 29 16:36:40 EST 2010");

$reg_id = isset( $_GET['userID'] ) ? mysql_real_escape_string( $_GET['userID'] ) : "";

if( $reg_id == "" )
    exit;

// Connect to mysql.
if( !($connection = @ mysql_connect( $myHost, $myUser, $myPW ) ) )
   die( "Could not connect to mysql." );

// Connect to database.
if( !mysql_select_db( $myDB, $connection ) )
   die( "Could not connect to database." );


// Make sure there is an 'order' parameter and that it is a number.
if( reg_idIsValid( $reg_id, $myInfoTab, $connection ) ) 
{
    

    // Make the MySQL query to get the registration number and 
    // consent date for the current user.
    $query = "select consent_date, reg_number from {$myInfoTab} " . 
        "where reg_id = \"{$reg_id}\"";

    // Run the query.
    $result = @ mysql_query( $query, $connection );

    // Translate the output to an array.
    $row =  @ mysql_fetch_array( $result );

    

    $userConsentDate = $row['consent_date'];
    $regNumber       = $row['reg_number'];

    $userConsentTime = $consentDate;

    if( $userConsentDate != "" && $userConsentDate != "NULL" )
        $userConsentTime = strtotime( $userConsentDate );

/*
    print "#row: $row<br>\n";
    print "#regNumber: $regNumber<br>\n";
    print "#userConsentDate: $userConsentDate<br>\n";
    print "#userConsentTime: $userConsentTime<br>\n";
*/

    // If the user has not consented to the most recent consent form,
    // don't read the experiments file; rather, send the "CONSENT" code.
    if( $userConsentTime < $consentDate )
    {
        print "CONSENT";
    }
    // Otherwise, read in the experiments file.
    else
    {
        $header = true;
    	$f = fopen( $experimentsFile, "r" );
    
    	while( $line = fgets($f) )
        {
            if( $header )
            {
                $header = false;
            }
            else
            {
                $parts = preg_split( '/\t/', $line );

                // Check if we are over the participant limit; if we are,
                // give the user a 'NULL' experiment to run.
                if( intval( $regNumber ) > $participantLimit )
                    $parts[1] = "NULL_EXPERIMENT_" . $parts[1];

                print join( "\t", $parts );
            }
        }

    	fclose($f);
    }
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
