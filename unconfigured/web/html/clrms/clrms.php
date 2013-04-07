<?php
require( '../lib/util.php' );

print "{";

$crowdloggerVersion = array_key_exists('v', $_GET) ? $_GET['v'] : "2.0.1";

$first = true;

foreach(glob("*/metadata.json") as $filename) {

    $rawJSON = "";

    $f = fopen( $filename, "r" );
    while( $line = fgets($f) ) {
        $rawJSON .= $line;
    }
    fclose($f);


    $parsedJSON = json_decode($rawJSON, true); 
    $minCLVersion = array_key_exists('minCLVersion',$parsedJSON) ?
        $parsedJSON['minCLVersion'] : "0";

    // Check if the CLRM is okay for the given CrowdLogger version.
    if( compareVersions($crowdloggerVersion, $minCLVersion) < 0 ){
        continue;
    }

    if($first){
        $first = false;
    } else {
        print ",";
    }

    print "\"${parsedJSON["clrmid"]}\": ${rawJSON}";
}

print "}";

?>