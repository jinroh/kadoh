/*
 * Dep: [KadOH]/core/stateeventemitter
 * Dep: [KadOH]/core/deferred
 * Dep: [KadOH]/globals
 * Dep: [KadOH]/peer
 * Dep: [KadOH]/peerarray
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
      PeerArray         = KadOH.PeerArray,
      Reactor           = KadOH.rpc.KadOHReactor,
      RoutingTable      = KadOH.RoutingTable,
      Crypto            = KadOH.util.Crypto,
      IterativeFind     = KadOH.IterativeFind,
      ValueManagement   = KadOH.ValueManagement;

  KadOH.Node = Peer.extend({

    initialize: function(id, options) {
      //extends Peer
      this.supr('null', id || Crypto.digest.randomSHA1());

      //implements StateEventEmitter
      for(var i in StateEventEmitter.prototype) {
        if(i !== 'initialize') this[i] = StateEventEmitter.prototype[i];
      }
      StateEventEmitter.prototype.initialize.call(this);

      this.setState('initializing');
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
        this.setAddress(address);
        if (typeof this._store == 'undefined') {
          this._store = new ValueManagement(this, this.config.value_management);
          this._store.on(this.VMEvents, this);
        }
        this.setState('connected');
      },

      disconnected: function() {
        this.setState('disconnected');
      },

      // RPC
      reached: function(peer) {
        peer.touch();
        this._routingTable.addPeer(peer);
      },

      queried: function(rpc) {
        if (! rpc.stateIs('progress'))
          return;
        var methodName = rpc.getMethod();
        this['handle'+methodName].call(this, rpc);
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
      }
    },

    VMEvents : {
      republish: function(key, value, exp) {
        this.iterativeStore(value, exp);
      }
    },
    
    //
    // Network functions
    //

    connect: function(callback, context) {
      if (this.stateIsNot('connected')) {
        if (callback) {
          this.once('connected', callback, context || this);
        }
        this._reactor.connectTransport();
      }
      return this;
    },

    disconnect: function(callback, context) {
      if (this.stateIsNot('disconnected')) {
        this._routingTable.stop();
        this._reactor.disconnectTransport();
      }
      return this;
    },

    join: function(bootstraps, callback, context) {
      if (!bootstraps || bootstraps.length === 0) {
        throw new Error('No bootstrap to join the network');
      }

      if (this.stateIs('connected')) {
        // bootstrapping
        bootstraps = bootstraps.map(function(address) {
          return new Peer(address, null);
        });

        // lookup process
        var startLookup = function() {
          this.emit('join started');
          return this.iterativeFindNode(this);
        };
        var noBootstrap = function() {
          return new Error('no bootstrap');
        };

        // joining result
        context = context || null;
        var success = function(result) {
          this.emit('joined', result);
          return;
        };
        var failure = function(error) {
          this.emit('join failed');
          return error;
        };

        Deferred.whenAtLeast(this._reactor.sendRPCs(bootstraps, 'PING'))
                .pipe(startLookup, noBootstrap, this)
                .pipe(success, failure, this)
                .pipe(callback, callback, context);
      }
      else {
        var args = arguments;
        this.once('connected', function() {
          this.join.apply(this, args);
        });
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
      var lookup = new IterativeFind(this, peer, type);
      var peers  = this._routingTable.getClosePeers(peer, globals.K);
      this.emit('iterativeFind started', lookup, peers);
      lookup.startWith(peers);
      return lookup;
    },
    
    iterativeFindNode: function(peer) {
      var deferred = new Deferred();
      var lookup = this._iterativeFind(peer, 'NODE').then(
        function(result) {
          deferred.resolve(result);
        },
        function(reached) {
          if (reached.length() >= globals.K) {
            deferred.resolve(reached);
          } else {
            deferred.reject(reached);
          }
        }
      );
      return deferred;
    },

    iterativeFindValue: function(key) {
      var lookup = this._iterativeFind(key, 'VALUE');
      // if succeeds, STORE the value to the closest seen
      // peer which didn't returned the value
      var reactor = this._reactor;
      lookup.addCallback(function(result, reached) {
        if (reached.length() > 1) {
          var index = (reached.newClosestIndex() > 0) ? 0 : 1;
          reactor.STORE(reached.getPeer(index), key, result.value, result.exp);
        }
      });
      return lookup;
    },

    iterativeStore: function(value, exp) {
      var key = Crypto.digest.SHA1(value);
      return this.iterativeFindNode(key).pipe(
        function(peers) {
          var targets = peers.pickOutFirst(globals.K);
          return Deferred.whenAtLeast(this._reactor.sendRPCs(targets, 'STORE', key, value, exp), 1)
                         .pipe(function(stores, not_stores) {
 
                           var peers_stored = new PeerArray(stores.map(function(rpc){
                             return rpc.getQueried();
                           }));
 
                           var peers_not_stored = new PeerArray(not_stores.map(function(rpc){
                             return rpc.getQueried();
                           }));
 
                           return {
                                    key        : key,
                                    stored     : peers_stored,
                                    not_stored : peers_not_stored
                                  };
                         }, function(stores, not_stores) {
                           return new PeerArray(not_stores.map(function(rpc){
                             return rpc.getQueried();
                           }));
                         });
        },
        function() {
          return new Error('iterative store failed');
        }, this);
    },

    
    handlePING: function(rpc) {
      rpc.resolve();
    },

    handleFIND_NODE: function(rpc) {
      rpc.resolve(this._routingTable.getClosePeers(
        rpc.getTarget(),
        globals.BETA,
        [rpc.getQuerying()]
      ));
    },

    handleFIND_VALUE: function(rpc) {
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

    handleSTORE: function(rpc) {
      this._store.save(rpc.getKey(), rpc.getValue(), rpc.getExpiration())
                 .then(rpc.resolve, rpc.reject, rpc);
    }
  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
