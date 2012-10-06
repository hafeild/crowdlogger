#!/bin/bash

if [[ $# < 3 ]]; then
    echo "Usage: slog2clog.sh <private key file> <working dir> <server files>"
    echo
    echo "<private key file> is your private.pem file for which the eartifacts"
    echo "  were encoded. The file can be named anything, though."
    echo
    echo "<workding dir> is where new files and directories will be created."
    echo
    echo "<server files> are the eartifacts.<date>.<part> files collected by"
    echo "the master server. You can specify as many as you'd like."
    exit
fi


privateKey=$1
workingDir=$2
shift 2
inputFiles=$@
serverWebAppDir=${0%/*}/../

## Reset then fill the classpath.
CLASSPATH=
append_classpath() {
  local DIRECTORY=$1
  for f in `find $DIRECTORY -name "*.jar"`; do
    if [ "${#CLASSPATH}" -eq "0" ]; then
      CLASSPATH=$f
    else
      CLASSPATH="${CLASSPATH}:${f}"
    fi
  done
}
append_classpath $serverWebAppDir




eartifactFileDir="$workingDir/eartifactFiles"
mkdir $eartifactFileDir

java edu.umass.ciir.crowdlogger.server.EEArtifactDecryptor $privateKey $eartifactFileDir $inputFiles &> /dev/null

jobNames=`ls -1 $eartifactFileDir/ | cut -d'-' -f1 | sort -u`

for j in $jobNames; do
    echo "creating $workingDir/$j.clog"
    java -cp $CLASSPATH edu.umass.ciir.crowdlogger.server.EArtifactDecryptor \
        $workingDir/$j.clog \
        $eartifactFileDir/$j* &> /dev/null 
done
