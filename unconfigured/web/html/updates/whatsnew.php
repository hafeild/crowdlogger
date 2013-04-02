<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');

$changelogDir = "changelogs";
// $version = $_GET['version'];
// $changelogText = "We apologize, but we could not locate a changelog for version $version.";

// $file = "$changelogDir/$version";
$file = "$changelogDir/all.html";

// if( preg_match( '/^((\d)*|\.*)*$/', $version ) > 0 && file_exists( $file ) )
// {
    $changelogText = "";

    $f = fopen( $file, "r" );
    while( $line = fgets($f) )
    {
        $changelogText .= $line;
    }
    fclose( $f );
// }
?>
<html>
<head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8">
    <title>%%PROJECT_NAME%%&mdash;What's new</title>
    <link href="../style/style.css" rel="stylesheet" type="text/css">
</head>
<body>
<div class="bodyWrapper">

    <!-- The header. -->
    <div class="header">
        <div class="title">
            <span class="logo-version">version %%VERSION%%</span>
            <img class="logo" src="../images/crowdlogger-logo.002.png"/>
            <span class="titleMain">Changelog</span><br>
            </span>
        </div>

        <div id="iframe" class="menu-frame">
           <iframe src="../menu.html" marginheight="0" width="100%" 
           frameborder="0" scrolling="no" height="70px">
           </iframe>
        </div>
        <div id="share-iframe" class="share-iframe">
           <iframe src="../share.html" marginheight="0" width="100%" 
           frameborder="0" scrolling="no" height="80px">
           </iframe>
        </div>

    </div>

    <!-- Brings us down to just below the title. -->
    <div style="clear: both;"></div>
    <div class="headerBuffer"></div>



<?php echo $changelogText; ?>



    <!-- Everything below here is for the footer. -->
    <div class="buffer">
    </div>

<div class="copyright-frame">
   <iframe width="100%" src="../copyright.html" scrolling=no 
           frameborder=0 marginheight=0 height=40px>
   </iframe>
</div>

</div>

<div class="emptyFooter">
</div>

</body>
</html>





