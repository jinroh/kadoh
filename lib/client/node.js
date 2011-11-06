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
      
      // adding the reactor for network purposes
      this._reactor = new Reactor(this);
      
      // adding the default routing table
      this._routing_table = new RoutingTable(this._id);
    },
    
    // Network functions
    
    join: function(bootstraps) {
      if (typeof bootstraps === 'undefined' || bootstraps.length <= 0) {
        throw new Error('No bootstrap to join the network');
      }
      
      for (var i=0; i < bootstraps.length; i++) {
        this._routing_table.addPeer(new Peer(bootstraps[i]));
      }
      
      return this.iterativeFindNode(this.getId());
    },
    
    /**
     * Iterative find using loose parallelism
     * @TODO
     */
    _iterativeFind: function(id) {
      var peers = this._routing_table.getClosePeers(this.getId(), globals._alpha);
      var seen = [];
      var reached = [];
      
      var rpcs = this.reactor().sendRPCs(peers, 'FIND_NODE', [id]);
      
      return when.all(rpcs);
    },
    
    iterativeFindNode: function(id) {
      return this._iterativeFind(id);
    },
    
    // RPCs
    // These function may return promises

    /**
     * PING
     */
    PING: function(sender_socket) {
      return 'PONG';
    },
    
    /**
     * FIND_NODE
     */
    FIND_NODE: function(id, sender_socket) {
      var sender = new Peer(sender_socket);
      
      // retrieve the _beta closest peer to the id
      // exclude the id of the requestor
      var close_peers = this._routing_table.getClosePeers(id, globals._beta, [sender.getId()]);
      
      // map the close peers to return only their triple
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
