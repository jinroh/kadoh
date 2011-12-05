// Dep: [KadOH]/core/eventemitter
// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/reactor
// Dep: [KadOH]/routingtable
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/iterativefind

(function(exports) {
  
  var KadOH         = exports,
      EventEmitter  = KadOH.core.EventEmitter,
      globals       = KadOH.globals,
      Peer          = KadOH.Peer,
      Reactor       = KadOH.Reactor,
      RoutingTable  = KadOH.RoutingTable,
      Crypto        = KadOH.util.Crypto,
      IterativeFind = KadOH.IterativeFind;

  KadOH.Node = EventEmitter.extend({

    initialize: function(id, options) {
      this.supr();

      if (!id)
        this._id = this._generateID();
      else
        this._id = id;
      
      // adding the reactor for network purposes
      this._reactor = new Reactor(this, (options) ? options.reactor : undefined);

      var self = this;
      this._reactor.on('transport connect', function(iam) {
        //globals reference to ME as node
        globals.ME = new Peer(iam, self._id);
        self._address = iam;
        self.emit('reactor connect');
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

      this.on('reactor connect', function() {
        self.emit('join start');
        self.iterativeFindNode(new Peer([self.getAddress(), self.getID()]))
        .then(
          function(response) {
            self.emit('join succeed', response);
            self._routingTable.addPeers(response);
          },
          function(shortlist) {
            self.emit('join failed', shortlist);
          }
        );
      });

      this._reactor.connectTransport();
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
    _iterativeFind: function(peer, type) {
      var self = this;

      var lookup = new IterativeFind(this, peer, type);

      lookup.then(function(response) {
        self.emit('iterativeFind resolved', lookup, response);
      },
      function(reject) {
        self.emit('iterativeFind rejected', lookup, reject);
      });

      var seen = this._routingTable.getClosePeers(peer.getID(), globals.ALPHA);
      this.emit('iterativeFind start', lookup);
      lookup.startWith(seen);

      return lookup;
    },
    
    iterativeFindNode: function(peer) {
      return this._iterativeFind(peer, 'FIND_NODE');
    },
    
    // RPCs
    // These function may return promises

    /**
     * PING
     */
    PING: function() {
      return 'PONG';
    },
    
    /**
     * FIND_NODE
     */
    FIND_NODE: function(params) {
      var validations = (
        typeof params        === 'object'     &&
        typeof params.id     === 'string'     &&
        typeof params.target === 'string'     &&
        globals.REGEX_NODE_ID.test(params.id) &&
        globals.REGEX_NODE_ID.test(params.target)
      );

      if (!validations)
        throw new TypeError();
      
      // retrieve the beta closest peer to the id
      // exclude the id of the requestor
      return this._routingTable.getClosePeers(
        params.target,
        globals.BETA
      ).filter(function(peer) {
        return peer.getID() !== params.id;
      }).getTripleArray();
    },

    // Getters
    
    reactor: function() {
      return this._reactor;
    },
    
    getID: function() {
      return this._id;
    },

    getAddress: function() {
      return this._address;
    },
    
    // Private

    _generateID: function() {
      return Crypto.digest.randomSHA1();
    }

  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
