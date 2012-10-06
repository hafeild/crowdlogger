<?php

/** 
 * File:    messages.php
 * Date:    17-Dec-2010
 * Author:  Henry Feild
 * Purpose: Generates an html page to display all of the current
 *          messages. 
 */

// The columns in the message file, base 0.
$DATE = 1;
$MESSAGE = 2;
?>

<html>
<head>
    <title>CrowdLogger Messages</title>
    <link rel="stylesheet" type="text/css" media="screen"
      href="../style/style.css" />
</head>

<body>

<div class="bodyWrapper">

    <!-- The header. -->
    <div class="header">
        <div class="title">
            <span class="titleMain">CrowdLogger</span><br>
            <span id="subtitle">
                <span class="titleSub">Messages</span>
                <br>
            </span>
        </div>
    </div>

<div id="iframe">
   <iframe src="../menu.html" marginheight="0" width="100%" frameborder="0" scrolling="no"
        height=70px>
   </iframe>
</div>


<h1>Messages from the Privacy Preserving Search Logger Project Researchers</h1>

Below is a listing of important messages from the study researchers, sorted
by date. You can get messages emailed to you by signing up with <a href="http://groups.google.com/group/crowdlogger-project-news?pli=1">this Google Group</a>.

<p>

<div align="center" style="margin-left: auto; margin-right: auto">
<table class="pattern" width="100%">
  <tr>
    <th>Date</th>
    <th>Message</th>


<?php
$seendHeader = false;

// Walk through the message file and see if there are any messages
// with an id greater than the one passed in.
$f = fopen( "messages.txt", "r" );
while( $line = fgets($f) )
{
//	if( !$seenHeader )
//	{
//		$seenHeader = true;
//		continue;
//	}
    if( preg_match( "/^#/", $line ) )
       continue;


	$parts = preg_split("/\t/", $line);

	$time = strftime( "%D", strtotime($parts[$DATE]) );

	print "  <tr>\n";
	print "    <td>{$time}</td>\n";
	print "    <td>{$parts[$MESSAGE]}</td>\n";
	print "  </tr>";

}
fclose($f);
?>

</table>
</div>
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

