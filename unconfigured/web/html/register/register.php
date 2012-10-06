<?php

// REGISTER.PHP

error_reporting(E_ALL);
ini_set('display_errors', '1');

require( dirname(__FILE__) . '/../import.php' );
require( 'generateID.php' );

/**
 *  Registers a user, which translates to accepting demographic information.
 */
// Initialize all of the user attributes.
$parameters                     = array();
$reg_id                         = getParam( 'userID' );
$parameters['age']              = getParam( 'age' );
$parameters['gender']           = getParam( 'gender' );
$parameters['occupation']       = getParam( 'occupation' );
$parameters['concentration']    = getParam( 'concentration' );
$parameters['nationality']      = getParam( 'nationality' );
$parameters['country']          = getParam( 'country' );
$parameters['state']            = getParam( 'state' );
$parameters['internet_usage']   = getParam( 'internet_usage' );
$parameters['web_search_usage'] = getParam( 'web_search_usage' );
$parameters['education']        = getParam( 'education' );
$parameters['opt_out_of_payment']    = getParam( 'optOutPayment' );
$parameters['referred_by']        = getParam( 'referrer' );
$parameters['ir_community']        = getParam( 'ir_community' );
$parameters['multiple_installs']        = getParam( 'multiple_installs' );
$parameters['primary_location']        = getParam( 'primary_location' );

// A flag that is set if this is an update to an existing registrant.
$update = false;


// Verify that the reg_id is not blank -- quit if it is.
if( $reg_id == "" )
{
    print "false";
    exit;
}

/*
if( $reg_id == "the_dev" )
{
    print "c:xxxxxxxxxxxxxxxxxxxxxxxxx";
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
   print "false";
   exit;
}




// Lock the myInfoTab table.
$query = "LOCK TABLES $myInfoTab WRITE";
if( !(@ mysql_query( $query, $connection) ) )
   die( "Couldn't lock." );


    // We're updating.
    // Get the referal id.
    $query = "select referal_id from $myInfoTab where reg_id = '{$reg_id}'";
    // Run the query.
    $result = @ mysql_query( $query, $connection );

    // Translate the output to an array.
    $row =  @ mysql_fetch_array( $result );


    // Keep track of the referal id -- it gets printed out at the end.
    $parameters['referal_id'] = $row['referal_id'];

if( $parameters['referal_id'] == "NULL" || $parameters['referal_id'] == "" )
{
    $parameters['referal_id'] = 
        generateRandomID( 
           $myHost, $myUser, $myPW, $myDB, $myReferTab, "referal_id" );

    if( $parameters['referal_id'] != null && $parameters['referal_id'] != "false" )
    {
        // Add the registrant's reg_id to the referal table.

        // Lock the refer table.
//        $query = "LOCK TABLES $myReferTab WRITE";
//        if( !(@ mysql_query( $query, $connection) ) )
//           die( "Couldn't lock." );


        // Make the query to add the registrant's id to the referer table.
        $query = "update $myReferTab set reg_id = '$reg_id' " .
                 "where referal_id = '{$parameters['referal_id']}'";

    }
    else
    {
        // Unlock the table.
        $query = "UNLOCK TABLES";
        if( !(@ mysql_query( $query, $connection ) ) )
           die( "Couldn't unlock." );
        print "fail";
        exit;
    }
}

    // Create the query to update the registration
    $query = createUpdateRegistrantQuery( $reg_id, $parameters, $myInfoTab );

// FOR DEBUGGING
//print "Query:<br><ul>$query</ul><br>";

// Create the query to update the database with the demographic information.
if( !( @ mysql_query( $query, $connection ) ) )
{
    print "Couldn't create or update row: ";
    print "<br>" .  mysql_error();
    exit;
}


// Unlock the table.
$query = "UNLOCK TABLES";
if( !(@ mysql_query( $query, $connection ) ) )
   die( "Couldn't unlock." );

// Print the referal_id to the screen.
print "c:{$parameters['referal_id']}";


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
   return isset($_POST[$name]) ? mysql_real_escape_string($_POST[$name]) : "";
}

/**
 * Creates the MySQL registration update query. Values are only added in if
 * they are non-empty and non-default.
 *
 * @param reg_id    The reg_id of the registrant to update.
 * @param parameters    A hash of parameters and values.
 * @param table        The DB table that holds the registrant information.
 */
function createUpdateRegistrantQuery( $reg_id, $parameters, $table )
{
    $query = "update {$table} set ";
    $first = true;

    foreach( $parameters as $key => $val )
    {
        // If the current value is blank or "default", skip it -- we don't
        // want to update that attribute.
    if( $val == "" or $val == "default" )
            continue;

        if( !$first )
            $query .= ", ";
        $query .= "$key = '$val'";
        $first = false;
    }

    return $query . " where reg_id = '" . $reg_id . "';";
}

/**
 * Creates the MySQL registration entry for a new registrant.
 *
 * @param reg_id    The reg_id of the registrant to update.
 * @param parameters    A hash of parameters and values.
 * @param table        The DB table that holds the registrant information.
 */
function createNewRegistrantQuery( $reg_id, $parameters, $table )
{
    $query = "insert into {$table} set reg_id = '{$reg_id}'";

    // We're using this to make sure we don't put a comma before the first
    // parameter name.
    $first = true;

    foreach( $parameters as $key => $val ) 
    {  
        $query .= ", $key = '$val'";
        $first = false;
    }

    return $query . ";";
}

?>
