// Dep: [KadOH]/core/class
// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/reactor
// Dep: [KadOH]/util/ajax
// Dep: [KadOH]/routingtable
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/iterativefind

(function(exports) {
  
  var KadOH         = exports;
  var Class         = KadOH.core.Class;
  var globals       = KadOH.globals;
  var Peer          = KadOH.Peer;
  var Reactor       = KadOH.Reactor;
  var RoutingTable  = KadOH.RoutingTable;
  var Crypto        = KadOH.util.Crypto;
  var IterativeFind = KadOH.IterativeFind;

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
      this._routingTable = new RoutingTable(this);
    },
    
    // Network functions
    
    join: function(bootstraps) {
      if (typeof bootstraps === 'undefined' || bootstraps.length <= 0) {
        throw new Error('No bootstrap to join the network');
      }
      
      // this._routingTable.add(boostraps);
      for (var i=0; i < bootstraps.length; i++) {
        this._routingTable.addPeer(new Peer(bootstraps[i]));
      }
      
      var self = this;
      return this.iterativeFindNode(this.getId())
      .then(
        function(response) {
          self._routingTable.addPeers(response);
        },
        function(error) {
          console.log('The iterative lookup did not succeed');
        }
      );
    },
    
    /**
     * Iterative lookup used by kademlia
     * See /doc papers for informations on the loose parallelism
     * used in this implementation
     * @param {String} id Identifier of the peer or objects
     * @param {String} type The type of the lookup
     * @return {Promise}
     */
    _iterativeFind: function(id, type) {
      var seen = this._routingTable.getClosePeers(id, globals._alpha);
      return new IterativeFind(this, id, type).startWith(seen);
    },
    
    iterativeFindNode: function(id) {
      return this._iterativeFind(id, 'FIND_NODE');
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
      var close_peers = this._routingTable.getClosePeers(id, globals._beta, [sender.getId()]);
      
      // map the close peers to return only their triple
      return close_peers.map(function(peer) {
        return peer.getTriple();
      });
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
      return Crypto.digest.randomSHA1();
    }

  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
