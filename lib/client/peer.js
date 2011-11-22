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
      if(typeof this._ip === 'undefined' || typeof this._port ==='undefined')
        throw new Error('no arguments for constructor');
        
      this._id = args[2];
      this._socket = this._ip + ':' + this._port;

      if (typeof this._id === 'undefined') {
        this._id = this._generateId();
      }

      this._distance = undefined; //for caching
    },

    // Public
    getID: function() {
      return this.getId();
    },

    getId: function() {
      return this._id;
    },

    getXORWith : function(nodeId) {
      Crypto.XOR(this.getID(), nodeID);
    },

    getDistanceTo : function(nodeId) {
      Crypto.distance(this.getID(), nodeID);
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
