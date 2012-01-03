/*
 * Dep: [KadOH]/core/stateeventemitter
 * Dep: [KadOH]/core/deferred
 * Dep: [KadOH]/globals
 * Dep: [KadOH]/peer
 * Dep: [KadOH]/rpc/reactor
 * Dep: [KadOH]/routingtable
 * Dep: [KadOH]/util/crypto
 * Dep: [KadOH]/iterativefind
 * Dep: [KadOH]/valuemanagement
 */

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

      this._reactor.on('connected', function(address) {
        this._me      = new Peer(address, this._id);
        this._address = address;
        this._store   = new ValueManagement(this, this.config.value_management);
        this.setState('connected');
      }, this);

      this._reactor.on('disconnected', function() {
        this.setState('disconnected');        
      }, this);

      this.setState('initialized');
    },
    
    // Network functions

    connect: function() {
      this._reactor.connectTransport();
      return this;
    },

    disconnect: function() {
      this._routingTable.stop();
      this._reactor.disconnectTransport();
      return this;
    },

    join: function(bootstraps) {
      if (!bootstraps || bootstraps.length === 0) {
        throw new Error('No bootstrap to join the network');
      }
      
      bootstraps = bootstraps.map(function(address) {
        return new Peer(address, null);
      });

      var process = function() {
        var self = this;
        // boostrapping process
        var bootstrapping = Deferred.whenAtLeast(
          this._reactor.sendRPCs(bootstraps, 'PING')
        );

        // joining lookup process
        var startLookup = function() {
          self.emit('join started');
          self.iterativeFindNode(self.getMe())
              .then(function(response) {
                      self.emit('joined', response);
                    },
                    function(shortlist) {
                      self.emit('join failed', shortlist);
                    });
        };

        var noBootstrap = function() {
          self.emit('join failed', 'no bootstrap');
        };

        bootstrapping.then(startLookup, noBootstrap);
      };

      if (this.stateIs('connected')) {
        process.call(this);
      } else {
        this.once('connected', process, this);
      }
      
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

      var success = function(response) {
        this.emit('iterativeFind resolved', lookup, response);
      };
      var failure = function(error) {
        this.emit('iterativeFind rejected', lookup, error);
      };

      lookup = new IterativeFind(this, peer, type)
              .then(success, failure, this);

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
            typeof params.key        === 'string' &&
            typeof params.value      === 'string' &&
            typeof params.expiration === 'number'
          )                                       ||
          (
            typeof params.value    === 'undefined' &&
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
        params.key,
        params.value,
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
