// Dep: [KadOH]/core/eventemitter
// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/reactor
// Dep: [KadOH]/util/ajax
// Dep: [KadOH]/routingtable
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/iterativefind

(function(exports) {
  
  var KadOH         = exports;
  var EventEmitter  = KadOH.core.EventEmitter;
  var globals       = KadOH.globals;
  var Peer          = KadOH.Peer;
  var Reactor       = KadOH.Reactor;
  var RoutingTable  = KadOH.RoutingTable;
  var Crypto        = KadOH.util.Crypto;
  var IterativeFind = KadOH.IterativeFind;

  KadOH.Node = EventEmitter.extend({

    initialize: function(id, options) {
      this.supr();

      if (!id)
        this._id = this._generateId();
      else
        this._id = id;
      
      // adding the reactor for network purposes
      this._reactor = new Reactor(this, (options) ? options.reactor : undefined);

      var self = this;
      this._reactor.on('transport connect', function(iam) {
        self._address = iam;
      });
      
      // adding the default routing table
      this._routingTable = new RoutingTable(this, (options) ? options.routing_table : undefined);
    },
    
    // Network functions
    
    join: function(bootstraps) {
      var self = this;

      if (!bootstraps || bootstraps.length <= 0) {
        throw new Error('No bootstrap to join the network');
      }
      
      this._routingTable.addPeers(bootstraps.map(function(peer) {
        return new Peer(peer);
      }));

      this._reactor.connectTransport()
                   .on('transport connect', function(iam) {
                      self._address = iam;
                      self.emit('join start');

                      self.iterativeFindNode(self.getId())
                      .then(
                        function(response) {
                          self.emit('join succeed', response);
                          self._routingTable.addPeers(response);
                        },
                        function(shortlist) {
                          self.emit('join failed', shortlist);
                        });
                    });
      return this;     
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
      var self = this;

      var lookup = new IterativeFind(this, id, type);

      lookup.then(function(response) {
        self.emit('iterativeFind resolved', lookup, response);
      },
      function(reject) {
        self.emit('iterativeFind rejected', lookup, reject);
      });

      var seen = this._routingTable.getClosePeers(id, globals._alpha);
      this.emit('iterativeFind start', lookup);
      lookup.startWith(seen);

      return lookup;
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
