/*
 * Dep: [KadOH]/core/stateeventemitter
 * Dep: [KadOH]/core/deferred
 * Dep: [KadOH]/globals
 * Dep: [KadOH]/peer
 * Dep: [KadOH]/rpc/kadohreactor
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
      Reactor           = KadOH.rpc.KadOHReactor,
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

      this._routingTable = new RoutingTable(this, config.routing_table);
      this._routingTable.on(this.routingTableEvents, this);

      this._reactor = new Reactor(this, config.reactor);
      this._reactor.on(this.reactorEvents, this);

      this.setState('initialized');
    },

    //
    // Events
    //

    reactorEvents : {
      // Connection
      connected: function(address) {
        this._me      = new Peer(address, this._id);
        this._address = address;
        this._store   = this._store ||
                        new ValueManagement(this, this.config.value_management);
        this._store.on(this.VMEvents);
        this.setState('connected');
      },

      disconnected: function() {
        this.setState('disconnected');
      },

      // RPC
      reached: function(peer){
        this._routingTable.addPeer(peer);
      },

      queried: function(rpc) {
        this._handleRPCQuery(rpc);
      },

      outdated: function(peer, id) {
        this._routingTable.removePeer(peer);
        peer.setID(id);
        this._routingTable.addPeer(peer);
      }
    },

    routingTableEvents : {
      refresh: function(kbucket) {
        var random_sha = Crypto.digest.randomSHA1(this.getID(), kbucket.getRange());
        this.iterativeFindNode(random_sha);
      },

      // if the kbucket is full and not splittable ping the least seen peer
      // if it fails to respond, drop it and append the contact
      // /!\ DOS
      // @see http://xlattice.sourceforge.net/components/protocol/kademlia/specs.html#updates
      update: function(kbucket, peer) {
        var self = this;
        kbucket.update(peer, function(old) {
          return self.reactor().PING(old);
        });
      }
    },

    VMEvents : {
      republish: function(key, value, exp) {
        // @TODO
      }
    },
    
    //
    // Network functions
    //

    connect: function() {
      if (this.stateIsNot('connected')) {
        this._reactor.connectTransport();
      }
      return this;
    },

    disconnect: function() {
      if (this.stateIsNot('disconnected')) {
        this._routingTable.stop();
        this._reactor.disconnectTransport();
      }
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
      lookup.startWith(this._routingTable.getClosePeers(peer, globals.ALPHA));
      
      return lookup;
    },
    
    iterativeFindNode: function(peer) {
      return this._iterativeFind(peer, 'NODE');
    },

    iterativeFindValue: function(value) {
      return this._iterativeFind(peer, 'VALUE');
      // @TODO
      // if succeeds, STORE the value to the closest seen
      // peer which didn't returned the value
    },

    //
    // RPCs
    //

    PING: function(rpc) {
      rpc.resolve();
    },

    FIND_NODE: function(rpc) {
      rpc.resolve(this._routingTable.getClosePeers(
        rpc.getTarget(),
        globals.BETA,
        [rpc.getQuerying()]
      ));
    },

    FIND_VALUE: function(rpc) {
      this._store.retrieve(rpc.getTarget(), function(value, exp) {
        if(value !== null) {
          rpc.resolve({value : value, exp : exp}, true);
        } else {
          rpc.resolve(this._routingTable.getClosePeers(
            rpc.getTarget(),
            globals.BETA,
            [rpc.getQuerying()]
          ), false);
        }
      }, this);
    },

    STORE: function(rpc) {
      this._store.save(rpc.getKey(), rpc.getValue(), rpc.getExpiration());
      rpc.resolve();
      return;
    },

    _handleRPCQuery: function(rpc) {
      var result,
          method = rpc.getMethod();
      result = this[method].call(this, rpc);
    },

    //
    // Getters
    //
    
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
    
    //
    // Private
    //

    _generateID: function() {
      return Crypto.digest.randomSHA1();
    }

  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
