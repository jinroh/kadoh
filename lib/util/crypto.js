/*
 * Crypto-JS v2.5.3
 * http://code.google.com/p/crypto-js/
 * Copyright (c) 2011, Jeff Mott. All rights reserved.
 * http://code.google.com/p/crypto-js/wiki/License
 */

var Crypto = module.exports = {
  // Bit-wise rotate left
  rotl: function (n, b) {
    return (n << b) | (n >>> (32 - b));
  },

  // Bit-wise rotate right
  rotr: function (n, b) {
    return (n << (32 - b)) | (n >>> b);
  },

  // Swap big-endian to little-endian and vice versa
  endian: function (n) {
    // If number given, swap endian
    if (n.constructor == Number) {
      return Crypto.rotl(n, 8) & 0x00FF00FF | Crypto.rotl(n, 24) & 0xFF00FF00;
    }

    // Else, assume array and swap all items
    for (var i = 0; i < n.length; i++)
      n[i] = Crypto.endian(n[i]);
    return n;
  },

  // Generate an array of any length of random bytes
  randomBytes: function (n) {
    for (var bytes = []; n > 0; n--)
      bytes.push(Math.floor(Math.random() * 256));
    return bytes;
  },

  // Convert a byte array to big-endian 32-bit words
  bytesToWords: function (bytes) {
    for (var words = [], i = 0, b = 0; i < bytes.length; i++, b += 8)
      words[b >>> 5] |= bytes[i] << (24 - b % 32);
    return words;
  },

  // Convert big-endian 32-bit words to a byte array
  wordsToBytes: function (words) {
    for (var bytes = [], b = 0; b < words.length * 32; b += 8)
      bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF);
    return bytes;
  },

  // Convert a byte array to a hex string
  bytesToHex: function (bytes) {
    for (var hex = [], i = 0; i < bytes.length; i++) {
      hex.push((bytes[i] >>> 4).toString(16));
      hex.push((bytes[i] & 0xF).toString(16));
    }
    return hex.join("");
  },

  // Convert a hex string to a byte array
  hexToBytes: function (hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
      bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
  },

  /**
   * Compares two bytes array and tell which
   * one is greater than the other.
   * It is possible to use this function with
   * `Array.prototype.sort`
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/sort
   *
   * @param  {Array} a Bytes array
   * @param  {Array} b Bytes array
   * @return {-1|0|1}
   */
  compareBytes: function(a, b, xor) {
    var i, l,
        byte_a, byte_b;
    if (typeof xor !== 'undefined') {
      for (i = 0, l = a.length; i < l; i++) {
        byte_a = a[i] ^ xor[i];
        byte_b = b[i] ^ xor[i];
        if (byte_a[i] > byte_b[i])      return 1;
        else if (byte_a[i] < byte_b[i]) return -1;
      }
    } else {
      for (i = 0, l = a.length; i < l; i++) {
        if (a[i] > b[i])      return 1;
        else if (a[i] < b[i]) return -1;
      }
    }
    return 0;
  },

  compareHex: function(a, b, xor) {
    var c, l,
        byte_a, byte_b, byte_x;
    if (typeof xor !== 'undefined') {
      for (c = 0, l = a.length; c < l; c += 2) {
        byte_x = parseInt(xor.substr(c, 2), 16);
        byte_a = parseInt(a.substr(c, 2), 16) ^ byte_x;
        byte_b = parseInt(b.substr(c, 2), 16) ^ byte_x;
        if (byte_a > byte_b)      return 1;
        else if (byte_a < byte_b) return -1;
      }
    } else {
      for (c = 0, l = a.length; c < l; c += 2) {
        byte_a = parseInt(a.substr(c, 2), 16);
        byte_b = parseInt(b.substr(c, 2), 16);
        if (byte_a > byte_b)      return 1;
        else if (byte_a < byte_b) return -1;
      }
    }
    return 0;
  },

  /**
   * Return the position of the first different bit
   * between two hexadecimal strings
   *
   * @param {String} hex1 the first hexadecimal string
   * @param {String} hex2 the second hexadecimal string
   * @return {Integer} the position of the bit
   * @see http://jsperf.com/integral-binary-logarithm/3
   */
  distance: function(hex1, hex2, bytes) {
    if (bytes === true) {
      hex1 = Crypto.bytesToHex(hex1);
      hex2 = Crypto.bytesToHex(hex2);
    }

    if (hex1 === hex2) {
      return 0;
    }

    var length = hex1.length,
        diff   = 0;
    if (hex2.length !== length) {
      throw new TypeError('different length string', hex1, hex2);
    }

    for (var c = 0; c < length; c+=2) {
      diff = parseInt(hex1.substr(c, 2), 16) ^ parseInt(hex2.substr(c, 2), 16);
      if (diff > 0)
        return 4*(length - c) + Math.floor(Math.log(diff) / Math.LN2) - 7;
    }
    return 0;
  }
};


Crypto.charenc = {};
Crypto.charenc.Binary = {

  // Convert a string to a byte array
  stringToBytes: function (str) {
    for (var bytes = [], i = 0; i < str.length; i++)
    bytes.push(str.charCodeAt(i) & 0xFF);
    return bytes;
  },

  // Convert a byte array to a string
  bytesToString: function (bytes) {
    for (var str = [], i = 0; i < bytes.length; i++)
    str.push(String.fromCharCode(bytes[i]));
    return str.join("");
  }

};

Crypto.charenc.UTF8 = {

  // Convert a string to a byte array
  stringToBytes: function (str) {
    return Crypto.charenc.Binary.stringToBytes(unescape(encodeURIComponent(str)));
  },

  // Convert a byte array to a string
  bytesToString: function (bytes) {
    return decodeURIComponent(escape(Crypto.charenc.Binary.bytesToString(bytes)));
  }

};

// Digest (SHA1)

Crypto.digest = {

  SHA1: function(message) {
    var digestbytes = Crypto.wordsToBytes(Crypto.digest._sha1(message));
    return Crypto.bytesToHex(digestbytes);
  },

  randomSHA1: function(id, range) {
    var bytes = [];
    var index = 0;

    if (id) {
      var distance;
      if (typeof range.min === 'number' &&
          typeof range.max === 'number') {
        distance = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      }
      else if (typeof range === 'number') {
        distance = range;
      }

      if (distance && distance > 0) {
        bytes = Crypto.hexToBytes(id);
        index = Math.floor(20 - distance / 8);

        var pow = (distance - 1) % 8;
        var max = Math.pow(2, pow + 1) - 1;
        var min = Math.pow(2, pow);
        bytes[index] ^= Math.floor(Math.random() * (max - min + 1)) + min;
        
        index += 1;
      }
      else {
        return id;
      }
    }

    for (; index < 20; index++) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
    return Crypto.bytesToHex(bytes);
  },

  _sha1: function (message) {
    // Convert to byte array
    if (message.constructor == String) message = Crypto.charenc.UTF8.stringToBytes(message);

    /* else, assume byte array already */
    var m  = Crypto.bytesToWords(message),
    l  = message.length * 8,
    w  =  [],
    H0 =  1732584193,
    H1 = -271733879,
    H2 = -1732584194,
    H3 =  271733878,
    H4 = -1009589776;

    // Padding
    m[l >> 5] |= 0x80 << (24 - l % 32);
    m[((l + 64 >>> 9) << 4) + 15] = l;

    for (var i = 0; i < m.length; i += 16) {

      var a = H0,
          b = H1,
          c = H2,
          d = H3,
          e = H4;

      for (var j = 0; j < 80; j++) {

        if (j < 16) w[j] = m[i + j];
        else {
          var n = w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16];
          w[j] = (n << 1) | (n >>> 31);
        }

        var t = ((H0 << 5) | (H0 >>> 27)) + H4 + (w[j] >>> 0) + (
          j < 20 ? (H1 & H2 | ~H1 & H3) + 1518500249 :
          j < 40 ? (H1 ^ H2 ^ H3) + 1859775393 :
          j < 60 ? (H1 & H2 | H1 & H3 | H2 & H3) - 1894007588 :
                   (H1 ^ H2 ^ H3) - 899497514);

        H4 =  H3;
        H3 =  H2;
        H2 = (H1 << 30) | (H1 >>> 2);
        H1 =  H0;
        H0 =  t;

      }

      H0 += a;
      H1 += b;
      H2 += c;
      H3 += d;
      H4 += e;

    }

    return [H0, H1, H2, H3, H4];
  }

};