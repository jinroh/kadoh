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

      this._reactor.on('reached', function(peer){
        if(typeof peer.getID() !== 'undefined' && peer.getID() !== null)
          this._routingTable.addPeer(peer);
      }, this);

      this._reactor.on('receive RPCQuery', function(rpc) {
        this.handleRPCQuery(rpc);
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
        var pings = this._reactor.sendRPCs(bootstraps, 'PING');
        pings.forEach(function(ping) {
          ping.then(function() {
            self._routingTable.addPeer(ping.getQueried());
          });
        });

        var bootstrapping = Deferred.whenAtLeast(pings);

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

    handleRPCQuery: function(rpc) {
      switch(rpc.getMethod()) {
        case 'PING' :
          rpc.resolve(); break;
        case 'FIND_NODE' :
          rpc.resolve(this._routingTable.getClosePeers(
            rpc.getTarget(),
            globals.BETA,
            [rpc.getQuering()]
          ));
          break;
        default:
          break;
      }
      return this;
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
