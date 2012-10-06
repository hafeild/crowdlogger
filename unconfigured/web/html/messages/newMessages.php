<?php

/** 
 * File:    newMessages.php
 * Date:    17-Dec-2010
 * Author:  Henry Feild
 * Purpose: Expects a 'msgID' parameter, which signifies the last
 *          message id seen by the requester. If there are messages that
 *          have an id greater than that id, this script will output the most
 *          recent message id along with the most recent three messages. 
 *          The output will be blank, otherwise.
 */
$msgToDisplay = 3;

if( isset( $_GET['msgID'] ) && ereg( '^[0-9]+$', $_GET['msgID'] ) ) 
{
	$order = intval($_GET['msgID']);

    $messages = array();

	//print "msgID = $order<br>";

	$maxID = 0;

	//$seendHeader = false;
	$thereAreNewMessages = false;

	// Walk through the message file and see if there are any messages
	// with an id greater than the one passed in.
	$f = fopen( "messages.txt", "r" );
	while( $line = fgets($f) )
	{
//		if( !$seenHeader )
//		{
//			$seenHeader = true;
//			continue;
//		}

        if( preg_match( "/^#/", $line ) )
            continue;

		$parts = preg_split("/\t/", $line);

		$id = intval($parts[0]);

		//print "id = $id<br>";
        array_push( $messages, $parts );

		if( $id > $order )
		{
			$thereAreNewMessages = true;
			//print "$line<br>";
			if( $id > $maxID ){
				//print "$id > $maxID<br>";
				$maxID = $id;
			}
		}
	}
	fclose($f);

	// If there are new messages, tell the requester.
	if( $thereAreNewMessages )
    {
		print $maxID . "\n";
    }
    else
    {
        print "nothing new\n";
    }

    // Display the most recent messages.
    $numToShow = min( $msgToDisplay, count( $messages ) );
    for( $i = 0; $i < $numToShow; $i++ )
    {
        // Note that there will already by a newline at the end.
        print implode( "\t", $messages[$i] );
    }
}


?>
