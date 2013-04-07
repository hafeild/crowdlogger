/**
 * @fileOverview Provides some simple utilities. 
 *
 * <p><i>
 * Copyright (c) 2010-2013      <br>
 * University of Massachusetts  <br>
 * All Rights Reserved
 * </i></p>
 * 
 * @author hfeild
 */

RemoteModule.prototype.SearchTaskAssistant.prototype.Util = function(sta) {
    'use strict';

    var that = this;

    // Public functions.
    this.binarySearch; this.orderedInsert; this.truncateUrl; this.areSameDay;
    this.arrayToObject; this.formatSearchUrl; this.copy; this.foreach; 
    this.select; this.intCompare, this.keyValueCompare;

    /**
     * Performs a binary search over the given array. The comp_func is used to 
     * compare the the current element in the array with the item. 
     *
     * Based on http://jsfromhell.com/array/search [rev. #2] by 
     * Carlos R. L. Rodrigues
     *
     * @param {array} array   An array of anything.
     * @param {anything} item The item being searched for.
     * @param {function} compFunc A comparison function. Should take two items 
     *    of the types given (the first arg will be from the array, the second 
     *    will be the item to find) and return -1, 0, or 1 if the first arg is 
     *    less than, equal to, or greater than the second arg.
     * @param {boolean} insert Optional. If true and the item is not found, the
     *    index where it should be inserted is returned.
     * @return The index of the item. If not found, -1, unless insert is true,
     *         at which point the index where the item would be is returned.
     */
    this.binarySearch = function( array, item, compFunc, insert ){
        if( array.length === 0 ){
            return insert ? 0 : -1;
        }

        var high = array.length, low = -1, middle;
        while( high - low > 1 ){
            middle = high+low >> 1;
            // sta.log('[util.js] middle: '+ middle);
            if( compFunc( array[middle], item ) < 0 ){
                low = middle;
            } else {
                high = middle;
            }
        }

        if( high >= array.length || compFunc(array[high], item) !== 0 ){
            return insert ? high : -1;
        }
        return high;
    };

    /**
     * Inserts an item into an ordered
     *
     * @param {array} array   An array of anything.
     * @param {anything} item The item being searched for.
     * @param {function} compFunc A comparison function. Should take two items 
     *    of the types given (the first arg will be from the array, the second 
     *    will be the item to find) and return -1, 0, or 1 if the first arg is 
     *    less than, equal to, or greater than the second arg.
     * @return A pointer to the array.
     */
    this.orderedInsert = function( array, item, compFunc ){
        return array.splice(that.binarySearch(array,item,compFunc,true),0,item);
    };

    /**
     * Truncates a URL down to the domain, including the http{s} at the beginning.
     * 
     * @param  {string} url The URL to truncate.
     * @return {string} A truncated URL.
     */
    this.truncateUrl = function(url){
        return url.replace(/(https{0,1}:\/\/[^\/]*)\/.*$/, '$1');
    };    

    /**
     * Tests whether two timestamps are from the same day (in terms of UTC 
     * date).
     * 
     * @param {timestamp} t1 The first timestamp; needs to be parsable by Date.
     * @param {timestamp} t2 The second timestamp; needs to be parsable by Date.
     * @return {boolean} True if t1 and t2 are from the same UTC day.
     */
    this.areSameDay = function(t1, t2){
        return( new Date(t1).toDateString() === new Date(t2).toDateString() );
    };

    /**
     * Converts an array into an object where each element is set to 'true'.
     * 
     * @param  {array} array An array of anything.
     * @return {object} An object where each element of the given array is a key.
     */
    this.arrayToObject = function(array){
        var object = {}, i;
        for(i = 0; i < array.length; i++){
            object[array[i]] = true;
        }
        return object;
    };

    /**
     * Formats a query into a URL for the corresponding search engine. Currently
     * only supports Google.
     * 
     * @param  {string} se    Search engine.
     * @param  {string} query The query string.
     * @return {string} The search URL for the given query and search engine.
     */
    this.formatSearchUrl = function(se, query){
        if( se.match(/google/) ){
            return 'https://www.google.com/search?q='+ encodeURI(query);
        } 
        if( se.match(/yahoo/) ){
            return 'http://search.yahoo.com/search?p='+ encodeURI(query);
        } 
        if( se.match(/bing/) ){
            return 'http://www.bing.com/search?q=' + encodeURI(query);
        } 
        return null;
    };

    /**
     * Returns a copy of the given array.
     * 
     * @param  {array} array The array to copy.
     * @return {array} A duplicate of the given array.
     */
    this.copy = function(array){
        var copy = [], i;
        for(i = 0; i < array.length; i++){
            copy.push( array[i] );
        }
        return copy;
    };

    /**
     * Applies the function fn to each element in the array.
     * 
     * @param  {array}    array   An array.
     * @param  {function} fn      A function which takes an index and the 
     *                            element at array[index].
     * @param  {boolean}  reverse If true, the array will be traversed in 
     *                            reverse order.
     */
    this.foreach = function(array, fn, reverse){
        var i;
        if( reverse === true ){ 
            for(i = array.length-1; i >= 0; i-- ){ fn(i, array[i]); }
        } else {
            for(i = 0; i < array.length; i++ ){ fn(i, array[i]); }
        }
    };

    /**
     * Selects a subset of the given array.
     * 
     * @param  {array} array           An array of anything.
     * @param  {function} selectFunc  A function that takes an element of the 
     *      given array and returns 'true' if the element should be selected.
     * @return {array} An array of the selected elements of the given array.
     */
    this.select = function(array, selectFunc){
        var result = [];
        that.foreach(array, function(i,entry){
            if( selectFunc(entry) ) {
                result.push(entry);
            }
        });
        return result;
    };

    /**
     * A comparison of two ints. Returns <0, 0, or >0 if x is less than, equal
     * to, or greater than y, respectively.
     *
     * @param {int} x The first number.
     * @param {int} y The second number.
     * @return < 0, 0, or > 0 if x is less than, equal to, or greater than y, 
     *     respectively.
     */
    this.intCompare = function(x, y){
        return x - y;
    };

    /**
     * Creates a comparison function that compares the value of the associated
     * with the specified key in the given objects. The comparison function
     * returns <0, 0, or >0 if x is less than, equal to, or greater than y, 
     * respectively.
     *
     * @param {array} x An array formatted [key, int value].
     * @param {array} y An array formatted [key, int value].
     * @return <0, 0, or >0 if x[1] is less than, equal to, or greater than 
     *     y[1], respectively.
     */
    this.keyValueCompare = function(key){
        return function(x, y){
            try{
                return x[key] - y[key];
            } catch(err){
                return -1;
            } 
        };
    };

    /**
     * Gets the URL of the favicon associated with the given page URL. The URL
     * of the default favicon will be returned if no favicon is found. The
     * generated URL is a browser resource and can only access cached favicons.
     *
     * @param {string} url  The URL of the page to get the favicon for.
     * @param {boolean} shorten  Default: true; uses just the domain of the URL.
     * @return The URL of the favicon associated with the given URL.
     */
    this.getFaviconURL = function(url, shorten){
        var match;
        shorten = shorten === undefined || shorten;

        if( shorten ){
            match = url.match('[^/]*/[^/]*/[^/]*');
            url = match ? match[0] : url;
        }
        return 'http://g.etfv.co/'+ url;
    };




};