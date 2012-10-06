<HTML>
<BODY>
<%
    // This is a scriptlet.  Notice that the "date"
    // variable we declare here is available in the
    // embedded expression later on.
    System.out.println( "Evaluating date now" );
    java.util.Date date = new java.util.Date();
    
    int clients = 2000;
    int bundlesPerClient = 5;
    int bundleSize = 50;
    int eartifactLength = 1;
    
    edu.umass.ciir.scamp.AnonymizerTest1 test = 
        new edu.umass.ciir.scamp.AnonymizerTest1( 
            clients, bundlesPerClient, bundleSize, eartifactLength );
    test.runTest();
%>
Hello!  The time is now <%= date %>
</BODY>
</HTML>