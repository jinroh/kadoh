// Dep: [KadOH]/core/class

(function(exports) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  
  KadOH.Peer = Class({

    initialize: function(ip, port, id) {
      if (typeof ip === 'string') {
        this._ip = ip;
        this._port = port;
        this._id = id;
      }
      else {
        this._ip = ip[0];
        this._port = ip[1];
        this._id = ip[2];
      }
      this._socket = this._ip + ':' + this._port;

      if (typeof this._id === 'undefined') {
        this._id = this._generateId();
      }
    },

    // Public
    getID: function() {
      return this.getId();
    },
    
    getId: function() {
      return this._id;
    },

    getSocket: function() {
      return this._socket;
    },
    
    getTriple: function() {
      return [this._ip, this._port, this._id];
    },
    
    equals: function(peer) {
      return (this._id === peer.getId() && this._socket === peer.getSocket());
    },
    
    toString: function() {
      return '<' + this._id + '; ' + this._socket + '>';
    },

    // Private
    _generateId: function() {
      return KadOH.globals._digest(this._socket); 
    }

  });
  
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
