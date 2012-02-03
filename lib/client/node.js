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
    /**
     * TODO : explicit the options..
     *
     *
     * @param  {[type]} id      [description]
     * @param  {[type]} options [description]
     * @return {[type]}
     */
    initialize: function(id, options) {
      //extends Peer
      this.supr('null', id || Crypto.digest.randomSHA1());

      //implements StateEventEmitter
      for(var i in StateEventEmitter.prototype) {
        if(i !== 'initialize') this[i] = StateEventEmitter.prototype[i];
      }
      StateEventEmitter.prototype.initialize.call(this);

      this.setState('initializing');

      //store config
      var config = this.config = {};
      for (var option in options) {
        config[option] = options[option];
      }

      //instanciate a routing table and listen to it
      this._routingTable = new RoutingTable(this, config.routing_table);
      this._routingTable.on(this.routingTableEvents, this);

      //instanciate a reactor and listen to it
      this._reactor = new Reactor(this, config.reactor);
      this._reactor.on(this.reactorEvents, this);

      this.setState('initialized');
    },
    
    /**
     * Connect method : make the reactor connect.
     * @public
     *
     * @param  {Function} [callback] - callback to be called when connected
     * @param  {Object}   [context = this] - context of the callback
     * @return {self}
     */
    connect: function(callback, context) {
      if (this.stateIsNot('connected')) {
        if (callback) {
          this.once('connected', callback, context || this);
        }
        this._reactor.connectTransport();
      }
      return this;
    },

    /**
     * Disconnect method : make the reactor disconnect.
     * @public
     *
     * @param  {Function} [callback] - callback to be called when connected
     * @param  {Object}   [context = this] - context of the callback
     * @return {self}
     */
    disconnect: function(callback, context) {
      if (this.stateIsNot('disconnected')) {
        if (callback) {
          this.once('disconnected', callback, context || this);
        }
        this._routingTable.stop();
        this._reactor.disconnectTransport();
      }
      return this;
    },

    /**
     * Joining process : do an iterative find node on our own ID,
     * startying by contacting the peers passed as bootstraps.
     * @public
     *
     * TODO : expose a public API.
     *
     * @param  {Array}    bootstraps - array of adresses
     * @param  {Function} callback   - called when bootstraps process ends
     * @param  {Object}   context    - conetext of the callback
     *
     * @return {self} this
     */
    join: function(bootstraps, callback, context) {
      if (!bootstraps || bootstraps.length === 0) {
        throw new Error('No bootstrap to join the network');
      }

      // bootstrapping
      bootstraps = bootstraps.map(function(address) {
        return new Peer(address, null);
      });

      // lookup process
      var startLookup = function() {
        var deferred = new Deferred();
        this.emit('join started');
        this.iterativeFindNode(this)
            .addErrback(function(reached) {
              if (reached.length() >= globals.K) {
                deferred.resolve();
              } else {
                deferred.reject();
              }
            });
        return deferred;
      };
      var noBootstrap = function() {
        return new Error('no bootstrap');
      };

      // joining result
      var success = function() {
        this.emit('joined');
      };
      var failure = function() {
        this.emit('join failed');
      };

      context = context || this;
      Deferred.whenAtLeast(this._reactor.sendRPCs(bootstraps, 'PING'))
              .pipe(startLookup, noBootstrap, this)
              .then(success, failure, this)
              .then(callback, callback, context);
      
      return this;
    },

   
//--------------------INTERNAL EVENTS HANDLING---------------------

    /**
     * Reactions to events coming from the reactor.
     * @type {Object}
     */
    reactorEvents : {

      /**
       * On `connected` event :
       *   - save our address on the network
       *   - state is `connected`
       *
       * @param  {String} address - Address of the node on the network
       */
      connected: function(address) {
        this.setAddress(address);
        if (typeof this._store == 'undefined') {
          this._store = new ValueManagement(this, this.config.value_management);
          this._store.on(this.VMEvents, this);
        }
        this.setState('connected');
      },

      /**
       * On `disconnected`, state becomes `disconnected`.
       */
      disconnected: function() {
        this.setState('disconnected');
      },

      /**
       * On `reached` peer, add it to routing table.
       *
       * @param  {Peer} peer - Peer that had been reached.
       */
      reached: function(peer) {
        peer.touch();
        this._routingTable.addPeer(peer);
      },

      /**
       * On `queried` (means we received a RPC request), call
       * the appopriate method to fullfill the RPC.
       * @see #handle+`method_name`
       *
       * @param  {RPC} rpc - The received rpc
       */
      queried: function(rpc) {
        if (! rpc.stateIs('progress'))
          return;
        var methodName = rpc.getMethod();
        this['handle'+methodName].call(this, rpc);
      },

      /**
       * On `outdated` (means we received a response from a peer
       * which ID seems to be different from the one in the routing table),
       * update the ID in the routing table.
       *
       * @param  {Peer} peer - outdated peer
       * @param  {String} id - new id
       */
      outdated: function(peer, id) {
        this._routingTable.removePeer(peer);
        peer.setID(id);
        this._routingTable.addPeer(peer);
      }
    },

    /**
     * Handle an incoming PING RPC request :
     * simply respond to it.
     *
     * @param  {PingRPC} rpc - the incoming RPC object
     */
    handlePING: function(rpc) {
      rpc.resolve();
    },

    /**
     * Handle an incoming FIND_NODE RPC request :
     * fetch from the routing table the BETA closest
     * peers (except the querying peer) to the
     * targeted ID and respond to the rpc.
     *
     * @param  {FindNodeRPC} rpc - the inconming rpc object
     */
    handleFIND_NODE: function(rpc) {
      rpc.resolve(this._routingTable.getClosePeers(
        rpc.getTarget(),
        globals.BETA,
        [rpc.getQuerying()]
      ));
    },

    /**
     * Handle an incoming FIND_VALUE request:
     * - if we got the value, respond it.
     * - if not, fetch the BETA closest peer, respond them.
     *
     * @param  {FindValueRPC} rpc - the incoming rpc oject
     */
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

    /**
     * Handle an incoming STORE request :
     * store the value in ValueManagement and respond.
     *
     * @param  {StoreRPC} rpc - the incoming rpc object.
     */
    handleSTORE: function(rpc) {
      this._store.save(rpc.getKey(), rpc.getValue(), rpc.getExpiration())
                 .then(rpc.resolve, rpc.reject, rpc);
    },

    /**
     * Reactions to events comming from the routing table.
     * @type {Object}
     */
    routingTableEvents : {

      /**
       * On `refresh` (means a kbucket has not seen any fresh
       * peers for a REFRESH_TIMEOUT time), do an titerative find node
       * on a random ID in the KBucket range.
       *
       * @param  {KBucket} kbucket - Kbucket needing to be refreshed
       */
      refresh: function(kbucket) {
        var random_sha = Crypto.digest.randomSHA1(this.getID(), kbucket.getRange());
        this.iterativeFindNode(random_sha);
      }
    },

    /**
     * Reactions to event coming from the value management.
     * @type {Object}
     */
    VMEvents : {

      /**
       * On `republish` (means a key-value needs to be republished
       * on the network) : do an iterative store on it.
       *
       * @param  {String} key   - key
       * @param  {Object} value - value
       * @param  {Date | Number} exp   - expiration date
       */
      republish: function(key, value, exp) {
        this.iterativeStore(value, exp);
      }
    },

//--------------ITERATIVE PROCESSES----------------

    /**
     * Launch an iterative find node process.
     *
     * Return a deffered object :
     *   - resolve :
     *       {Peer}      peer  - peer found that have the targeted ID
     *       {PeerArray} peers - reached peers during the iterative process
     *   - reject :
     *       {PeerArray} peers - reached peers during the iterative process
     *
     * @param  {Peer | String} peer - Peer or Node ID to find.
     * @return {Deferred}
     */
    iterativeFindNode: function(peer) {
      return this._iterativeFind(peer, 'NODE');
    },

    /**
     * Launch an iterative find value process.
     *
     * If succeed, it STOREs the value to the
     * closest reached peer which didn't responded
     * the value.
     *
     * Return a deffered object :
     *   - resolve :
     *       {Object}    keyValue - properties :
     *                                `value` - the retrieved value
     *                                `exp`   - the expiration date
     *       {PeerArray} peers    - reached peers during the iterative process
     *   - reject
     *       {PeerArray} peers - reached peers during the iterative process
     *
     * @param  {String} key - targeted ID
     * @return {Deferred}
     */
    iterativeFindValue: function(key) {
      var reactor = this._reactor;
      return this._iterativeFind(key, 'VALUE')
                 .addCallback(function(result, reached) {
                   if (reached.length() > 1) {
                     var index = (reached.newClosestIndex() > 0) ? 0 : 1;
                     reactor.STORE(reached.getPeer(index), key, result.value, result.exp);
                   }
                 });
    },

    /**
     * Launch an iterative store process :
     *   do an iterative find node on the key,
     *   and send STORE RPCsto the K closest
     *   reached peers.
     *
     * Return a deferred object that is resolved when
     * at least one of the store RPC is resolved :
     *   - resolve :
     *       {String}    key   - key with wihich the value was stored
     *       {PeerArray} peers - peers that resolved the store RPC
     *       {PeerArray} peers_not - peers that did not resolved the store RPC
     *   - reject
     *       {PeerArray} peers_not - peers that did not resolved the store RPC
     *
     * @param  {*} value - value to store on the network
     * @param  {String} [key = SHA1(value)] - key, by default the sha1 of the value
     * @param  {Date | Integer} [exp = never] - experiation date of the value
     * @return {Deferred}
     */
    iterativeStore: function(value, key, exp) {
      key = key || Crypto.digest.SHA1(String(value));
      var def = new Deferred();

      var _stores = function(peers) {
        var targets = peers.pickOutFirst(globals.K);
        Deferred.whenAtLeast(this._reactor.sendRPCs(targets, 'STORE', key, value, exp), 1)
                .then(function(stored, not_stored) {
                  def.resolve(
                    key,
                    new PeerArray(stored.map(function(rpc){
                      return rpc.getQueried();
                      })),
                    new PeerArray(not_stored.map(function(rpc){
                      return rpc.getQueried();
                      }))
                    );
                  }, function(stored, not_stored) {
                    def.reject(new PeerArray(not_stored.map(function(rpc){
                                return rpc.getQueried();
                                }))
                              );
                  });
      };

      this.iterativeFindNode(key).then(
        function(peer, peers) {
          _stores.call(this, peers);
        },
        function(peers) {
          _stores.call(this, peers);
        }, this);
      
      return def;
    },

    /**
     * Iterative lookup used by kademlia
     * See /doc papers for informations on the loose parallelism
     * used in this implementation.
     *
     * @param {String} id   - Identifier of the peer or objects
     * @param {String} type - the type of the lookup
     * @return {Deferred}
     */
    _iterativeFind: function(peer, type) {
      var lookup = new IterativeFind(this, peer, type);
      var peers  = this._routingTable.getClosePeers(peer, globals.K);
      this.emit('iterativeFind started', lookup, peers);
      lookup.startWith(peers);
      return lookup;
    }
  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
