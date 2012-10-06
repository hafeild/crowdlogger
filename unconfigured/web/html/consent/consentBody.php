<?php

$inRemovedPart = false;

$f = fopen( "../consent.html", "r" );
while( $line = fgets($f) )
{
    if( !$inRemovedPart )
    {
        if( preg_match( $line, "<!-- BEGIN REMOVE -->" ) > 0 )
        {
            $inRemovedPart = true;
        }
        else
        {
            print $line;
        }
    }
    else if( preg_match( $line, "<!-- END REMOVE -->" ) > 0 )
    {
        $inRemovedPart = false;
    }
} 
fclose( $f );
?>
