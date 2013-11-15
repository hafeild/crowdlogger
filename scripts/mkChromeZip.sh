#!/bin/bash

if [ $# -ne 2 ]
then
    echo "Usage: mkChromeZip.sh <chrome dir> <name of zip to make>"
    echo "Note: we'll add the .zip for you, so no need to include it."
    exit
fi

cwd=$PWD
chrome_dir=$1
out=$cwd/`echo $2 | perl -pe 's/.zip$//'`.zip

#echo -e "\nFirefox dir:\t[$ff_dir]\nXPI file:\t[$out]\n"

#echo "Removing $out if it exists."
rm -f $out
cd $chrome_dir
#echo "Making XPI."
zip -q -r $out * -x \*.git\* -x \*.txt -x \*.lock -x \*.sh -x \*.zip -x changelogs\* 
#echo -e "Finished!"
echo "Wrote $out"