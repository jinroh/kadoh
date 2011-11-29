// Dep: [KadOH]/globals
// Dep: [KadOH]/core/class
// Dep: [KadOH]/util/crypto

(function(exports) {

  var KadOH = exports;
  var Class = KadOH.core.Class;
  var Crypto = KadOH.util.Crypto;
  var globals = KadOH.globals;



  KadOH.Peer = Class({

    initialize: function() {
      var args = Array.prototype.slice.call(arguments);

      if ((args.length === 1) && (args[0] instanceof Array))
        args = args[0];

      this._address = args[0];
      if(!this._address)
        throw new Error('no arguments for constructor');
        
      this._id = args[1];
      if (!this._id)
        this._id = this._generateId();
      else
        if (!this._validatesId(this._id)) throw new Error('non valid ID');

      
      this._distance = undefined;
      this.touch();
    },

    // Public
    touch: function() {
      this._lastSeen = new Date();
      return this;
    },

    getLastSeen: function() {
      return this._lastSeen;
    },

    getID: function() {
      return this.getId();
    },

    getId: function() {
      return this._id;
    },

    cacheDistance: function(nodeId) {
      this._distance = this._distance || this.getDistanceTo(nodeId);
      return this;
    },

    getDistance: function() {
      if (!this._distance)
        throw ReferenceError('_distance is not initialized');
      return this._distance;
    },

    getXORWith: function(nodeId) {
      return Crypto.XOR(this.getID(), nodeId);
    },

    getDistanceTo: function(nodeId) {
       return Crypto.distance(this.getID(), nodeId);
    },

    getAddress: function() {
      return this._address;
    },

    getTriple: function() {
      return [this._address, this._id];
    },

    equals: function(peer) {
      return (this._id === peer.getId());
    },

    toString: function() {
      return '<' + this._address + '#' + this._id + '>';
    },

    // Private
    _validatesId: function(id) {
      return globals.REGEX_NODE_ID.test(id);
    },

    _generateId: function() {
      return KadOH.globals.DIGEST(this._address);
    }

  });


})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
