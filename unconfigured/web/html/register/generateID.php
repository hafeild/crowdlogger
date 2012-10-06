<?php

// Provides a function to generate a new id that is not present in the given database/table.

/**
 * Generates a random ID that is not currently present in the given database
 * and table. The ID will be added to the given table before returning.
 *
 * @param host		The MySQL host.
 * @param user		The MySQL user.
 * @param pass		The MySQL password.
 * @param database	The database.
 * @param table		The table.
 * @param key		The name of the primary ID key in the table.
 *
 * @return A random ID.
 */
function generateRandomID( $host, $user, $pass, $database, $table, $key )
{
    
    $username = "";
    $isValidUsername = false;
    
    
    // Connect to mysql.
    if( !($connection = @ mysql_connect( $host, $user, $pass ) ) )
       die( "Could not connect to mysql." );
    // Connect to database.
    if( !mysql_select_db( $database, $connection ) )
       die( "Could not connect to database." );
    
    // Lock the table table.
    $query = "LOCK TABLES $table WRITE";
    if( !(@ mysql_query( $query, $connection) ) )
       die( "Couldn't lock." );
    
    // Generate a new user id (making sure it's not already in the db).
    do {
       // Generate a random username.
       $username = md5(uniqid("",true));
    
       // Check if this username is already taken.
       $query = "select * from {$table} where $key = \"{$username}\"";
    
       // Run the query.
       $result = @ mysql_query( $query, $connection );
    
       // Translate the output to an array.
       $row =  @ mysql_fetch_array( $result );
    
       // If the row array is null, then we know the username hasn't been used
       // yet.
       $isValidUsername =  ($row == null);
    
    
    } while( !$isValidUsername );
    
    
    // Insert the name into the database.
    $query = "insert into $table set $key = '{$username}'";
    if( !(@ mysql_query( $query, $connection ) ) ) {
      //print "Error inserting into table.";
      return "false";
    }
    
    // Unlock the table.
    $query = "UNLOCK TABLES";
    if( !(@ mysql_query( $query, $connection ) ) )
       die( "Couldn't unlock." );
  
    return $username; 
}
 
?>
