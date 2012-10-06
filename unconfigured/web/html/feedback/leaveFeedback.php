<html>
<head>
    <title>CrowdLogger Feedback</title>
    <link rel="stylesheet" type="text/css" media="screen" href="../style/style.css">
</head>
<body>
<div class="bodyWrapper">

    <!-- The header. -->
    <div class="header">
        <div class="title">
            <span class="titleMain">Feedback Form</span><br>
            <span id="subtitle">
                <span class="titleSmall">for the</span><br>
                <span class="titleSub">CrowdLogger Project</span>
            </span>
        </div>
    </div>

    <!-- Brings us down to just below the title. -->
    <div style="clear: both;"></div>
    <div class="headerBuffer"></div>


<div id="iframe">
   <iframe src="../menu.html" marginheight="0" width="100%" frameborder="0" scrolling="no"
        height=70px>
   </iframe>
</div>

<p>

Thank you for your feedback!

   <!-- Everything below here is for the footer. -->
    <div class="buffer">
    </div>

<div id="iframe">
   <iframe width="100%" src="../copyright.html" scrolling=no 
           frameborder=0 marginheight=0 height=40px>
   </iframe>
</div>

</div>

<div class="emptyFooter">
</div>


</body>
</html>

<?php

error_reporting(E_ALL);
ini_set('display_errors', '1');

require( dirname(__FILE__) . '/../import.php' );

$time = date("r");
$message = isset($_POST['message']) ? mysql_real_escape_string($_POST['message']) : "";

// Connect to mysql.
if( !($connection = @ mysql_connect( $myHost, $myUser, $myPW ) ) )
   die( "Could not connect to mysql." );
// Connect to database.
if( !mysql_select_db( $myDB, $connection ) )
   die( "Could not connect to database." );


// Lock the myInfoTab table.
$query = "LOCK TABLES $myMessageTab WRITE";
if( !(@ mysql_query( $query, $connection) ) )
   die( "Couldn't lock." );


$query = "insert into $myMessageTab set message = '{$message}', timestamp = '{$time}';";
if( !(@ mysql_query( $query, $connection) ) )
   die( "Couldn't insert." );

// Unlock the table.
$query = "UNLOCK TABLES";
if( !(@ mysql_query( $query, $connection ) ) )
   die( "Couldn't unlock." );

?>
