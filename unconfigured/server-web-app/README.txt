README for the CrowdLogger Web and Anonymization Server
Created: 14-May-2011
Contact: Henry Feild

This directory contains a Java web application, or Java web app. The directories are as follows:


    WebContent/
        META-INF/
            Ignore this directory.

        css/
            Contains style sheets for the server. Currently unused.

        WEB-INF/
            Contains the bulk of the server files. Hash the following files
            and folders:

            classes/
                When build.xml is run using ant, this will contain the class
                files for all of the classes present in the main level src/
                directory.

            lib/
                Should contain any libraries that are necessary for compilation
                AND should be included in the resulting WAR file.

            web.xml
                This is the server manifest file and defines what Java classes
                will handle what incoming traffic. Think of this as a map 
                between local URLs and Java classes.

        runAnonymizerTest.jsp
            This is a Java Server Page and is used for testing. It should be
            removed or hidden...
        

    build.xml  
        The ant build file. When executed (by calling 'ant' on the command
        line), this will compile the src and package the web app (which consists
        of the WebContent directory). It also produces a JAR file with just the
        class files created from the src/ directory. Two files are produced:
            crowdlogger.war -- use for web app.
            crowdlogger.jar -- use as a library for post-processing.

    lib/
        Contains jar files that are need for compilation but that do not need
        to be included in the WAR file. For instance, Java servlet libraries 
        do not need to be included in the WAR file because Tomcat (the Java web
        application server) supplies them at run time. Libraries that should
        be include in the WAR file should go in WebContent/WEB_INF/lib.

    src/
        Contains all of the source files for the servers. The primary packages
        are (however, there are others):

            edu.umass.ciir.crowdlogger.anonymizer
            edu.umass.ciir.crowdlogger.server


  POST-BUILD FILES:

    bin/
        Created during compilation if you use Eclipes, for example.

    crowdlogger.jar
        The Java ARchive file for the project. This only contains the class files
        associated with the src/ directory. Use this for post-processing the
        ee-artifact files.

    crowdlogger.war  
        The Web App aRchive for the project. This is produced when the build.xml
        file is executed by means of 'ant':

        %> ant


RUNNING THE WEB APP

    First, you need Tomcat or something equivalent installed. The rest of this
    document assumes Tomcat. With in the unpacked Tomcat directory, there will
    be a directory called webapps/. By default, if you place a .war file in
    that directory, the server will automatically unpack and install it.

    For this web app, if you install it on the machine myserver.com, you
    would go to:

        http://myserver.com:8080/crowdlogger/<page>

    where <page> is the local url you would like to visit. One such page is
    "deposit", which will invoke the edu.umass.ciir.crowdlogger.anonymizer.
    EArtifactDepot class.

    To start Tomcat, navigate to its install directory and run:

        bin/startup.sh

    Copy the WAR file crowdlogger.war to the Tomcat webapp/ directory.  Wait a
    few seconds and you should be able to access the web app as outlined above. 
