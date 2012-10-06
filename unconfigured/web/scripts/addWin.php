
<?php
require( '../include/db.php' );

if( count( $argv ) < 2 )
{
    print <<<EOT
Usage: addWin.php <reg id> <filename>

Purpose: Adds a prize for the user with the given <reg id>. The <url> should 
point to the prize, e.g., a PDF of an Amazon gift card. The <filename> should 
look something like "a938slkekjjf83lse409skfjweoifj". It should correspond to
a file: include/retrieve/a938slkekjjf83lse409skfjweoifj.pdf, where 'include'
is the directory with the files listing the database information.

MAKE SURE THE FILE IS IN PLACE PRIOR TO RUNNING THIS SCRIPT. Once you've 
issued executed this script, the user will be notified, though there will
be a lag based on when their extension last checked. 
EOT;

    exit;
}

$prog = array_shift( $argv );

$reg_id = array_shift( $argv );
$url    = array_shift( $argv );

print "Reg id: $reg_id\n";
print "URL:    $url\n";

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


$date = date( 'r', time() );
// Add 6 months (in seconds).
$sixMonthsFromNow = time() + 60*60*24*31*6;
$expDate = date( 'r', $sixMonthsFromNow );

$query = "insert into {$myDrawingTab} values ('{$reg_id}',
'{$date}', '{$expDate}', 'no', '${url}');";

if( !(@ mysql_query( $query, $connection ) ) )
    die ("Insert failed!" );

print "Done!";

// Unlock the table.
$query = "UNLOCK TABLES";
if( !(@ mysql_query( $query, $connection ) ) )
   die( "Couldn't unlock." );



?>
