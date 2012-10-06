<?php
require( dirname(__FILE__) . '/../import.php' );

$date = getParam( 'date' );
$url  = getParam( 'url' );


// Connect to mysql.
if( !($connection = @ mysql_connect( $myHost, $myUser, $myPW ) ) )
   die( "Could not connect to mysql." );
// Connect to database.
if( !mysql_select_db( $myDB, $connection ) )
   die( "Could not connect to database." );

// Lock the myInfoTab table.
$query = "LOCK TABLES $myDrawingTab WRITE";
if( !(@ mysql_query( $query, $connection) ) )
   die( "Couldn't lock." );


$query = "select * from $myDrawingTab where date = '{$date}' and url = '{$url}'";
// Run the query.
$result = mysql_query( $query, $connection );

$row =  mysql_fetch_array( $result );

if( $row != null )
{
    $reg_id = $row['reg_id'];

    // Check if this has been redeemed yet or not; if not, flip the flag to
    // indicate it has been redeemed.
    if( $row['redeemed'] == "no" )
    {
        $query = "update $myDrawingTab set  redeemed = 'yes' where reg_id = '{$reg_id}'";
        // Run the query.
        mysql_query( $query, $connection );
    }

    $file = "$include/retrieve/$url.pdf";

    header('Content-Description: File Transfer');
    header('Content-Type: application/pdf');
    header('Content-Length: ' . filesize($file));
    header('Content-Disposition: inline; filename=' . basename($file));
    readfile($file);
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
