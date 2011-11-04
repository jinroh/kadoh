// Dep: [KadOH]/core/class
// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/routingtable
// Dep: [KadOH]/reactor

(function(exports) {
  
  var KadOH = exports;
  var globals = KadOH.globals;
  var Class = KadOH.core.Class;
  var Peer = KadOH.Peer;
  var RoutingTable = KadOH.RoutingTable;
  var Reactor = KadOH.Reactor;
  
  KadOH.Node = Class({

    initialize: function(ip, port, bootstraps, id) {
      this._ip = ip;
      this._port = parseInt(port, 10);
      
      if (typeof id === 'undefined') {
        this._id = this._generateId();
      } else {
        this._id = id;
      }

      this._routing_table = new RoutingTable(this._id);
      this._reactor = new Reactor(this);
    },
    
    // Network functions
    
    join: function(bootstraps) {
      for (var i=0; i < bootstraps.length; i++) {
        this._routing_table.addPeer(new Peer(bootstraps[i]));
      }
      
      return this.iterativeFindNode(this.getId());
    },
    
    /**
     * Iterative find using loose parallelism
     */
    _iterativeFind: function(id) {
      var peers = this._routing_table.getClosePeers(this.getId(), globals._alpha);
      var seen = [];
      var reached = [];
      
      var rpcs = this.reactor().sendRPCs(peers, 'FIND_NODE', ['123']);
      
      when.map(rpcs, function(result) {
        console.log(result);
        return result;
      });
    },
    
    iterativeFindNode: function(id) {
      this._iterativeFind(id);
    },
    
    // RPCs

    PING: function() {
      return 'PONG';
    },
    
    FIND_NODE: function(id) {
      var close_peers = this._routing_table.getClosePeers(id);
      var result = [];
      
      for (var i=0; i < close_peers.length; i++) {
        result.push(close_peers[i].getTriple());
      }
      return result;
    },
    
    // Getters
    
    reactor: function() {
      return this._reactor;
    },
    
    getTriple: function() {
      return [this._ip, this._port, this._id];
    },
    
    getSocket: function() {
      return this._ip + ':' + this._port;
    },
    
    getId: function() {
      return this._id;
    },
    
    getID: function() {
      return this.getId();
    },
    
    // Private

    _generateId: function() {
      return globals._digest(this.getSocket());
    }

  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
