// Dep: [KadOH]/core/eventemitter
// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/reactor
// Dep: [KadOH]/util/ajax
// Dep: [KadOH]/routingtable
// Dep: [KadOH]/util/bind
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/util/when
// Dep: [KadOH]/iterativefind
// 

(function(exports) {
  
  var KadOH         = exports;
  var EventEmitter  = KadOH.core.EventEmitter;
  var globals       = KadOH.globals;
  var Peer          = KadOH.Peer;
  var Reactor       = KadOH.Reactor;
  var RoutingTable  = KadOH.RoutingTable;
  var bind          = KadOH.util.bind;
  var Crypto        = KadOH.util.Crypto;
  var when          = KadOH.util.when;
  var IterativeFind = KadOH.IterativeFind;

  KadOH.Node = EventEmitter.extend({

    initialize: function(id, options) {
      this.supr();

      var self = this;

      if (typeof id === 'undefined') {
        this._id = this._generateId();
      } else {
        this._id = id;
      }
      
      // adding the reactor for network purposes
      this._reactor = new Reactor(this, (options) ? options.reactor : undefined);

      this._reactor.on('transport connect', function(iam) {
        self._address = iam;
      });
      
      // adding the default routing table
      this._routing_table = new RoutingTable(this, (options) ? options.reouting_table : undefined);

    },
    
    // Network functions
    
    join: function(bootstraps) {
      var self = this;

      if (typeof bootstraps === 'undefined' || bootstraps.length <= 0) {
        throw new Error('No bootstrap to join the network');
      }

      for (var i=0; i < bootstraps.length; i++) {
        this._routing_table.addPeer(new Peer(bootstraps[i]));
      }

      this._reactor.connectTransport()
                   .on('transport connect', function(iam) {
                      self._address = iam;
                      self.emit('join start');

                      self.iterativeFindNode(self.getId())
                      .then(
                        function(response) {
                          self.emit('join succeed', response);
                          self._routing_table.addPeers(response);
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

      var seen = this._routing_table.getClosePeers(id, globals._alpha);
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
      var close_peers = this._routing_table.getClosePeers(id, globals._beta, [sender.getId()]);
      
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
