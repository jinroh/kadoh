(function(exports) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  
  KadOH.Peer = Class({

    initialize: function(ip, port, id) {
      this._ip = ip;
      this._port = port;
      this._socket = ip + ':' + port;

      if (typeof id === 'undefined') {
        this._id = this._generateId();
      } else {
        this._id = id;
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

    toString: function() {
      return '<' + this._id + '; ' + this._socket + '>';
    },

    // Private
    _generateId: function() {
      return KadOH.globals._digest(this._socket); 
    }

  });
  
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
