<?php
error_reporting(E_ALL);
ini_set('display_errors', '1');

$changelogDir = "changelogs";
$version = $_GET['version'];
$changelogText = "We apologize, but we could not locate a changelog for version $version.";

$file = "$changelogDir/$version";

if( preg_match( '/^((\d)*|\.*)*$/', $version ) > 0 && file_exists( $file ) )
{
    $changelogText = "";

    $f = fopen( $file, "r" );
    while( $line = fgets($f) )
    {
        $changelogText .= $line;
    }
    fclose( $f );
}
?>
<html>
<head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8">
    <title>CrowdLogger&mdash;What's new</title>
    <link href="../style/style.css" rel="stylesheet" type="text/css">
</head>
<body>
<div class="bodyWrapper">

    <!-- The header. -->
    <div class="header">
        <div class="title">
            <span class="titleMain">CrowdLogger</span><br>
            <span id="subtitle">
                <span class="titleSub">What's new in version <?php echo $version; ?></span>
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

<h1>What's new in version <?php echo $version; ?></h1>

<?php echo $changelogText; ?>

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





