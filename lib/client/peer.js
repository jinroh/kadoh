// Dep: [KadOH]/globals
// Dep: [KadOH]/core/class
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/globals

(function(exports) {

  var KadOH   = exports,
      Class   = KadOH.core.Class,
      Crypto  = KadOH.util.Crypto,
      globals = KadOH.globals;

  var Peer = KadOH.Peer = Class({

    /**
     * Peer constructor
     * 
     * @param {String|Array} address Address of the Peer or tuple representation
     * @param {String}       id      ID of the Peer
     */
    initialize: function() {
      var args  = arguments;

      if (Array.isArray(args[0])) {
        args  = args[0];
      }

      this.touch();
      this._distance = null;
      this._address  = args[0];
      this._id       = args[1];

      if (!this._validateID(this._id)) {
        throw new Error('non valid ID');
      }
    },

    //
    // Public
    //

    touch: function() {
      this._lastSeen = new Date().getTime();
      return this;
    },

    setID: function(id) {
      this._id = id;
    },

    setAddress: function(address) {
      this._address = address;
    },

    getLastSeen: function() {
      return this._lastSeen;
    },

    getID: function() {
      return this._id;
    },

    cacheDistance: function(id) {
      this._distance = this._distance || this.getDistanceTo(id);
      return this;
    },

    getDistance: function() {
      return this._distance;
    },

    getDistanceTo: function(id) {
       return Crypto.distance(this.getID(), id);
    },

    getAddress: function() {
      return this._address;
    },

    getTriple: function() {
      return [this._address, this._id];
    },

    equals: function(peer) {
      return (this._id === peer.getID());
    },

    toString: function() {
      return '<' + this._address + '#' + this._id + '>';
    },

    //
    // Private
    //

    _validateID: function(id) {
      return typeof id === 'string' && globals.REGEX_NODE_ID.test(id);
    },

    _generateID: function() {
      return globals.DIGEST(this._address);
      // return Crypto.digest.randomSHA1();
    }

  });

  KadOH.PeerBootstrap = Peer.extend({

    initialize: function() {
      var args  = arguments;

      if (Array.isArray(args[0])) {
        args  = args[0];
      }

      this.touch();
      this._distance = null;
      this._address  = args[0];
      this._id       = null;
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
