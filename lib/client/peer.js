// Dep: [KadOH]/globals
// Dep: [KadOH]/core/class
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/globals

(function(exports) {

  var KadOH   = exports,
      Class   = KadOH.core.Class,
      Crypto  = KadOH.util.Crypto,
      globals = KadOH.globals;

  KadOH.Peer = Class({

    initialize: function() {
      var args = arguments;
      if ((args.length === 1) && (args[0] instanceof Array))
        args = args[0];

      this._address = args[0];
      this._id      = args[1];

      if (typeof this._id === 'undefined') {
        this._id = this._generateID();
      } else if (this._id !== null) {
        if (!this._validatesID(this._id))
          throw new Error('non valid ID');
      }
      
      this._distance = null;
      this.touch();
    },

    // Public
    touch: function() {
      this._lastSeen = new Date();
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

    getXORWith: function(id) {
      return Crypto.XOR(this.getID(), id);
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

    // Private
    _validatesID: function(id) {
      return globals.REGEX_NODE_ID.test(id);
    },

    _generateID: function() {
      return globals.DIGEST(this._address);
      // return Crypto.digest.randomSHA1();
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
