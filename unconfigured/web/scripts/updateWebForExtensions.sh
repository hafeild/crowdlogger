
## Args: location of xpi/crx (should be named "%%EXTENSION_FILE_NAME%%.(xpi)|(crx)"), current version number, new version number
if [ $# -ne 3 ]
then
    echo
    echo "Usage: updateWebForExtensions.sh <publicDir> <inDir> <oldVer> <newVer>"
    echo
    echo "Purpose: looks for %%EXTENSION_FILE_NAME%%.{xpi,crx} in <inDir> and copies"
    echo "them to the correct place (in the updates directory). This includes"
    echo "creating a new <newVer> directory in <publicDir>/updates/ff/ and "
    echo "<publicDir>/updates/chrome and replaces the "
    echo "<publicDir>/updates/{ff,chrome}/latest/%%EXTENSION_FILE_NAME%%.{crx,xpi} "
    echo "with the new version.  Also goes through download.html and"
    echo "updates/ff/update.rdf and replaces the <oldVersion> number with "
    echo "the <newVersion> number."
    echo
    exit
fi

## The user inputs.
updateDir=$1
inDir=$2
oldVersion=$3
newVersion=$4

## The update, FF, and Chrome directories & other files.
ffDir="$updateDir/ff"
chromeDir="$updateDir/chrome"
versionFile="$updateDir/versions.txt"
extensionChrome="%%EXTENSION_FILE_NAME%%.crx"
extensionFF="%%EXTENSION_FILE_NAME%%.xpi"

## Make a directory for the new version (for both FF and Chrome) and move
## the new extensions into their respective directories.
mkdir $ffDir/$newVersion && mv $inDir/$extensionFF $ffDir/$newVersion/
mkdir $chromeDir/$newVersion && mv $inDir/$extensionChrome $chromeDir/$newVersion/

## Update the 'latest' directory for both FF and Chrome.
rm $ffDir/latest/$extensionFF; cp $ffDir/$newVersion/$extensionFF $ffDir/latest/
rm $chromeDir/latest/$extensionChrome; cp $chromeDir/$newVersion/$extensionChrome $chromeDir/latest/



## Replace all occurrences of the old version number with the new 
## version number in the update manifests for both FF and Chrome.
perl -pi -e 's/'$oldVersion'/'$newVersion'/g' $ffDir/update.rdf $chromeDir/update.xml download.html

## Append the new version to the list of versions.
echo $newVersion >> $versionFile
