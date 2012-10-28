/**
 * @fileOverview Provides functions for computing Shamir's Secret Sharing
 * Scheme, interpolating points from a polynomial (used to decode SSSS),
 * encrypting data, and decrypting data (pertaining to running experiments
 * for the CrowdLogger.
 * 
 * See the  CROWDLOGGER.secret_sharing namespace.<p>
 * 
 * %%VERSION%%
 * 
 * @author hfeild
 * @version %%VERSION%%
 */

if( CROWDLOGGER === undefined ){
    var CROWDLOGGER = { not_really_crowdlogger: true };
}

if( CROWDLOGGER.secret_sharing === undefined ){

/**
 * @namespace Provides functions for computing Shamir's Secret Sharing
 * Scheme, interpolating points from a polynomial (used to decode SSSS),
 * encrypting data, and decrypting data (pertaining to running experiments
 * for the CrowdLogger.
 *
 */
CROWDLOGGER.secret_sharing = {
    UNICODE_LENGTH: 5,
    SALT: 'a35e32ec096451c6', // We set this because we don't want it to change
                              // between users.
    AES_BITS: 256,
    aes: new pidCrypt.AES.CBC(),
    BIG_PRIME: new BigInteger("115792089237316195423570985008687907853269984665640564039457584007913129640233", 10 ),
    PUBLIC_KEY: "%%PUBLIC_KEY%%"
};

/**
 * Generates the Shamir's Secret Sharing Scheme shares along with the
 * encrypted data, the encrypted primary data, the encrypted secondary data,
 * and the index of the user's share.
 *
 * @param {string} primary_data The primary key, i.e., a case-normalized query.
 *      The encrypted version of this is what you will be comparing to see
 *      if two encrypted artifacts are identical.
 * @param {string} secondary_data Extra information to include encrypted in
 *      addition (and separate from) the primary data -- they will be shipped
 *      together, but as the secondary data might contain information such
 *      as an un-normalized query, it isn't packed in the cipher for the
 *      the primary data.
 * @param {int} n The number of distinct shares to generate.
 * @param {int} k The degree of the SSSS polynomial, or the minimum number
 *      of distinct shares required to decipher the y-intercept (f(0)) of the
 *      polynomial, i.e., the secret.
 * @param {string} job_salt This is some job-specific string that will be used
 *      to add a bit of extra noise to the encryption (this way the same
 *      user-artifact pair will not generate the same share number across two
 *      jobs).
 * @param {string} passphrase The passphrase of the user. This is used to ensure
 *      that a user using this extension on more than one browser and/or 
 *      computer encrypts the same data the same way for a specific job.
 *
 * @return An object with five fields: 
 *  <ul>
 *      <li>shares: an array of the shares created</li>
 *      <li>user_share_index: the index of the share to give to this user</li>
 *      <li>intercept: the intercept of the SSSS polynomial (this is
 *           the password needed to decrypt the cipher text below).</li>
 *      <li>primary_cipher_text: the encrypted primary data</li>
 *      <li>secondary_cipher_text: the encrypted secondary data</li>
 *  </ul>
 */
CROWDLOGGER.secret_sharing.generate_shares = function( 
        primary_data, secondary_data, n, k, job_salt, experiment_id, passphrase,
        on_completion ){

    var timeout = 80;

    // Encrypt the primary and secondary data. This returns an object with
    // those encryptions plus the password used for the encryption.
    var data = CROWDLOGGER.secret_sharing.encrypt_artifact( 
            primary_data, secondary_data, job_salt );
    setTimeout( function(){    

        // Get a deterministic seed -- based on the primary data and n.
        var seed = new BigInteger( 
                pidCrypt.SHA256( primary_data + n.toString() ), 16 );
    
        // Get the SSSS polynomial.
        var polynomial = CROWDLOGGER.secret_sharing.get_polynomial( 
                data.password, k, seed );
        setTimeout(  function() {
        
            // Calculate the n shares.
            /*var shares = [];
            for( var i = 1; i <= n; i++ ){
                shares[i-1] = [i.toString(),  polynomial( i )];
            }   
            */
            setTimeout( function() {
                // Get the user share.
                var x = CROWDLOGGER.secret_sharing.
                    compute_user_share( passphrase, n, primary_data );
                //B_DEBUG
                //CROWDLOGGER.debug.log( 
                //  "on_completion: " + on_completion + "\n" ); 
                //E_DEBUG

                var y = polynomial( x );
                // Call the callback.
                on_completion( {
                    y:                      y,
                    x:                      x,
                    k:                      k,
                    //password:               data.password,
                    primary_cipher_text:    data.primary_cipher_text,
                    secondary_cipher_text:  data.secondary_cipher_text,
                    experiment_id:          experiment_id
                } );
            }, timeout );
        }, timeout );
    }, timeout );

}; 

/**
 * Creates an encrypted artifact package object, which has two fields:
 * <ul> 
 *      <li>encrypted_data (a CBC-encrypted cipher text)</li>
 *      <li>ssss_share (an array with two elements: [x, f(x)])</li>
 * </ul>
 * Note that the ssss_share array has one of the n shares produced from the
 * k-degree polynomial that was formed to hide the key used to encrypt, and 
 * required to decrypt, the encrypted_data cipher text. If you have k or more 
 * of these pieces for the same encrypted_data value, you can use interpolation
 * to find the y-intercept (i.e., the key).
 *
 * @param {Object} data An object of the type returned by 
 *      CROWDLOGGER.secret_sharing.generate_shares.
 * @param {string} public_key The public key with which to encrypt the package.
 * @param {function} on_completion The function to call when the processing is
 *      complete.
 * 
 * @return An object with two fields: the RSA cipher text (rsa_protected_key)
 *      and the AES cipher text (encrypted_data). The RSA cipher text is the
 *      an encryption of the password needed to decrypt the AES cipher text.
 */
CROWDLOGGER.secret_sharing.encrypt_for_server = function( data, public_key,
        on_completion ){
    var delay = 10;

    // This is the object that is eventually returned. To start with, both
    // fields are blank.
    var rsa_data = {
        rsa_protected_key: undefined,
        encrypted_data: undefined
    };

    // This is the object that is converted to JSON, encrypted, and stored in 
    // rsa_data.encrypted_data.
    /*
    var encrypted_artifact_package = {
        primary_cipher_text:    data.primary_cipher_text,
        secondary_cipher_text:  data.secondary_cipher_text,
        ssss_share:             data.y, //data.shares[data.user_share_index],
        experiment_id:          data.experiment_id
    };
    */

    // Come up with a good key for the AES encryption of the encrypted
    // artifact package.
    var rand_bytes = new Array(3); // 24-bits long.
    (new SecureRandom()).nextBytes( rand_bytes );
    var rand_key = pidCrypt.SHA1( pidCryptUtil.byteArray2String( rand_bytes ) );

    setTimeout( function(){

        // Encrypt the data and store it in our return object.
        rsa_data.encrypted_data =
            CROWDLOGGER.secret_sharing.aes.encryptText( 
                JSON.stringify( data ), 
                rand_key,
                {nBits: CROWDLOGGER.secret_sharing.AES_BITS} );
        
        setTimeout( function(){
    
        
            // Now RSA encrypt the password we came up with (rand_key).
            // Below is adapted from pidCrypt: 
            // https://www.pidder.com/pidcrypt/?page=demo_rsa-encryption
            var key = pidCryptUtil.decodeBase64( public_key );
            //new RSA instance
            var rsa = new pidCrypt.RSA();
            //RSA encryption
            //ASN1 parsing
            var asn = pidCrypt.ASN1.decode(pidCryptUtil.toByteArray(key));
            var tree = asn.toHexTree();
            //setting the public key for encryption
            rsa.setPublicKeyFromASN( tree );
            var t = new Date();  // timer
            var crypted = rsa.encrypt( rand_key );        
            crypted = pidCryptUtil.encodeBase64(pidCryptUtil.convertFromHex(crypted));
        
            // Store it in our return object.
            rsa_data.rsa_protected_key = crypted;
        
            on_completion( rsa_data );

        }, delay );   
 
    }, delay );
    
}; 


/** 
 * Encrypts an artifact (a piece of primary data and a piece of secondary data).
 * The password used to encrypt this data is a large number in the Finite Field
 * GF(p) where p = CROWDLOGGER.secret_sharing.BIG_PRIME. It can be used as the
 * intercept for a SSSS polynomial. The key generated with be the same for
 * every primary_data / job_salt pair, on any computer.
 *
 * @param {string} primary_data The primary data of the artifact (i.e., 
 *      normalized query).
 * @param {string} secondary_data The secondary data of the artifact (i.e.,
 *      un-normalized query).
 *
 * @return An object with three fields:
 * <ul>
 *      <li>password: also the intercept for the SSSS polynomial</li>
 *      <li>primary_cipher_text: cipher text of the primary data</li>
 *      <li>secondary_cipher_text: cipher text of the secondary data</li>
 * </ul>
 */
CROWDLOGGER.secret_sharing.encrypt_artifact = function( 
        primary_data, secondary_data, job_salt ){

    // Generate a password to use to encrypt the data. This needs to be
    // generated deterministically for the same primary data + job_salt.
    // It also needs to be an integer.
    var password = new BigInteger( pidCrypt.SHA1( primary_data + job_salt), 16);

    // Keep it in the finite field of the GF(p^1) (with p = BIG_PRIME).
    password = password.mod( CROWDLOGGER.secret_sharing.BIG_PRIME );

    // The options for the AES algorithm.
    var aes_options = {
        nBits: CROWDLOGGER.secret_sharing.AES_BITS, 
        salt: CROWDLOGGER.secret_sharing.SALT
    };

    // Return:
    //  1. The password (also the intercept for the SSSS polynomial)
    //  2. The cipher text of the primary data
    //  3. The cipher text of the secondary data
    return { 
        password: password.toString(10), 
        primary_cipher_text:  
            CROWDLOGGER.secret_sharing.aes.encryptText( 
                  primary_data, password, aes_options),
        secondary_cipher_text:  
            CROWDLOGGER.secret_sharing.aes.encryptText( 
                  secondary_data, password, aes_options)
    }; 

};


/**
 * Decrypts a given cipher text using the password.
 *
 * @param {string} password The password required to decrypt the cipher text.
 * @param {string} ciper_text The cipher text to decrypt.
 *
 * @param The plain text corresponding to the given cipher text.
 */
CROWDLOGGER.secret_sharing.decrypt_data = function( password, cipher_text ){

    // Options for the AES decryption.
    var aes_options = {
        nBits: CROWDLOGGER.secret_sharing.AES_BITS,
        salt: CROWDLOGGER.secret_sharing.SALT
    };

    // Decrypt and return.
    return CROWDLOGGER.secret_sharing.aes.decryptText( 
        cipher_text, password, aes_options );
};


/**
 * Determines the user's share based on their pass phrase, n and the secret key.
 * 
 * @param {string} passphrase The user's pass phrase -- should be the same 
 *      across all of a user's computers/installs of this extension.
 * @param {int} n The number of distinct shares that are being given out.
 * @param {string} The secret key.
 *
 * @return A number between 0 and n-1 representing which of the n shares the
 *      user should be given.
 */
CROWDLOGGER.secret_sharing.compute_user_share = function( 
        passphrase, n, secret_key ){
    if( secret_key === undefined ){
        secret_key = "";
    }

    var big_int = new BigInteger( 
        pidCrypt.SHA1( secret_key + passphrase ), 16 )
    return parseFloat( big_int.modInt(n).
            toString(10) +"."+ big_int.toString(10).slice(0,2) ); 

};


/**
 * Computes a polynomial of k random coefficients within the finite field of 
 * BIG_PRIME and creates a function that will return f(i) using the constructed
 * polynomial.
 *
 * @param {BigInteger} intercept The intercept of the polynomial.
 * @param {int} k The number of coefficients to calculate.
 * @param {BigInteger} seed The seed to use for the random coefficients.
 *
 * @return A function of the polynomial with parameter i.
 */
CROWDLOGGER.secret_sharing.get_polynomial = function( intercept, k, seed ){
    var coefficients = [new BigNumber(intercept)];
    var random_generator = CROWDLOGGER.secret_sharing.random( seed );

    for( var i = 1; i < k; i++ ){
        coefficients[i] = new BigNumber(random_generator.next().toString(10));
    }

    var polynomial = function( x ){
        x = new BigNumber( x );
        var y = coefficients[0]; 
        
        for( var i = 1; i < k; i++ ){
            y = y.add( coefficients[i].multiply( x.pow( i ) ) );
        }

        return y.toString(10);
    };

    return polynomial;
};

/**
 * Takes a seed and creates a random number generator. Returns an object with a 
 * 'next' function. Example:
 *
 *      var seed = BigInteger( "58823930209319485902039482358", 10 );
 *      var rand_gen = CROWDLOGGER.secret_sharing.rand( seed );
 *      var rand_num1 = rand_gen.next();
 *      var rand_num2 = rand_gen.next();
 *          ...
 *
 * Modified from: 
 * http://michalbe.blogspot.com/2011/02/javascript-random-numbers-with-custom_23.html
 *
 * @param {BigInteger} seed The seed to use for the random number generator.
 *
 * @return An object with a next() function that returns the next random number
 *      in the sequence.
 */
CROWDLOGGER.secret_sharing.random = function( seed ) {  

  var constant = new BigInteger( Math.pow( 2, 13 ) + "", 10 ),
    prime = new BigInteger( "1299721", 10 ),
    maximum = CROWDLOGGER.secret_sharing.BIG_PRIME;  

    return {  
      next : function() {  
        seed = seed.multiply( constant );  
        seed = seed.add( prime );  
        seed = seed.mod( maximum );  
   
        return seed; 
      }  
    }  
};


/**
 * Performs Lagrange interpolation on a series of (x, f(x)) pairs. If the
 * polynomial used was of degree k, we need at least k distinct (x, f(x))
 * pairs to successfully interpolate the polynomial and come up with the
 * y intercept (f(0)). This is not really used in the extension, but good to 
 * have, anyway.
 *
 * @param {array} xy_pairs An array of 2-element arrays, where each contains
 *      an x value (as a string) and a y value (f(x)) (also as a string).
 *
 * @return The y-intercept f(0) of the interpolated polynomial.
 */
CROWDLOGGER.secret_sharing.lagrange_interpolate = function( xy_pairs ) {

    // BigNumber precision.
    var p = 100;

    // Calculate P_k(x) = \sum_{j=0}^{j<k} y_j * l_j(x)
    // We're only interested in P_k(0).
    var intercept = new BigNumber( 0, p );

    // Need to compute the lagrange bases.
    // Formula: l_j(x) = \prod_{i=0, i!=j}^{k} (x - x_i)/(x_j - x_i)
    for( var j = 0; j < xy_pairs.length; j++ ){

        var pair_j = xy_pairs[j];

        // The x value from the pair.
        var x_j = new BigNumber( pair_j[0], p );

        // To keep track of the numerator and denominator of the Lagrange basis.
        var l_numerator = new BigNumber(1, p);
        var l_denominator = new BigNumber(1, p);

        // Loop through all of the other pairs to make the Lagrange basis l_j.
        for( var i = 0; i < xy_pairs.length; i++ ){
            var pair_i = xy_pairs[i];
            // The x value from the pair.
            var x_i = new BigNumber( pair_i[0], p );

            // We don't want to look at pairs that are the same.
            if( i !== j ){
                // Using BigNumbers here helps with precision.
                // We only care about x = 0, so we do 0-x_i rather than x-x_i. 
                l_numerator = l_numerator.multiply( 
                    new BigNumber( x_i.negate() ) );
                l_denominator = l_denominator.multiply( 
                    new BigNumber( x_j.subtract(x_i), p ) );
            }
        }

        // We are multiply this way to minimize the amount of error we get from
        // dividing a smaller number by the denominator.
        var to_add = new BigNumber( pair_j[1], p ).divide( l_denominator ).    
                multiply( l_numerator );

        intercept = intercept.add( to_add );
    }

    var ret = intercept.mod( new BigNumber( 
        CROWDLOGGER.secret_sharing.BIG_PRIME.toString(10) ) ).toString();

    // Since the rounding in BigNumber is below par, we need to do a little bit
    // of finagling to round the end result (ret) to the nearest whole number.
    // This involves taking the digit in the ones place and all of the decimals
    // and rounding that number using Math.round. Then we can take the resulting
    // integer and glue it back into the result (ret).
    var decimal = ret.indexOf( "." );
    if( decimal > 0 ){
        var round = Math.round( parseFloat( ret.substring( decimal-1 ) ) );
        ret = ret.substring( 0, decimal-1 ) + round.toString(); 
    }


    return ret;
};

} // END CROWDLOGGER.secret_sharing NAMESPACE.

