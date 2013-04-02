<?php

$update = "%%VERSION%%";
//print "update";
$clientVersion = $_GET['version'];

// Perform the comparison -- check major, mid, and minor numbers.
$updateParts = preg_split( "/\./", $update );
$clientVersionParts = preg_split( "/\./", $clientVersion );

//print "count(updateParts): " . count( $updateParts ) . "<br>";
//print "count(clientVersionParts): " . count( $clientVersionParts ) . "<br>";


for( $i = 0; 
     $i < count( $updateParts ) && $i < count( $clientVersionParts ); 
     $i++ ) 
{
    //print $updateParts[$i] . " vs. " . $clientVersionParts[$i] . "<br>"; 
    if( intval($updateParts[$i]) > intval($clientVersionParts[$i]) )
    {
        print "update";
	exit;
    } else if( intval($updateParts[$i]) < intval($clientVersionParts[$i] ) ) {
	print "you're up-to-date";
	exit;
    }

}

print "you're up-to-date";
?>
