#!/usr/bin/ruby

#######################################################################
## File:    crowdlog2html.rb
## Date:    24-Jul-2011
usage = "
Usage: crowdlog2html.rb <crowdlog> [<crowdlog 2> ... ]

<crowdlog> should be a valid CrowdLog file, which means it has one
JSON object per line. Each JSON object is either the summary of
a decrypted or undecrptable artifact. Each has a separate set of
assumed properties, listed below:

Decrypted artifacts:

    number_of_distinct_parts
    total_instances
    secondary_private_fields
    primary_private_field
    experiment_id

Undecryptable artifacts:

    support
    instances
    distinct

From this data, a summary in HTML is printed out. If more than one
CrowdLog file is present, they are each put in a separate section of 
the HTML.

HTML is sent to stdout.

"
#######################################################################

require 'json'

## Generates the header of the HTML file. This includes a link to the 
## section of each file.
def generateHeader( files )
    output = "<html><body><h1>CrowdLogs for...:</h1><ul>"
    files.each do |file|
        output += "<li><a href='##{file}'>#{file}</a></li>"
    end
    output += "</ul>"
    return output
end

## Generates the footer of an html file.
def generateFooter
    return "</body></html>"
end

## Determines if an artifact is decrypted or not.
def isDecrypted( artifact )
    ## There are several fields that a decrypted artifact
    ## will have; this is only one of them.
    if artifact.has_key?( "secondary_private_fields" )
        return true
    end
    return false
end

## Creates the html section for the given CrowdLog file. 
def file2htmlSection( file )
    name = ""
    if file =~ /queryPair/
        name = "Query Pairs"
    elsif file =~ /queryClick/
        name = "Query Click Pairs"
    elsif file =~ /query/
        name = "Queries"
    end

    
    
    section = "<div class='crowdlog' style='margin: 2px; padding: 10px; border: 1px gray solid'><h2><a name='#{file}'></a>#{name}</h2>File: #{file}<p>"
    decrypted = []
    undecrypted = []
    fd = File.open( file, "r" )
    while line = fd.gets
        artifact = JSON.parse( line )
        if isDecrypted( artifact )
            decrypted << artifact
        else
            undecrypted << artifact
        end
    end
    fd.close

    ## Generate the HTML for all of the decrypted data --
    ## show the artifacts with the highest frequencies first.
    section += "<h3>Decrypted data</h3>\n"
    section += "<table border=1><tr><th>Distinct users</th><th>Total instances</th><th>Normalized form</th><th>Number of variations</th></tr>\n"
    decrypted.sort{ |x,y| 
             if y['number_of_distinct_parts'] == x['number_of_distinct_parts'] 
                y['total_instances'] <=> x['total_instances']
             else
                y['number_of_distinct_parts'] <=> x['number_of_distinct_parts'] 
             end
            }.each do |a|

        primaryFieldParts = a['primary_private_field'].split( "\t" )
        primaryFieldText  = primaryFieldParts.join(" &rarr; ")
    
        
        section += "<tr><td>#{a['number_of_distinct_parts']}</td>" +
                   "<td>#{a['total_instances']}</td>" +
                   "<td>#{primaryFieldText}</td>" +
                   "<td>#{a['secondary_private_fields'].keys.size}</td></tr>\n"
        
    end
    section += "</table>\n\n"

    ## Generate the HTML for all of the encrypted data --
    ## show the artifacts with the highest support first.
    section += "<h3>Summary of undecryptable data</h3>\n"
    section += "<table border=1><tr><th>Distinct users</th><th>Ditinct instances</th><th>Total instances</th></tr>\n"
    undecrypted.sort{ |x,y| y['support'] <=> x['support'] }.each do |a|
        section += "<tr><td>#{a['support']}</td><td>#{a['distinct']}</td><td>#{a['instances']}</td></tr>\n"
    end
    section += "</table>\n" 

    section += "</div>\n\n"
    return section
end



## Read in the command line args.
if ARGV.size < 1
    STDERR.puts usage
    exit
end

## Seems funny to have this now...but just in case we ever change our
## arguments to include non-files...
files = ARGV

output = generateHeader( files )

files.each do |file|
    output += file2htmlSection( file ) + "<p>\n"
end

output += generateFooter()

puts output

