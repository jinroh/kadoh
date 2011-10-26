(function(exports) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  
  KadOH.Node = Class({

    initialize: function(ip, port, id) {
      if (typeof id === 'undefined') {
        this.id = this._generateId();
      } else {
        this.id = id;
      }

      this._routing_table = new RoutingTable(this.id);
    },
    
    addPeer: function(peer) {
      this._routing_table.addPeer(peer);
    },
    
    removePeer: function(peer) {
      this._routing_table.removePeer(peer);
    },
    
    // RPC
    
    ping: function() {
      
    },
    
    findNode: function() {
      
    },
    
    // Private

    _generateId: function() {
      return KadOH.globals._digest(this.ip + ':' + this.port);
    }

  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
