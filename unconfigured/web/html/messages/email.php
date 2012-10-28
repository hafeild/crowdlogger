<?php

//ini_set("display_errors","1");
//ERROR_REPORTING(E_ALL);

if( %%USE_SERVER_EMAIL%% ){

require( dirname(__FILE__) . '/../import.php' );
require( '../register/generateID.php' );

$reg_id = getParam( 'userID' );
$emails = getParam( 'emails' );
$sender = getParam( 'sender' );

// Connect to mysql.
if( !($connection = @ mysql_connect( $myHost, $myUser, $myPW ) ) )
   die( "Could not connect to mysql." );
// Connect to database.
if( !mysql_select_db( $myDB, $connection ) )
   die( "Could not connect to database." );

// Lock the myInfoTab table.
$query = "LOCK TABLES $myInfoTab WRITE";
if( !(@ mysql_query( $query, $connection) ) )
   die( "Couldn't lock." );


// Check if the id passed in is valid.
if( !reg_idIsValid( $reg_id, $myInfoTab, $connection ) )
{
   print "false";
   exit;
}

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

// Unlock the table.
$query = "UNLOCK TABLES";
if( !(@ mysql_query( $query, $connection ) ) )
   die( "Couldn't unlock." );




if( eregi("TO:", $emails) || eregi("CC:", $emails) || 
    eregi("BCC:", $emails) || eregi("CCO:", $emails) || 
    eregi("Content-Type", $emails) )
{
    die("false");
}
else
{

    $fullMessage = <<<EOT
%%EMAIL_BODY%%
EOT;

    $fullMessage = preg_replace("/ADD_CODE_HERE/", $code, $fullMessage);
    $fullMessage = preg_replace("/YOUR_NAME_HERE/", $sender, $fullMessage);

    $successful_emails = "";
    $num_successful_emails = 0;
    $unsuccessful_emails = "";
    $num_unsuccessful_emails = 0;

    $addresses = preg_split( "/,/", $emails );
    foreach( $addresses as $address )
    {
        if(send_email( $fullMessage, $address ))
        {
            if( $num_successful_emails > 0 )
                $successful_emails .= ", ";
            $successful_emails .= $address;
            $num_successful_emails++;
        } 
        else 
        {
            if( $num_unsuccessful_emails > 0 )
                $unsuccessful_emails .= ", ";
            $unsuccessful_emails .= $address;
            $num_unsuccessful_emails++;
        }
    }

    // This is kind of funny to do, but it's really just so I can easly change
    // the format of what's returned if we're successful or not later on.
    if( $num_unsuccessful_emails > 0 )
        echo "false\t$successful_emails\t$unsuccessful_emails";
    else
        echo "true\t$successful_emails";
} 


function send_email( $message, $to )
{
    //define the subject of the email
    $subject = '%%EMAIL_SUBJECT%%';
    //define the headers we want passed. Note that they are separated with \r\n
    $headers = "From: %%EMAIL_FROM%%\r\nReply-To: %%EMAIL_FROM%%\r\nBcc: $to";
    
    //send the email
    return  @mail( $to, $subject, $message, $headers );
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
   //return isset($_GET[$name]) ? mysql_real_escape_string($_GET[$name]) : "";
   return isset($_POST[$name]) ? mysql_real_escape_string($_POST[$name]) : "";
}

}
?>
