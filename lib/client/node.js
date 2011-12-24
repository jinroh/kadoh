// Dep: [KadOH]/core/stateeventemitter
// Dep: [KadOH]/core/deferred
// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/reactor
// Dep: [KadOH]/routingtable
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/iterativefind
// Dep: [KadOH]/valuemanagement

(function(exports) {
  
  var KadOH             = exports,
      StateEventEmitter = KadOH.core.StateEventEmitter,
      Deferred          = KadOH.core.Deferred,
      globals           = KadOH.globals,
      Peer              = KadOH.Peer,
      Reactor           = KadOH.Reactor,
      RoutingTable      = KadOH.RoutingTable,
      Crypto            = KadOH.util.Crypto,
      IterativeFind     = KadOH.IterativeFind,
      ValueManagement   = KadOH.ValueManagement;

  KadOH.Node = StateEventEmitter.extend({

    initialize: function(id, options) {
      this.supr();
      this.setState('initializing');

      if (!id)
        this._id = this._generateID();
      else
        this._id = id;
      
      var config = this.config = {};
      for (var option in options) {
        config[option] = options[option];
      }
      // adding the reactor for network purposes
      // adding the default routing table
      this._routingTable = new RoutingTable(this, config.routing_table);
      this._reactor      = new Reactor(this,      config.reactor);
      this.setState('initialized');
    },
    
    // Network functions

    connect: function() {
      var self = this;
      this._reactor.on('connected', function(address) {
        self._me      = new Peer(address, self._id);
        self._address = address;
        this._store   = new ValueManagement(self, self.config.value_management);
        self.setState('connected');
      });
      this._reactor.connectTransport();
      return this;
    },

    join: function(bootstraps) {
      var self = this;
      if (!bootstraps || bootstraps.length === 0) {
        throw new Error('No bootstrap to join the network');
      }
      
      bootstraps = bootstraps.map(function(address) {
        return new Peer(address, null);
      });

      this.once('connected', function() {
        // boostrapping process
        var bootstrapping = Deferred.whenAtLeast(
          self._reactor.sendRPCs(bootstraps, 'PING')
        );

        // joining lookup process
        var join = function() {
          self.emit('join started');
          self.iterativeFindNode(self.getMe())
              .then(function(response) {
                      self.emit('joined', response);
                    },
                    function(shortlist) {
                      self.emit('join failed', shortlist);
                    });
        };

        var cannotJoin = function() {
          self.emit('join failed', 'no bootstrap');
        };

        bootstrapping.then(join, cannotJoin);
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
    _iterativeFind: function(peer, type) {
      var lookup;
      var self = this;

      var success = function(response) {
        self.emit('iterativeFind resolved', lookup, response);
      };
      var failure = function(error) {
        self.emit('iterativeFind rejected', lookup, error);
      };

      lookup = new IterativeFind(this, peer, type)
              .then(success, failure);

      this.emit('iterativeFind started', lookup);
      lookup.startWith(this._routingTable.getClosePeers(peer.getID(), globals.ALPHA));
      
      return lookup;
    },
    
    iterativeFindNode: function(peer) {
      return this._iterativeFind(peer, 'NODE');
    },

    iterativeFindValue: function(value) {
      return this._iterativeFind(peer, 'VALUE');
      // @TODO
    },
    
    // RPCs
    // These function may return promises

    /**
     * PING
     */
    PING: function() {
      return {
        id: this.getID()
      };
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
      
      var id = this.getID();
      // retrieve the beta closest peer to the id
      // exclude the id of the requestor
      return {
        id    : id,
        nodes : this._routingTable.getClosePeers(
          params.id,
          globals.BETA,
          [new Peer(null, params.id)]
        ).getTripleArray()
      };
    },

    FIND_VALUE: function(params) {
      var validations = (
        typeof params       === 'object'      &&
        typeof params.id    === 'string'      &&
        typeof params.value === 'string'      &&
        globals.REGEX_NODE_ID.test(params.id) &&
        globals.REGEX_NODE_ID.test(params.target)
      );
      
      if (!validations)
        throw new TypeError();

      var id       = this.getID();
      var deferred = new Deferred();

      // if the key exists, resolve the value
      // with its expiration date
      var success = function(value, exp) {
        deferred.resolve({
          id         : id,
          value      : value,
          expiration : exp
        });
      };

      // if the retrieves is rejected, same as FIND_NODE
      // send the beta closest peer to the id
      // exclude the id of the requestor
      var failure = function() {
        deferred.resolve({
          id    : id,
          nodes : this._routingTable.getClosePeers(
            params.value,
            globals.BETA,
            [new Peer(null, params.id)]
          ).getTripleArray()
        });
      };

      this.store.retrieve(params.value)
                .then(success, failure);

      return deferred;
    },

    STORE: function(params) {
      var validations = (
        typeof params       === 'object'          &&
        typeof params.id    === 'string'          &&
        (
          (
            typeof params.data       === 'string' &&
            typeof params.expiration === 'number'
          )                                       ||
          (
            typeof params.data    === 'undefined' &&
            typeof params.request === 'boolean'   &&
            typeof params.length  === 'number'
          )
        )                                         &&
        globals.REGEX_NODE_ID.test(params.id)     &&
        globals.REGEX_NODE_ID.test(params.target)
      );

      if (!validations)
        throw new TypeError();
      
      // @TODO
      // Manage a two-phase STORE with
      // a request process
      var deferred = new Deferred();
      var success = function() {
        deferred.resolve('OK');
      };

      var failure = function(error) {
        deferred.reject(error);
      };

      this.store.save(
        globals.digest(params.data),
        params.data,
        params.expiration
      ).then(success, failure);

      return deferred;
    },

    // Value Mabagement
    
    republish : function(key, value, exp) {
      // @TODO
    },

    // Getters
    
    reactor: function() {
      return this._reactor;
    },

    getMe: function() {
      return this._me;
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
