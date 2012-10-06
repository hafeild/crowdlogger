<?php

#error_reporting(E_ALL);
#ini_set('display_errors', '1');

require( '../include/db.php' );

$referred_by_hash;
$referal_lookup;
$participated;
$opt_out;

$hat = array();

$wins;

if( count( $argv ) < 2 )
{
    print <<<EOT
Usage: draw.php <job1-id> [<job2-id>...]

Purpose: Given one or more job (err..or 'experiment') identifiers, this script 
will randomly select a user who participated in those jobs. This script takes
into account referals.
EOT;
    exit;
} 

$listOfJobs;

$prog = array_shift( $argv );

foreach ($argv as $jobid)
{
    print "Job: $jobid\n";
    $listOfJobs[$jobid] = 1;
}

// Connect to mysql.
if( !($connection = @ mysql_connect( $myHost, $myUser, $myPW ) ) )
   die( "Could not connect to mysql." );
// Connect to database.
if( !mysql_select_db( $myDB, $connection ) )
   die( "Could not connect to database." );


$query = "select reg_id, experiments, referred_by, referal_id, opt_out_of_payment from $myInfoTab";
// Run the query.
$result = @ mysql_query( $query, $connection );

// Translate the output to an array.
while( $row =  mysql_fetch_array( $result ) )
{
//    print $row['reg_id'] . ": " . $row['experiments'] . "\n";
    
    if( participated( $row['experiments'], $listOfJobs ) )
    {
        $participated[$row['reg_id']] = 1;

        if( $row['opt_out_of_payment'] == "true" )
        {
            $opt_out[$row['reg_id']] = 1;
        }
    }

    if( $row['referred_by'] != "NULL" )
        $referred_by_hash[$row['reg_id']] = $row['referred_by'];
    if( $row['referal_id'] != "NULL" )
        $referal_lookup[$row['referal_id']] = $row['reg_id'];
}


foreach ($participated as $reg_id => $value)
{
    if( !isset( $opt_out[$reg_id] ) )
        for( $i = 0; $i < 4; $i++ )
            array_push( $hat, $reg_id );

    if( isset( $referal_lookup[$reg_id] ) )
    {
        $referrer = $referal_lookup[$reg_id];
        if( isset($participated[$referrer]) && !isset($otp_out[$referrer]) )
            for( $i = 0; $i < 2; $i++ )
                array_push( $hat, $referrer );

        if( isset( $referal_lookup[$referrer] ) )
        {
            $referrerReferrer = $referal_lookup[$referrer];
            if( isset($participated[$referrerReferer]) && 
                !isset($otp_out[$referrerReferrer]) )
                    array_push( $hat, $referrerReferrer );

        }
    }
}

/*
for( $j = 0; $j < 10000; $j++ )
{
    $winner = shuffleAndChooseWinner( $hat );

    if( !isset( $wins[$winner] ) )
        $wins[$winner] = 0;

    $wins[$winner]++;
}


foreach ($wins as $reg_id => $winCount)
{
    print "$reg_id\t$winCount\n";
}
*/

print "Those who completed the job:\n\t" . implode( "\n\t", array_keys($participated)) . "\n";
print "Those who opted out:\n\t" . implode( "\n\t", array_keys($opt_out)) . "\n";
print "\n";
print "Winner: \n\t" . shuffleAndChooseWinner( $hat ) . "\n";


function shuffleAndChooseWinner( $hat )
{

    for( $i = 0; $i < 10000; $i++ )
    {
        shuffle( $hat );
    }

//    print "\n\t" . implode( "\n\t\t", $hat ) . "\n\n";

    $index = rand(0, count($hat)-1);
    
    return $hat[$index];
}




function participated( $experiments, $validJobs )
{
    $jobs = preg_split( '/\s+/', $experiments );
    foreach ($jobs as $jobid)
        if( isset( $validJobs[$jobid] ) )
            return true;    

    return false;
}

?>
