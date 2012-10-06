#!/bin/bash


if [ $# -lt 1 ]; then
    echo "=================================================================="
    echo
    echo "Usage: get-jars.sh <path to server-web-app directory>"
    echo
    echo "This script will download all the necessary jars to the lib/ and "
    echo "WebContent/WEB-INF/lib/ directories of the server-web-app dir."
    exit
    echo "=================================================================="
fi

dir=$1
libDir="$dir/lib"
webInfDir="$dir/WebContent/WEB-INF/lib/"

mkdir -p $libDir
mkdir -p $webInfDir

libJars=(
    "http://mirrors.ibiblio.org/pub/mirrors/maven/servletapi/jars/servlet-api-2.4.jar"
)

webInfJars=( 
    "http://mirrors.ibiblio.org/pub/mirrors/maven2/org/apache/james/apache-mime4j/0.6/apache-mime4j-0.6.jar"
    "http://mirrors.ibiblio.org/pub/mirrors/maven2/commons-codec/commons-codec/1.3/commons-codec-1.3.jar"
    "http://mirrors.ibiblio.org/pub/mirrors/maven2/commons-logging/commons-logging/1.1.1/commons-logging-1.1.1.jar"
    "http://mirrors.ibiblio.org/pub/mirrors/maven2/org/apache/httpcomponents/httpclient/4.0.1/httpclient-4.0.1.jar"
    "http://mirrors.ibiblio.org/pub/mirrors/maven2/org/apache/httpcomponents/httpcore/4.0.1/httpcore-4.0.1.jar"
    "http://mirrors.ibiblio.org/pub/mirrors/maven2/org/apache/httpcomponents/httpmime/4.0.1/httpmime-4.0.1.jar"
    "http://mirrors.ibiblio.org/pub/mirrors/maven2/org/json/json/20090211/json-20090211.jar"
    "http://mirrors.ibiblio.org/pub/mirrors/maven2/ca/juliusdavies/not-yet-commons-ssl/0.3.11/not-yet-commons-ssl-0.3.11.jar"
)


function downloadTo {
    file=$1 
    dir=$2
    echo "Downloading $file..."
    wget -P $dir $file
}

for f in ${libJars[@]}; do
    downloadTo $f $libDir
done

for f in ${webInfJars[@]}; do
    downloadTo $f $webInfDir 
done
