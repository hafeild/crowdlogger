<?php

$curtime = date("r") . "";
$curtime = preg_replace( '/\s+/', "_", $curtime ); 
$fname = "logs/$curtime.log";
$i = 0;
while( file_exists( $fname ) )
{
    $fname = "logs/$curtime.$i.txt";
    $i++;
}

$f = fopen( $fname, "w" );
fwrite( $f, $_POST['error'] ); //urldecode( $_POST['error'] ) );
#fwrite( $f, "test" ); //urldecode( $_POST['error'] ) );
fclose( $f );

?>
