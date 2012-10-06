README
crowdlogger/
Created: 27-Oct-2011 by Henry Feild

CONTENTS:

    1. Overview
    2. Key directories for Firefox and Chrome extensions
    3. Web server directories
    4. Java server/client directories

1.OVERVIEW

CrowdLogger is a tool that logs user search behavior and then uploads that data
privately to a server. The idea is that we want to aggregate data over all the
users, but not at the cost of compromising privacy. In its current incarnation,
CrowdLogger has been in use since the Spring of 2011 as part of a user study at
the University of Massacusetts Amherst. See http://crowdlogger.org for details.

At this stage of development, CrowdLogger has three distinct components that
interact with each other:

    - Firefox and Chrome extension code (javascript/html/xul)
    - Web server code (html/php) -- this is where the extension pull updates,
        notification, and instructions.
    - Experiment server code (Java) -- this is where the results for searc log
        mining experiments are uploaded.

At some point, we will likely merge the later two to consolidate the code.
To begin with, this is the current directory structure:

    config/
        Contains the default configuration. You can add a file called
        'override.conf' to this directory to override anything.

    README
        This file.

    scripts/
        Scripts to configure the projects and build extensions.

    setup/
        Contains a step-by-step guide to getting setup up and a database
        creation script.

    unconfigured/
        Home to the directories described later in this document. These
        contain the various parts of the project, but with place holders
        for various configuration variables.



To get started, take a look at the directory listings below. Then check out:

    crowdlogger/setup/SETUP.txt

That is a step-by-step concerning how to get started.
    


2. KEY DIRECTORIES FOR FIREFOX AND CHROME EXTENSIONS:


    extension-code-base/
        Contains all of the JavaScript, HTML, XUL, CSS, images, and
        documentation for the Firefox and Chrome extensions. 

    chrome-extension/
        Contains the install manifest and other files required for a Chrome
        extension.  This does not contain javascript or html files.

    firefox-extension/
        Contains the install manifest and other files required for a Firefox
        extension.  This does not contain javascript or html files.

       


3. WEB SERVER DIRECTORIES 

    web/
        Contains the web pages and scripts that shown on the server.



4. JAVA SERVER/CLIENT DIRECTORIES
    
    server-web-app/
        Contains a Java web-application, which can be used in conjunction with
        a Java web server, such as Tomcat. It includes the anonymizers, the
        server (a servlet that writes data to a file), and the processing
        programs (which will decrypt data). 





