#!/usr/bin/ruby

################################################################################
## File:    configure.rb
## Author:  Henry Feild
## Date:    27-Oct-2011
usage = "
Usage:  configure.rb [options]

Copies the contents of the given input directory and replaces the variable names
specified in the configuration directory files (default.conf and, optionally,
override.conf) with their values. These are writing to the output directory.
See below for options. NOTE: this will delete the output directory first.

Options: 
    -h
        Show this message.

    -i=<input>
        Uses <input> as the input directory. Defaults to 'unconfigured/'.

    -o=<output>
        Uses <output> as the output directory. Defaults to 'configured/'.

    -c=<config dir>
        Uses <config dir> as the configuration directory (which should have a
        file called 'default.conf' and optionally one called 'override.conf').
"
################################################################################ 
require 'json'
require 'fileutils'

INPUT_DIR = "unconfigured"
OUTPUT_DIR = "configured"
CONFIG_DIR = "config"
DEFAULT_CONFIG = "defaults.conf"
OPTIONAL_CONFIG = "override.conf"

################################################################################
## Reads in a configuration file.
##
## @param file  The configuration file to read.
## @return The file contents as a hash map: keys -> values.
##
################################################################################
def readConfigFile( file )
    contents = ""
    fd = File.open( file, "r" )
    while line = fd.gets
        unless line =~ /^\s*$/ or line =~ /^#/
            columns = line.chomp.split(/=/)
            if columns.size > 1
                contents += "\"#{columns[0].gsub(/(^\s*)|(\s*$)/, "")}\" : \"" +
                    "#{columns[1..-1].join("=").gsub(/(^\s*)|(\s*$)/, "").
                        gsub(/"/, "\\\"")}\","
            else
                contents += columns[0]
            end
        end
    end
    return JSON.parse( "{#{contents}}".gsub!(/,\}$/, "}") )
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
if ARGV.size > 0 and ARGV[0] =~ /^-{0,1}-h/
    die( usage )
end

## Defaults...
outputDir = OUTPUT_DIR
inputDir  = INPUT_DIR
configDir = CONFIG_DIR
defaultConfigFile = "#{configDir}#{File::SEPARATOR}#{DEFAULT_CONFIG}"
optionalConfigFile = "#{configDir}#{File::SEPARATOR}#{OPTIONAL_CONFIG}"
variableHash = nil

## Read in the options, if any were provided.
for arg in ARGV
    if arg =~ /^-i=/
        inputDir = arg.gsub( /^-i=/, "" )
    elsif arg =~ /^-o=/
        outputDir = arg.gsub( /^-o=/, "" )
    elsif arg =~ /^-c=/
        configDir = arg.gsub( /^-c=/, "" )
    else
        die( "Invalid option: [#{arg}] #{usage}" )
    end
end

## Check that all the directories exist or do not exist.
for d in [inputDir, configDir]
    unless File.directory?( d )
        die( "The following directory does not exist: [#{d}] #{usage}" )
    end
end

## Remove the output directory if it exists.
if File.directory?( outputDir )
    FileUtils.rm_r( outputDir, {:force => true, :secure => true} )
end

## Read in the config files.
unless File.file?( defaultConfigFile )
    die( "The default config file does not exist: [#{defaultConfigFile}] " +
         usage )
end

variableHash = readConfigFile( defaultConfigFile )
if File.file?( optionalConfigFile )
    variableHash = mergeHashes( variableHash, 
        readConfigFile( optionalConfigFile ) )
end


## Copy the input directory to the output directory.
FileUtils.cp_r( inputDir, outputDir )


## Replace each of the variables.
files = Dir.glob( "#{outputDir}/**/*" ).keep_if{|f| File.file?(f)}.join(" ")
for (k,v) in variableHash
#    puts "ruby -pi -e \"gsub( /%%#{k}%%/, '#{v.gsub(/'/, "\\'")}' )\" #{files}"
    `ruby -pi -e "gsub(/%%#{k}%%/, '#{v.gsub(/'/, "\\'").gsub(/"/, "\\\"")}')" #{files}`
end
