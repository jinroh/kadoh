// Dep: [KadOH]/core/class
// Dep: [KadOH]/routingtable
// Dep: [KadOH]/globals
// Dep: [KadOH]/reactor

(function(exports) {
  
  var KadOH = exports;
  var globals = KadOH.globals;
  var Class = KadOH.core.Class;
  var RoutingTable = KadOH.RoutingTable;
  var Reactor = KadOH.Reactor;
  
  KadOH.Node = Class({

    initialize: function(ip, port, id) {
      if (typeof id === 'undefined') {
        this.id = this._generateId();
      } else {
        this.id = id;
      }

      this._routing_table = new RoutingTable(this.id);
      this._reactor = new Reactor(this);
    },
    
    reactor: function() {
      return this._reactor;
    },
    
    addPeer: function(peer) {
      this._routing_table.addPeer(peer);
    },
    
    removePeer: function(peer) {
      this._routing_table.removePeer(peer);
    },
    
    // RPCs
    
    PING: function() {
      return 'PONG';
    },
    
    FIND_NODE: function(id) {
      var close_peers = this._routing_table.getClosePeers(id);
      var result = [];
      
      for (var i=0; i < close_peers.length; i++) {
        result.push(close_peers.getTriple());
      }
      return result;
    },
    
    // Private

    _generateId: function() {
      return globals._digest(this.ip + ':' + this.port);
    }

  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
