<?php

print "{";

$first = true;

foreach(glob("*/metadata.json") as $filename) {
    if($first){
        $first = false;
    } else {
        print ",";
    }

    $rawJSON = "";

    $f = fopen( $filename, "r" );
    while( $line = fgets($f) ) {
        $rawJSON .= $line;
    }
    fclose($f);

    $parsedJSON = json_decode($rawJSON, true); 

    // print 'hi!';
    print "\"${parsedJSON["clrmid"]}\": ${rawJSON}";
}

print "}";

?>