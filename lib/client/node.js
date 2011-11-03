// Dep: [KadOH]/core/class
// Dep: [KadOH]/routingtable
// Dep: [KadOH]/globals
// @TODO Dep: [KadOH]/reactor

(function(exports) {
  
  var KadOH = exports;
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
      return this._routing_table.getClosePeers(id);
    },
    
    // Private

    _generateId: function() {
      return KadOH.globals._digest(this.ip + ':' + this.port);
    }

  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
