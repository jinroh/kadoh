(function(exports){

  var KadOH = exports;

  var Class = KadOH.core.Class;

  KadOH.util = {};
  var Crypto = KadOH.util.Crypto = {};

  var util = Crypto.util = Class().statics({
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
        return util.rotl(n,  8) & 0x00FF00FF |
        util.rotl(n, 24) & 0xFF00FF00;
      }

      // Else, assume array and swap all items
      for (var i = 0; i < n.length; i++)
        n[i] = util.endian(n[i]);
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

    // Return the bytes xor of two hexadecimal strings
    XOR: function(hex1, hex2) {
      if (hex1.length != hex2.length)
      return;

      hex1 = util.hexToBytes(hex1);
      hex2 = util.hexToBytes(hex2);

      var xor = [];
      for (var i = 0; i < key1.length; i++) {
        xor.push(key1[i] ^ key2[i]);
      }
      return xor;
    },

    distance: function(key1, key2) {
      if (key1 === key2)
      return 0;

      key1 = Crypto.util.hexToBytes(key1);
      key2 = Crypto.util.hexToBytes(key2);

      var length = key1.length;
      if (length != key2.length) {
        console.error("distance between two different sized key");
        return -1;
      }

      var max_dist = length*8 - 1;

      for (i = 0; i < length; i++) {
        var diff = key1[i] ^ key2[i];

        if (diff) {
          for (var j = 0; j < 7; j++)
          if (diff >>> (7 - j))
          break;
          return max_dist - i*8 - j;
        }
      }
      return max_dist;
    }

  });

  var charenc = Crypto.charenc = {};
  Crypto.charenc.Binary = Class().statics({

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

  });

  Crypto.charenc.UTF8 = Class().statics({

    // Convert a string to a byte array
    stringToBytes: function (str) {
      return Binary.stringToBytes(unescape(encodeURIComponent(str)));
    },

    // Convert a byte array to a string
    bytesToString: function (bytes) {
      return decodeURIComponent(escape(Binary.bytesToString(bytes)));
    }

  });

  // Digest (SHA1)

  var digest = Crypto.digest = Class().statics({

    SHA1: function(message, options) {
      var digestbytes = util.wordsToBytes(digest._sha1(message));
      return options && options.asBytes ? digestbytes :
      options && options.asString ? Binary.bytesToString(digestbytes) :
      util.bytesToHex(digestbytes);
    },

    _sha1: function (message) {
      // Convert to byte array
      if (message.constructor == String) message = UTF8.stringToBytes(message);
      
      /* else, assume byte array already */
      var m  = util.bytesToWords(message),
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
          H3  =  H2;
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
    },

    // Package private blocksize
    _blocksize: 16,

    _digestsize: 20
  });
})('object' === typeof module ? module.exports : (this.KadOH = {}));
