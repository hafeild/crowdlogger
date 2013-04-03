<?php
require( '../lib/util.php' );


$update = "%%VERSION%%";
$clientVersion = $_GET['version'];

$compVal = compareVersions($update, $clientVersion);

if( $compVal == 1 ){
    print "update";
} else if( $compVal == -1 ){
    print "you're ahead of the curve!";
} else {
    print "you're up-to-date";
}

?>
