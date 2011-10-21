// Maximum number of contacts in a k-bucket
global._k = 6;

// Degree of parallelism for network calls
global._alpha = 3;

// sha1 function
global._digest = Crypto.digest.SHA1;

var Crypto = global.Crypto = {};

var base64map = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

var util = Crypto.util = {
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

  // Convert a byte array to a base-64 string
  bytesToBase64: function (bytes) {

    // Use browser-native function if it exists
    if (typeof btoa == "function") return btoa(Binary.bytesToString(bytes));

    for(var base64 = [], i = 0; i < bytes.length; i += 3) {
      var triplet = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      for (var j = 0; j < 4; j++) {
        if (i * 8 + j * 6 <= bytes.length * 8)
          base64.push(base64map.charAt((triplet >>> 6 * (3 - j)) & 0x3F));
        else base64.push("=");
      }
    }

    return base64.join("");

  },

  // Convert a base-64 string to a byte array
  base64ToBytes: function (base64) {

    // Use browser-native function if it exists
    if (typeof atob == "function") return Binary.stringToBytes(atob(base64));

    // Remove non-base-64 characters
    base64 = base64.replace(/[^A-Z0-9+\/]/ig, "");

    for (var bytes = [], i = 0, imod4 = 0; i < base64.length; imod4 = ++i % 4) {
      if (imod4 == 0) continue;
      bytes.push(((base64map.indexOf(base64.charAt(i - 1)) & (Math.pow(2, -2 * imod4 + 8) - 1)) << (imod4 * 2)) |
                 (base64map.indexOf(base64.charAt(i)) >>> (6 - imod4 * 2)));
    }

    return bytes;

  }

};

var charenc = Crypto.charenc = {};
var Binary = Crypto.charenc.Binary = {

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

var UTF8 = Crypto.charenc.UTF8 = {

  // Convert a string to a byte array
  stringToBytes: function (str) {
    return Binary.stringToBytes(unescape(encodeURIComponent(str)));
  },

  // Convert a byte array to a string
  bytesToString: function (bytes) {
    return decodeURIComponent(escape(Binary.bytesToString(bytes)));
  }

};

// Digest (SHA1)

var digest = Crypto.digest = {
  
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

  },

  // Package private blocksize
  _blocksize: 16,

  _digestsize: 20
};

var Node = Class.create({
  
  initialize: function(ip, port, id) {
    if (typeof id === 'undefined') {
      this.id = this._generateId();
    } else {
      this.id = id;
    }
    
    this._routing_table = new RoutingTable(this.id);
  },
  
  _generateId: function() {
    return _digest(this.ip + ':' + this.port);
  }
  
});

var RoutingTable = Class.create({
  
  initialize: function(parent_id) {
    this._parent_id = parent_id;
    this._kbuckets = [new KBucket(0, Math.pow(2,160))];
  },
  
  // Public
  
  /**
   * Calculates the XOR distance between two keys
   * These keys are SHA1 hashes as ascii `String`
   *
   * @param {String} key number one
   * @param {String} key number two
   * @return {String} distance between the two keys
   * @api public 
   */
  distance: function(key_one, key_two) {
    // return key_one ^ key_two
  },
  
  /**
   * Add a peer to the routing table
   * 
   * @param {Peer} peer object to add
   * @return {Void}
   * @api public 
   */
  addPeer: function(peer) {
    if (peer.id == this._parent_id) {
      return;
    }
    
    // find the kbucket for the peer
    try {
      var kbucket_index = this._kbucketIndexFor(peer.id);
    }
    // if the kbucket is full, try to split it in two
    catch(e) {
    }
  },

  // Private
  
  /**
   * Find the appropriate KBucket index for a given key
   *
   * @param {String} key SHA1 hash
   * @return {Integer} index for the `_kbuckets
   * @api private
   */
  _kbucketIndexFor: function(key) {
    for(kbucket in this._kbuckets) {
    }
  }
  
});

var KBucket = Class.create({
  
  initialize: function(min, max) {
    min = (typeof min === 'undefined') ? 0 : min;
    max = (typeof max === 'undefined') ? 160 : max;

    this._peers = {};
  },

  idInRange: function(id) {
  }
  
});

var Peer = Class.create({
  
  initialize: function(ip, port, id) {
    this.address = ip;
    this.port = port;
    
    if (typeof id === 'undefined') {
      this.id = this._generateId();
    } else {
      this.id = id;
    }
  },
  
  // Public
  toString: function() {
    return '<' + this.id + '; ' + this.address + ':' + this.port + '>';
  },
  
  // Private
  _generateId: function() {
    return _digest(this.ip + ':' + this.port); 
  }
  
});
