/**
 * @fileOverview Provides a set of functions for STI, or search task 
 * identification. 
 *
 * <p><i>
 * Copyright ( c ) 2010-2013      <br>
 * University of Massachusetts  <br>
 * All Rights Reserved
 * </i></p>
 * 
 * @author hfeild
 */


RemoteModule.prototype.SearchTaskAssistant.prototype.SearchTaskIdentifier = 
        function( sta ){
    'use strict';

    // Private variables.
    var that = this,
        CHAR_NGRAM_SIZE     = 3,
        SAME_TASK_THRESHOLD = 0.25, // 1-eta
        RELATED_THRESHOLD   = 0.10,
        TASK_FACTOR         = 20,
        QUERY_FACTOR        = 20,
        T                   = 2,
        curClassifier       = 1,
        classifiers         = [];

    // Private functions declarations.

    // Public function declarations.
    this.extractFeatures; this.extractNormalizedDistances; 
    this.extractDistritizedFeatures; this.classify; this.discritizeJaccardCoef;
    this.getJaccardCoef; this.getTermSet; this.discritizeOverlappingCharNGrams;
    this.getCharNGramsJaccard; this.getOverlappingCharNGrams; 
    this.getCharNGrams; this.discritizeLevenshteinDist; 
    this.getLevenshteinDistance; this.identifyTask;

    // Private function definitions.

    /**
     * Returns the result of a logistic regression that.
     *
     * @param {string} q1    The first query.
     * @param {string} q2    The other query.
     * @return {float} A classification scores betwen 0 (different tasks) and 
     *                  1 (same task).
     */
    classifiers[0] = function( q1, q2 ){
        var features = that.extractDistritizedFeatures( q1, q2 ),
            z = 2.0156 - 1.2243*features.overlap - 0.6781*features.jaccard,
            probNotSame = 1.0 / ( 1.0 + Math.exp( -z ) );
        return 1 - probNotSame;
    };

    /**
     * Returns the average of 3-gram character overlap, Jaccard distance, and
     * Levenshtein distance.
     *
     * @param {string} q1    The first query.
     * @param {string} q2    The other query.
     * @return {float} A classification score between 0 ( different tasks ) and 
     *                 1 ( same task ).
     */
    classifiers[1] = function( q1, q2 ){
        var features = that.extractNormalizedDistances(
            q1.toLowerCase(), q2.toLowerCase() );
        return 1-(features.overlap+features.jaccard+features.levenshtein )/3;
    };

    // Public function definitions.

    /**
     * Extracts features for a pair of queries. Specifically, the Jaccard 
     * coefficient ( jaccard ), 3-gram character Jaccard coefficient ( overlap ), 
     * and Levenshtein distance ( levenshtein ).
     *
     * @param {string} q1    The first query.
     * @param {string} q2    The other query.
     * @return {object} A map of feature names to values.
     */
    this.extractFeatures = function( q1, q2 ){
        return {
            jaccard:     that.getJaccardCoef( q1, q2 ),
            overlap:     that.getOverlappingCharNGrams(q1, q2, CHAR_NGRAM_SIZE),
            levenshtein: that.getLevenshteinDistance( q1,q2 )
        };
    };

    /**
     * Extracts features for a pair of queries. Specifically, the Jaccard 
     * coefficient ( jaccard ), 3-gram character Jaccard coefficient ( overlap ), 
     * and Levenshtein distance ( levenshtein ). These features differ from from
     * those produced by the extractFeatures function in that they are all
     * distances ( e.g., jaccard is 1 - Jaccard coefficient ) and are normalized
     * between 0 and 1.
     *
     * @param {string} q1    The first query.
     * @param {string} q2    The other query.
     * @return {object} A map of feature names to values.
     */
    this.extractNormalizedDistances = function( q1, q2 ){
        return {
            jaccard:     1 - that.getJaccardCoef( q1, q2 ),
            overlap:     1 - that.getCharNGramsJaccard(q1, q2, CHAR_NGRAM_SIZE),
            levenshtein: that.getLevenshteinDistance( q1,q2 )/
                         ( Math.max( q1.length, q2.length ))
        };
    };

    /**
     * Extracts features for a pair of queries. Specifically, the Jaccard 
     * coefficient ( jaccard ), 3-gram character Jaccard coefficient (overlap), 
     * and Levenshtein distance (levenshtein). Here each feature X is binned
     * according to the corresponding 'discritizeX' function.
     *
     * @param {string} q1    The first query.
     * @param {string} q2    The other query.
     * @return {object} A map of feature names to values.
     */
    this.extractDistritizedFeatures = function( q1, q2 ){
        var features = that.extractFeatures( q1,q2 );
        return {
            jaccard:     that.discritizeJaccardCoef( features.jaccard ),
            overlap:     that.discritizeOverlappingCharNGrams(features.overlap), 
            levenshtein: that.discritizeLevenshteinDist( features.levenshtein )
        };
    };

    /**
     * Returns the result of the default that.
     * @param {string} q1    The first query.
     * @param {string} q2    The other query.
     * @return {float} A classification score between 0 (different tasks) and 
     *                 1 (same task).
     */
    this.classify = function( q1, q2 ){
        if( q1 === q2 ){
            return 1.0;
        } 
        return classifiers[curClassifier]( q1,q2 );
    };

    /**
     * Converts a Jaccard coefficient into one of three classes:
     * <ul>
     *      <li>0 -- jaccardCoef &lt; 0.3</li>
     *      <li>1 -- 0.3. &lt;= jaccardCoef &lt; 0.7<li>
     *      <li>2 -- 0.7 &lt;= jaccardCoef</li>
     * </ul>
     * 
     * @param {float} jaccardCoef   The Jaccard coefficient to discritize.
     * @return {int} One of {0, 1, 2}, depending on where the coefficient falls.
     */
    this.discritizeJaccardCoef = function( jaccardCoef ){
        if( jaccardCoef < 0.3 ){ return 0; }
        if( jaccardCoef < 0.7 ){ return 1; }
        return 2;
    };

    /**
     * Calculates the term-based Jaccard's similarity coefficient between
     * two strings. Terms are considered to be space-delimited.
     * 
     * @param {string} s1 A string with one or more terms in it.
     * @param {string} s2 A string with one or more terms in it.
     * @return {float} The Jaccard's similarity coefficient between terms 
     *         extracted from <tt>s1</tt> and <tt>s2</tt>.
     */
    this.getJaccardCoef = function( s1, s2, areSets ) {
        var s1Set = s1, s2Set = s2, sizeOfIntersection = 0.0, 
            sizeOfUnion = 0.0, term;

        if( areSets !== true ){
            s1Set = that.getTermSet( s1 );
            s2Set = that.getTermSet( s2 );
        }
        
        // Get the intersection.
        for( term in s1Set ){
            if( s2Set[term] ){
                sizeOfIntersection += 1.0;
            }
        }   

        // Compute the union.
        sizeOfUnion = ( Object.keys( s1Set ).length - sizeOfIntersection ) +
                      ( Object.keys( s2Set ).length - sizeOfIntersection ) + 
                      sizeOfIntersection;

        // Compute the Jaccard coefficient.
        if( sizeOfUnion > 0 ){ return sizeOfIntersection / sizeOfUnion; }
        return 0.0;
    };

    /**
     * Creates a set of space-delimited terms from a string.
     * 
     * @param {string} str The string from which to extract terms.
     * @return {object} A set of terms extracted from <tt>str</tt>.
     */
    this.getTermSet = function( str ) {
        var termSet = {}, terms = str.split( /\s+/ ), i;

        for( i = 0; i < terms.length; i++ ){
            termSet[terms[i]] = true;
        }
        return termSet;
    };

    /**
     * Converts the number of overlapping n-grams into one of four classes:
     * <ul>
     *      <li>0 -- overlap &lt; 2</li>
     *      <li>1 --  2 &lt;= overlap &lt; 5<li>
     *      <li>2 --  5 &lt;= overlap &lt; 10</li>
     *      <li>3 -- 10 &lt;= overlap</li>
     * </ul>
     * 
     * @param {float} overlap   The character n-gram overlap. 
     * @return {int} One of {0, 1, 2, 3}, depending on where the overlap falls.
     */
    this.discritizeOverlappingCharNGrams = function( overlap ) {       
        if( overlap < 2 ){ return 0; }
        if( overlap < 5 ){ return 1; }
        if( overlap < 10 ){return 2; }
        return 3;
    };
    
    /**
     * Splits the given strings into n-character grams and then calculates
     * the Jaccard Coefficient over the sets.
     *
     * @param {string} s1 The first string.
     * @param {string} s2 The second string.
     * @param {int} n     The size of the character sequences to use.
     * @return {float} The Jaccard coefficient of sets of n-character-grams
     *                 between the two strings.
     */
    this.getCharNGramsJaccard = function( s1,s2,n ){
        var s1Grams = that.getCharNGrams( s1, n ),
            s2Grams = that.getCharNGrams( s2, n );   
        return that.getJaccardCoef( s1Grams, s2Grams,true );
    };

    /**
     * Calculates the overlap between character n-grams extracted from the two 
     * given strings. If grams occur more than once in either string, that
     * particular gram will be counted as the minimum number of occurrences
     * in either string towards the overall overlap total.
     * 
     * @param {string} s1 First string.
     * @param {string} s2 Second string.
     * @param {int} n     The size of the grams to extract from <tt>s1</tt> and 
     *                    <tt>s2</tt>.
     * @return {int} The number of n-grams that overlap.
     */
    this.getOverlappingCharNGrams = function( s1, s2, n ){
        var s1Grams = that.getCharNGrams( s1, n ),
            s2Grams = that.getCharNGrams( s2, n ),
            overlap = 0,
            ngram;

        for( ngram in s1Grams ){
            if( s2Grams[ngram] !== undefined ){
                overlap += Math.min( s1Grams[ngram], s2Grams[ngram] );
            }
        }
        return overlap;
    };


    /**
     * Extracts all n-grams from the given string and returns them in a map
     * along with their frequencies. E.g.,
     * 
     * <ul>
     *      cold beer
     * </ul>
     * 
     * becomes
     * 
     * <ul><pre>
     *      'col' -> 1
     *      'old' -> 1
     *      'ld ' -> 1
     *      'd b' -> 1
     *      ' be' -> 1
     *      'bee' -> 1
     *      'eer' -> 1
     * </pre></ul>
     * 
     * @param {string} str  The string from which to extract the n-grams.
     * @param {int} n       The size of the grams.
     * @return {object} A map of all n-grams in str and their frequencies.
     */
    this.getCharNGrams = function( str, n ){
        // Will hold each distinct n-gram and its frequency.
        var ngrams = {},
            // Our n-grams are going to snake around this one array.
            curGram = [],
            curGramIndex = 0,
            i, j, k, ngram;
        
        for( i = 0; i < str.length; i++ ){
            // Add the current character.
            curGram[curGramIndex] = str[i];

            // If enough characters have accumulated to make an n-gram,
            // emit the current one.
            if( i >= n-1 ){
                ngram = '';

                for( j = 0; j < n; j++ ){
                    // Get the index of the character to extract.
                    k = ( curGramIndex - j ) % n;
                    if( k < 0 ){
                        k = n + k;
                    }
                    ngram += curGram[k];
                }

                // Store the ngram in the map.
                if( !ngrams[ngram] ){
                    ngrams[ngram] = 0;
                }
                ngrams[ngram] += 1;
            }

            // Update the index.
            curGramIndex = ( curGramIndex + 1 ) % n;
        }
        
        return ngrams;
    };

    /**
     * Converts the Levenshtein distance for the two given strings
     * into one of three classes:
     * <ul>
     *      <li>0 -- levenshteinDist &lt; 0.3</li>
     *      <li>1 -- 0.3. &lt;= levenshteinDist &lt; 0.7<li>
     *      <li>2 -- 0.7 &lt;= levenshteinDist</li>
     * </ul>
     * 
     * @param {string} levenshtein   The Levenshtein distance to convert. 
     * @return {int} One of {0, 1, 2}, depending on where the distance falls.
     */
    this.discritizeLevenshteinDist = function( levenshtein )
    {
        if( levenshtein < 2 ){ return 0; }
        if( levenshtein < 5 ){ return 1; }
        if( levenshtein < 10 ){ return 2; }
        return 3;
    };

    /**
     * Computes the Levenshtein distance between two strings.
     * Based on: http://www.merriampark.com/ld.htm#JAVA
     *
     * @param {string} s The first string.
     * @param {string} t The second string.
     * @return {float} The Levenshtein distance bewtween the two.
     */
    this.getLevenshteinDistance = function( s, t ){
        var d, n, m, i, j, sI, tJ, cost, initMatrix;

        initMatrix = function( rows, columns ){
            var matrix = [], i, j;
            for( i = 0; i < rows; i++ ){
                matrix[i] = [];
                for( j = 0; j < columns; j++ ){
                    matrix[i][j] = 0;
                }
            }
            return matrix;
        };

        // Step 1.
        n = s.length; m = t.length;

        if( n === 0 ){ return m; }
        if( m === 0 ){ return n; }
        d = initMatrix( n+1, m+1 );

        // Step 2.
        for( i = 0; i <= n; i++ ){ d[i][0] = i; }
        for( j = 0; j <= m; j++ ){ d[0][j] = j; }

        // Step 3.
        for( i = 1; i <= n; i++ ){
            sI = s[i-1];
            
            // Step 4.
            for( j = 1; j <= m; j++ ){
                tJ = t[j-1];
            
                // Step 5.
                cost =  sI === tJ ? 0 : 1;

                // Step 6.
                d[i][j] = Math.min( d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+cost);
            }
        }

        // Step 7.
        return d[n][m];
    };

    /**
     * Identifies all of the tasks that a search is part of, if any.
     *
     * @param {Search} The search for which tasks are identified.
     * @param {object} A map of task ids to Task objects.
     * @param {object} A map of search ids to Search objects.
     * @param {function} A function to invoke after all related tasks have been 
     *                   identified. It should take an array of task ids.
     */
    this.identifyTask = function( search, tasks, searches, callback ){
        var relatedTasks = [], i, query = search.getText(), taskId;

        for( taskId in tasks ){
            var searchIds = tasks[taskId].getSearchIds(), score;

            // Check if any of the searches in the current task as classified as
            // belonging in the same task as the target search.
            for( i = 0; i < searchIds.length; i++ ){        
                score = that.classify( 
                    query, searches[searchIds[i]].getText() );
                // We found a match, so there's no use looking at the rest of
                // this task's searches.
                if( score >= SAME_TASK_THRESHOLD ){
                    relatedTasks.push( taskId );
                    break;
                }
            }
        }

        setTimeout( function(){callback( relatedTasks );}, T ); 
    };

    /**
     * Calculates the similarity between the given search and every search in the
     * given search lookup map.
     * 
     * @param {Search} search The search to rank other searches by.
     * @param {map[String,Search]} searches A map of string ids to Searches.
     * @param {function} callback A function to invoke upon completion. Should 
     *                            expect one parameters: an array of [Search,
     *                            classification score] pairs in non-decreasing
     *                            order (note that means the mostly likely same-task
     *                            searches are at the _end_ of the array).
     */
    this.rankSearchesBySameTaskness = function( search, searches, callback ){
        var relatedSearches = [], j, text = search.getText(), curSearch, entry,
            searchId;

        for( searchId in searches ){
            if( searchId === search.getId() ){ continue; }

            curSearch = searches[searchId];

            entry = [curSearch, that.classify(text, curSearch.getText())];

            sta.util.orderedInsert(
                relatedSearches, entry, sta.util.keyValueCompare(1) );
        }

        setTimeout(function(){ callback(relatedSearches); }, T);
    };

    /**
     * Calculates the similarity between the given search and every search in the
     * given search lookup map.
     * 
     * @param {Search} search The search to rank other searches by.
     * @param {Array[Array[Search,Number]]} relatedSearches an array of [Search,
     *                            classification score] pairs in non-decreasing
     *                            order of score.
     * @param {map[String,Task]} tasks A map of task ids to Tasks.
     * @param {function} callback A function to invoke upon completion. Should 
     *                            expect one parameters: an array of [Task,
     *                            classification score] pairs in non-decreasing
     *                            order (note that means the mostly likely tasks
     *                            are at the _end_ of the array).
     */
    this.rankTasksBySameTaskness = function(
            search, relatedSearches, tasks, callback ){

        var relatedTasks = [], seenTasks = {}, i, taskId;

        for( i = relatedSearches.length-1; i >= 0; i-- ){
            taskId = relatedSearches[i][0].getTaskId();

            if( !seenTasks[taskId] ){
                relatedTasks.unshift( [tasks[taskId], relatedSearches[i][1]] );
                seenTasks[taskId] = true;
            }
        }
       
        if(callback){ setTimeout(function(){ callback(relatedTasks); }, T ); }

    };

};