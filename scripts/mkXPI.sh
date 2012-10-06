#!/bin/bash

if [ $# -ne 2 ]
then
    echo "Usage: mkXPI.sh <firefox dir> <name of xpi to make>"
    echo "Note: we'll add the xpi for you, so no need to include it."
    exit
fi

cwd=$PWD
ff_dir=$1
out=$cwd/`echo $2 | perl -pe 's/.xpi$//'`.xpi

#echo -e "\nFirefox dir:\t[$ff_dir]\nXPI file:\t[$out]\n"

#echo "Removing $out if it exists."
rm -f $out
cd $ff_dir
#echo "Making XPI."
zip -q -r $out * -x \*.git\* -x \*.txt -x \*.lock -x \*.sh -x \*.xpi -x changelogs\* -x update.rdf 
#echo -e "Finished!"
echo "Wrote $out"
