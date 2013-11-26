#!/usr/bin/ruby

################################################################################
## File:    clrm-package.rb
## Author:  Henry Feild
## Date:    19-Feb-2013
Usage = "
Usage:  clrm-package.rb [options]

Where:

    <core module file 1>[, <core module file 2>, ...]
        One or more JavaScript files which together make up the core module.
        They will be concatenated in the order specified. Any argument that
        doesn't start with '--' is considered a core module file.

    --resource-dir=<resource dir>
        OPTIONAL. A directory containing one or more HTML, CSS, or JavaScript
        files. The HTML files are ones you'd like to open at some point and 
        the CSS and JavaScript files are resources you'd like to load in those
        HTML file.

    --metadata-file=<json file>
        REQUIRED. The file should be formatted in JSON and will be placed under
        the 'metadata' field name. This should have the following fields:

        REQUIRED FIELDS:
            clrmid:  {string} 
                The id of the CLRM.
            name:    {string} 
                The display name of the CLRM.
            version: {string} 
                The version -- should consist only of digits and dots.
            categories: {array of strings} 
                The categories in which the CLRM falls. Can be any or all of: 
                'app', 'study'
            description: {string} 
                A long description of the CLRM; this will be displayed to users.
            packageURL: {string} 
                The URL where the CLRM package can be found.
            permissions: {array of strings}
                The APIs this CRLM requires access to. These are:
                    userdata
                    ui
                    storage
                    privacy
                    serveraccess
                    globaldata
            minCLVersion: {string}
                The minimum CrowdLogger version -- should consist of only digits
                and dots.

        OPTIONAL FIELDS:
            logoURL: {string}
                The URL of the logo to display to users. This will be scaled to
                30x30 pixels.

Output:

    A CLRM Package (JSON) to stdout.


Packages a collection of HTML, JavaScript, and CSS files into a CLRM Package.
See http://crowdlogger.org/clrm-api/index.html#implement:auto-packaging for
more information about CLRM Packages. 

Processing occurs as follows: 

  1. A JSON object is formed with the following fields:

      module -- (string) Holds the concatenated core module code.
      html   -- (map) A map of HTML resource names to their content.
      css    -- (map) A map of CSS resource names to their content.
      js     -- (map) A map of JavaScript resource names to their content.

  2. All *.js files in the <core module dir> are concatenated. The resulting 
     string is added under the module entry in the JSON object formed in part 1.

  3. All *.js, *.css, and *.html files located in or under <src dir> are added 
     to the list of resource. 
     ********************************************************************
     ** Only the base name of each resource is considered! That means  **
     ** js/foo.js => foo.js. Name all of your resources accordingly.   **
     ********************************************************************

  4. All *.html files are read in. Their JavaScript and CSS links are added
     to the resource list and are replaced with the following place holder:

         JavaScript:
             ::CLRMJS:name

         CSS:
             ::CLRMCSS:name

     where name is the base name of the resource linked. The HTML, with place
     holders, is then added to


  5. All of the resources are added to their respective maps in the JSON object
     formed in step 1. 

  6. The JSON is spat out (to stdout) in pretty print format.

"
################################################################################ 
require 'net/http'
require 'json'
require 'set'

## A class to assist with verifying metadata and whatnot.
class ParamVerifier
    def initialize(klass, onVerify=Proc.new{|x| true})
        @klass = klass
        @onVerify = onVerify
    end

    def verify(param)
        param.class == @klass && @onVerify.call(param)
    end
end

## The following pertain to metadata.
VALID_PERMISSION_VALS = Set.new([
    :userdata,
    :ui,
    :storage,
    :privacy,
    :serveraccess,
    :servercomputation,
    :servercollection,
    :pagemanipulation,
    :globaldata
])

VALID_CATEGORY_VALS = Set.new([
    :app,
    :study
])

REQUIRED_METADATA_FIELDS = {
    :clrmid     => ParamVerifier.new("".class),
    :name       => ParamVerifier.new("".class),
    :version    => ParamVerifier.new("".class, Proc.new{|v| v=~/^[\d\.]*$/}),
    :categories => ParamVerifier.new([].class, 
        Proc.new{|a| 
            a.select{|e| !VALID_CATEGORY_VALS.member?(e.to_sym)}.size==0}),
    :description=> ParamVerifier.new("".class),
    :packageURL => ParamVerifier.new("".class),
    :permissions=> ParamVerifier.new([].class, 
        Proc.new{|a| 
            a.select{|e| !VALID_PERMISSION_VALS.member?(e.to_sym)}.size==0})
}

OPTIONAL_METADATA_FIELDS = {
    :logoURL    => ParamVerifier.new("".class)
}

## Checks if the given version string is valid, i.e., that it consists of only
## digits and decimals.
## @param version  The version string to check.
## @return True if the version is valid.
def isValidVersionString(version)
    version =~ /^(\d\.)*$/
end

## Extracts the extension as a symbol from the given name.
## @param name     The name from which to extract the extension.
## @return The extension as a symbols, e.g., foo.js => :js
def ext(name)
    File.extname(name).gsub(/^\./,"").to_sym
end

## Verifies that the given resource is present in the package. Spits out
## an error message if the resource is not present.
##
## @param resource     The resource name. Its extension is used to figure out
##                     where it should be located in the package.
## @param clrmPackage  The package in which to look for the resource.
## @return Whether or not the resource is contained in the package.
def verifyResourcePresent(resource, package)
    if !package[ext(resource)].has_key? resource
        STDERR.puts "WARNING: Missing #{resource}. "+
            "Make sure that file is in your resource directory."
        return false
    end
    true
end

## Parses the given HTML file, looking for occurrences of <link href=...css>
## and <script src=...>. The linked files are added to the clrmPackage
##
## @param dir          The resources directory.
## @param clrmPackage  The package to update.
## @return A pointer back to the clrmPackage passed in.
def parseHTML(file, clrmPackage)
    dir = File.dirname(file)
    clrmPackage[:html][File.basename(file)] = (IO.read(file).
        gsub( /<script[^>]*src=['"]([^'"]*\.js)['"][^>]*>[\s\n]*<\/script>/mi){|tag|
            f = $1
            name = File.basename(f)
            downloadWebResource(f, clrmPackage) if f =~ /^https{0,1}:\/\//
            verifyResourcePresent(name, clrmPackage)
            "\n::CLRMJS:#{name}\n"

        }).gsub( /<link[^>]*href=['"]([^'"]*\.css)['"][^>]*\/>/mi){|tag|
            f = $1
            name = File.basename(f)
            downloadWebResource(f, clrmPackage) if f =~ /^https{0,1}:\/\//
            verifyResourcePresent(name, clrmPackage)
            "\n::CLRMCSS:#{name}\n"
        }
    clrmPackage
end

## Downloads and saves a web resource.
##
## @param url          The URL of the web resource.
## @param clrmPackage  The package to update.
## @return A pointer back to the clrmPackage passed in.
def downloadWebResource(url, clrmPackage)
    clrmPackage[ext(url)][File.basename(url)] = NET::HTTP.get(URI(url))
    clrmPackage
end

## Reads all *.js, *.css, and *.html files in and under dir and stores the
## content of each under the :js, :css, or :html keys in the clrmPackage, 
## using the basename of the file.
##
## @param dir          The resources directory.
## @param clrmPackage  The package to update.
## @return A pointer back to the clrmPackage passed in.
def gatherResources(dir, clrmPackage)
    htmlFiles = []
    Dir.glob("#{dir}/*").each do |file|
        if File.directory?(file)
            gatherResources(file, clrmPackage)
        elsif file =~ /\.(js)|(css)$/
            clrmPackage[ext(file)][File.basename(file)] = IO.read(file)
        elsif file =~ /\.html$/
            htmlFiles << file
        end
    end
    htmlFiles.each{|f| parseHTML(f, clrmPackage)}
    clrmPackage
end

## Concatenates all *.js files in dir and stores that string under the :module
## key in clrmPackage.
##
## @param dir          The core modules directory.
## @param clrmPackage  The package to set the :module key in.
## @return A pointer back to the clrmPackage passed in.
def concatenateCoreModules(dir, clrmPackage)
    coreModule = ""
    Dir.glob("#{dir}/*.js").each do |file|
        coreModule += IO.read(file) +"\n"
    end
    clrmPackage[:module] = coreModule
    clrmPackage
end

## Concatenates all *.js files and stores that string under the :module
## key in clrmPackage.
##
## @param dir          The core modules directory.
## @param clrmPackage  The package to set the :module key in.
## @return A pointer back to the clrmPackage passed in.
def concatenateCoreModules(files, clrmPackage)
    coreModule = ""
    files.each do |file|
        coreModule += IO.read(file) +"\n"
    end
    clrmPackage[:module] = coreModule
    clrmPackage
end

## Reads in the Metadata file (assumed to be in JSON format) and then verifies
## that it contains the necessary fields. Only those fields that are verified
## as being required or optional are allowed through. They are then set in the
## metadata field of the CLRM package passed in.
##
## @param filename     The metadata filename.
## @param clrmPackage  The CLRM package.
## @return A pointer back to the clrmPackage passed in.
def readAndVerifyMetadataFile(filename, clrmPackage)
    origMetadata = JSON.parse(IO.read(filename))
    metadata = {}
    origMetadata.each do |key, val|
        key = key.to_sym
        [REQUIRED_METADATA_FIELDS, OPTIONAL_METADATA_FIELDS].each do |test|
            metadata[key] = val if test.has_key?( key ) && test[key].verify(val)
        end
    end
    missingFields = REQUIRED_METADATA_FIELDS.keys.select{|k| 
        !metadata.has_key?(k.to_sym)}

    if missingFields.size > 0
        STDERR.puts "WARNING: your metadata is missing the following fields: "
        STDERR.puts missingFields.join(", ")
    end

    clrmPackage[:metadata] = metadata
    clrmPackage
end

## Check args.
if ARGV.size < 1
    STDERR.puts Usage
    exit
end

# coreModulesDir = ARGV.shift
# resourceDir = ARGV.size > 0 ? ARGV.shift : nil

## The package.
clrmPackage = {
    :module => nil,
    :html => {},
    :js => {},
    :css => {},
    :misc => {}
}

moduleFiles = []

ARGV.each do |arg|
    ## Add resources.
    if arg =~ /^--resource-dir=/
        gatherResources(arg.gsub(/^--resource-dir=/,""), clrmPackage)
    elsif arg =~ /^--metadata-file=/
        readAndVerifyMetadataFile(arg.gsub(/^--metadata-file=/,""), clrmPackage)
    elsif File.exists?(arg)
        moduleFiles << arg
    else
        STDERR.puts "Unrecognized argument: #{arg}"
        exit
    end
end

unless clrmPackage.has_key?(:metadata)
    STDERR.puts "\nWARNING: no metadata was specified.\n\n"
end

## Add in the core module.
concatenateCoreModules(moduleFiles, clrmPackage)

## Serialize the package as JSON.
puts JSON.pretty_generate(clrmPackage)