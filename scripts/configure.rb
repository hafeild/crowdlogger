#!/usr/bin/ruby

################################################################################
## File:    configure.rb
## Author:  Henry Feild
## Date:    27-Oct-2011
usage = "
Usage:  configure.rb [options]

Copies the contents of the given input directory and replaces the variable names
specified in the configuration directory files (default.conf.yaml and, 
optionally, override.conf.yaml) with their values. These are writing to the 
output directory. See below for options. NOTE: THIS WILL DELETE THE OUTPUT 
DIRECTORY FIRST.

Options: 
    -h
        Show this message.

    -i=<input>
        Uses <input> as the input directory. Defaults to 'unconfigured/'.

    -o=<output>
        Uses <output> as the output directory. Defaults to 'configured/'.

    -c=<config file>
        Uses <config file> as the configuration file. This should be in YAML
        or JSON format. Any referenced files should be specified relative to
        the location of this file. You can specify more than one of these --
        variables defined in a config files listed later will override earlier
        definitions.
"
################################################################################ 
#require 'json'
require 'fileutils'
require 'psych'

INPUT_DIR = "unconfigured"
OUTPUT_DIR = "configured"
CONFIG_DIR = "config"
DEFAULT_CONFIG = "#{CONFIG_DIR}#{File::SEPARATOR}defaults.conf.yaml"

################################################################################
## Reads in a configuration file.
##
## @param file  The configuration file to read.
## @return The file contents as a hash map: keys -> values.
##
################################################################################
def readConfigFile( file )
    ## Loads the given file in as YAML and converts it into Ruby objects.
    config = Psych.load(IO.read(file, {"open_args"=>"r:utf-8"}))

    ## Replace file name with absolute paths.
    if config.has_key? "files"
        config["files"].each do |key,f|
            config["files"][key] = File.expand_path(f, File.dirname(file))
        end
    end

    config
end

################################################################################
## Searches and replaces each of the key value pairs in the given hash over the
## hash values. This way one value can refer to another key.
##
## @param searchAndReplacehash  The hash of key/value pairs to search and replace.
################################################################################
def searchAndReplaceInHash( searchAndReplaceHash )
    2.times do |i|
        for (key,contents) in searchAndReplaceHash
            contents = contents.to_s
            for (k,v) in searchAndReplaceHash
                find = "%%#{k}%%"

                ## If the value is an array, this serializes them. E.g., 
                ##      [a,b,c] => '"a","b","c"'
                replace = v.is_a?(Array) ? v.map{|x| "\"#{x}\""}.join(",") : v.to_s

                contents.gsub!( /#{find}/, replace )
            end
            searchAndReplaceHash[key] = contents
        end
    end
end

################################################################################
## Searches and replaces each of the key value pairs in the given hash in the
## contents of the given file. The file is overwritten.
##
## @param file  The path of the file in which to perform the search and replace. 
##              This file is overwritten.
## @param searchAndReplacehash  The hash of key/value pairs to search and replace.
################################################################################
def searchAndReplaceInFile( file, searchAndReplaceHash )
    contents = ""
    fd = File.open( file, "r:utf-8" )
    while line = fd.gets
        contents += line
    end
    fd.close
    
    if( contents.valid_encoding? )
        for (k,v) in searchAndReplaceHash
            find = "%%#{k}%%"

            ## If the value is an array, this serializes them. E.g., 
            ##      [a,b,c] => '"a","b","c"'
            replace = v.is_a?(Array) ? v.map{|x| "\"#{x}\""}.join(",") : v.to_s

            contents.gsub!( /#{find}/, replace )
        end
        fd = File.open( file, "w:utf-8" )
        fd.print( contents )
        fd.close
    #else
    #    puts "Couldn't process #{file}"
    end

end


################################################################################
## Merges two hashes.
##
## @param default The default hash.
## @param override The overriding hash.
## @return A merged hash, where values in <code>override</code> override 
##  the same values from  <code>default</code>.
################################################################################
def mergeHashes( default, override )
    mergedHash = {}
    for (k,v) in default
        mergedHash[k] = v
    end
       

    for (k,v) in override
        mergedHash[k] = v
    end

    return mergedHash 
end

################################################################################
## Prints the message to stderr and then exits.
##
## @param message The error message to print.
################################################################################
def die( message )
    STDERR.puts message
    exit
end

## Overview of algorithm:
## 1. read in defaults
## 2. if exists, read in override file and overwrite values in defaults.
## 3. if it exists, delete the output directory
## 4. copy input dir to output dir
## 5. for each key in the merged hash, go through the output directory and
##    search and replace everything.

## Check the args.
#if ARGV.size > 0 and ARGV[0] =~ /^-{0,1}-h/
#    die( usage )
#end

## Defaults...
outputDir = OUTPUT_DIR
inputDir  = INPUT_DIR

configFiles = []
variableHash = nil

## Read in the options, if any were provided.
for arg in ARGV
    if arg =~ /^-i=/
        inputDir = arg.gsub( /^-i=/, "" )
    elsif arg =~ /^-o=/
        outputDir = arg.gsub( /^-o=/, "" )
    elsif arg =~ /^-c=/
        configFiles << arg.gsub(/^-c=/, "")
    else
        die( "Invalid option: [#{arg}] #{usage}" )
    end
end

if configFiles.size == 0
    configFiles << DEFAULT_CONFIG
end

STDERR.puts "Input dir: #{inputDir}"
STDERR.puts "Output dir: #{outputDir}"
STDERR.puts "Configs: #{configFiles.join(", ")}"


## Check that all the directories and files exist.
unless File.directory?( inputDir )
    die( "The following directory does not exist: [#{inputDir}] #{usage}" )
end
configFiles.each do |file|
    unless File.exists?( file )
        die( "The following files does not exist: [#{file}] #{usage}" )
    end
end

## Remove the output directory if it exists.
if File.directory?( outputDir )
    FileUtils.rm_r( outputDir, {:force => true, :secure => true} )
end

## Read in the config files.
variableHash = {}
configFiles.each do |file|
    variableHash = mergeHashes( variableHash, readConfigFile( file ) )
end


## Copy the input directory to the output directory.
FileUtils.cp_r( inputDir, outputDir )

## Read in any of the files that have variable values.
if variableHash.has_key? "files"
    variableHash["files"].each do |key,filename|
        if File.exists?( filename )
            variableHash[key] = IO.read(filename, {"open_args"=>"r:utf-8"})
        else
            STDERR.puts "Cannot find #{filename} (for variable files => #{key})"
        end
    end
end

variableHash.delete("files")

## Replace each of the variables.
searchAndReplaceInHash(variableHash)

files_a = []
Dir.glob( "#{outputDir}/**/*" ).each do |f|
    if File.file?(f)
        searchAndReplaceInFile( f, variableHash ) 
    end
end


