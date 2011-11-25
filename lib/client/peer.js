// Dep: [KadOH]/core/class
// Dep: [KadOH]/util/crypto

(function(exports) {

  var KadOH = exports;
  var Class = KadOH.core.Class;
  var Crypto = KadOH.util.Crypto;


  KadOH.Peer = Class({

    initialize: function() {
      var args = Array.prototype.slice.call(arguments);

      if (Array.isArray(args[0])) {
        args = args[0];
      }

      this._ip = args[0];
      this._port = parseInt(args[1], 10);
      if(!this._ip || !this._port)
        throw new Error('no arguments for constructor');
        
      this._id = args[2];
      this._socket = this._ip + ':' + this._port;

      if (!this._id) {
        this._id = this._generateId();
      }

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

    getSocket: function() {
      return this._socket;
    },

    getTriple: function() {
      return [this._ip, this._port, this._id];
    },

    equals: function(peer) {
      return (this._id === peer.getId());
    },

    toString: function() {
      return '<' + this._socket + '#' + this._id + '>';
    },

    // Private
    _generateId: function() {
      return KadOH.globals._digest(this._socket);
    }

  });


})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
