// Dep: [KadOH]/core/class
// Dep: [KadOH]/routingtable
// Dep: [KadOH]/globals

(function(exports) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  var RoutingTable = KadOH.RoutingTable;
  var Protocol = KadOH.Protocol;
  
  KadOH.Node = Class({

    initialize: function(ip, port, id) {
      if (typeof id === 'undefined') {
        this.id = this._generateId();
      } else {
        this.id = id;
      }

      this._routing_table = new RoutingTable(this.id);
      this._protocol = new Protocol(this);
    },
    
    addPeer: function(peer) {
      this._routing_table.addPeer(peer);
    },
    
    removePeer: function(peer) {
      this._routing_table.removePeer(peer);
    },
    
    // RPC
    
    ping: function() {
      return 'PONG';
    },
    
    findNode: function() {
      
    },
    
    // Private

    _generateId: function() {
      return KadOH.globals._digest(this.ip + ':' + this.port);
    }

  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
