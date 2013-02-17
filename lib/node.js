var StateEventEmitter  = require('./util/state-eventemitter'),
    Deferred           = require('./util/deferred'),
    Crypto             = require('./util/crypto'),
    PeerArray          = require('./util/peerarray'),
    XORSortedPeerArray = require('./util/xorsorted-peerarray'),
    IterativeDeferred  = require('./util/iterative-deferred'),

    globals            = require('./globals.js'),

    RoutingTable       = require('./dht/routing-table'),
    Peer               = require('./dht/peer'),
    BootstrapPeer      = require('./dht/bootstrap-peer'),

    Reactor            = require('./network/reactor'),
    PingRPC            = require('./network/rpc/ping'),
    FindNodeRPC        = require('./network/rpc/findnode'),
    FindValueRPC       = require('./network/rpc/findvalue'),
    StoreRPC           = require('./network/rpc/store'),

    ValueManagement    = require('./data/value-store');


var Node = module.exports = Peer.extend({
  /**
   * TODO : explicit the options..
   *
   *
   * @param  {[type]} id      [description]
   * @param  {[type]} options [description]
   * @return {[type]}
   */
  initialize: function(id, options) {
    // extends Peer
    this.supr('non-defined', id || Crypto.digest.randomSHA1());

    //implements StateEventEmitter
    for (var fn in StateEventEmitter.prototype) {
      if (fn !== 'initialize') this[fn] = StateEventEmitter.prototype[fn];
    }
    StateEventEmitter.prototype.initialize.call(this);

    this.setState('initializing');

    // store config
    var config = this.config = {};
    for (var option in options) {
      config[option] = options[option];
    }

    // extracts bootstraps from the config object
    if (!Array.isArray(config.bootstraps) || config.bootstraps.length === 0) {
      throw new Error('no bootstrap to join the network');
    } else {
      this._bootstraps = config.bootstraps.map(function(address) {
        return new BootstrapPeer(address);
      });
    }

    // instantiate a routing table and listen to it
    this._routingTable = new RoutingTable(this, config.routing_table);
    this._routingTable.on(this.routingTableEvents, this);

    // instantiate a reactor and listen to it
    this._reactor = new Reactor(this, config.reactor);
    this._reactor.register({
      PING       : PingRPC,
      FIND_NODE  : FindNodeRPC,
      FIND_VALUE : FindValueRPC,
      STORE      : StoreRPC
    });
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
      this._store.stop();
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
   * @param  {Function} callback   - called when bootstraps process ends
   * @param  {Object}   context    - context of the callback
   *
   * @return {self} this
   */
  join: function(callback, context) {
    // lookup process
    var startLookup = function() {
      this.emit('joining');
      return this.iterativeFindNode(this);
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

    //ping the bootstraps
    var pings = this._bootstraps.map(function(peer) {
      return new PingRPC(peer);
    });
    this._reactor.sendRPC(pings);

    context = context || this;
    Deferred.whenAtLeast(pings)
            .pipe(startLookup, noBootstrap, this)
            .then(success, failure, this)
            .then(callback, callback, context);

    return this;
  },

  /**
   * Get a value on the DHT providing the associated key.
   *
   * @public
   * Public wrapper around #iterativeFindValue.
   *
   * Provided callback will be called with the found value
   * or with null if not found.
   *
   * @param {String}   key       - key to find
   * @param {Function} callback  - function to be called at end
   * @param {Object}   [context] - context of callback
   * @return {self}
   */
  get: function(key, callback, context) {
    context = context || this;
    this.iterativeFindValue(key).then(
      function(kv) {
        callback.call(context, kv.value);
      }, function() {
        callback.call(context, null);
      });
    return this;
  },

  /**
   * Put a given value on the DHT associated to the given key and
   * with the given expiration time.
   *
   * @public
   * Public wrapper around #iterativeStore.
   *
   * If the given key is `null` the associated key is set to the SHA1 of
   * the value. Expiration time is not mandatory and set to infinite
   * by default.
   *
   * An optional callback (with a context) can be provided and will be
   * called with :
   *   - 1st parameter : key associated to the value on the DHT
   *   - 2nd parameter : number of peers that successfully stored the
   *        value. If 0, the process has failed.
   *
   * @param {String || null}  key        - key or null if value by default SHA1(value)
   * @param {*}               value      - value to store on the DHT
   * @param {Date || Number}  [key]      - date of expiration of the key/value
   * @param {Function}        [callback] - callback when the store process ends
   * @param {Object}          [context]  - context of callback
   * @return {self}
   */
  put: function(key, value, exp, callback, context) {
    // if no exp, arguments sliding
    if (typeof exp == 'function') {
      exp = undefined;
      callback = exp;
      context = callback;
    }

    // default values
    key = key || Crypto.digest.SHA1(String(value));
    exp = exp || -1;
    context = context || this;

    this.iterativeStore(key, value, exp)
        .then(function(key, peers) {
          if (callback) callback.call(context, key, peers.size());
        }, function() {
          if (callback) callback.call(context, null, 0);
        });
    return this;
  },

 //# INTERNAL EVENTS HANDLING

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
        var store_name = ['KadOH', this.getID(), this.getAddress()].join('|');
        this._store = new ValueManagement(store_name, this.config.value_management);
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
      if (!rpc.inProgress())
        return;
      this['handle' + rpc.getMethod()].call(this, rpc);
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
    rpc.resolve(this._routingTable.getClosePeers(rpc.getTarget(), globals.BETA, rpc.getQuerying()));
  },

  /**
   * Handle an incoming FIND_VALUE request:
   * - if we got the value, respond it.
   * - if not, fetch the BETA closest peer, respond them.
   *
   * @param  {FindValueRPC} rpc - the incoming rpc oject
   */
  handleFIND_VALUE: function(rpc) {
    var nodes = this._routingTable.getClosePeers(rpc.getTarget(), globals.BETA, rpc.getQuerying());
    this._store.retrieve(rpc.getTarget())
        .then(function(value, exp) {
          rpc.resolve(nodes, {value : value, exp : exp});
        }, function() {
          rpc.resolve(nodes, null);
        });
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
      this.iterativeStore(key, value, exp);
    }
  },

 //# ITERATIVE PROCESSES

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
  iterativeFindNode: function(target) {
    target = (target instanceof Peer) ? target.getID() : target;

    var send   = this.send(),
        close  = this._routingTable.getClosePeers(target, globals.K),
        init   = new XORSortedPeerArray(close, target),
        lookup = new IterativeDeferred(init);

    function map(peer) {
      var rpc = new FindNodeRPC(peer, target);
      send(rpc);
      return rpc;
    }

    function reduce(peers, newPeers, map) {
      peers.add(newPeers);
      var newClosest = peers.newClosestIndex();
      if (newClosest >= 0 && newClosest < globals.ALPHA) {
        peers.first(globals.ALPHA, map);
      }
      return peers;
    }

    function end(peers, map, reached) {
      if (reached.length) {
        lookup.resolve(new XORSortedPeerArray(reached, target));
      } else {
        lookup.reject(new XORSortedPeerArray());
      }
    }

    // -- UI HACK
    lookup._target = target;
    this.emit('iterativeFindNode', lookup, close);

    return lookup
      .map(map)
      .reduce(reduce, init)
      .end(end);
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
    if (!globals.REGEX_NODE_ID.test(key)) {
      throw new TypeError('non valid key');
    }

    var send   = this.send(),
        close  = this._routingTable.getClosePeers(key, globals.K),
        init   = new XORSortedPeerArray(close, key),
        lookup = new IterativeDeferred(init),
        staled = false;

    function map(peer) {
      return send(new FindValueRPC(peer, key));
    }

    function reduce(peers, nodes, result, map, queried, reached) {
      peers.add(nodes);
      if (result) {
        var index = (peers.newClosestIndex() > 0) ? 0 : 1;
        send(new StoreRPC(peers.getPeer(index), key, result.value, result.exp));
        lookup.resolve(result, new XORSortedPeerArray(reached, key));
      } else {
        if (peers.newClosestIndex() >= 0 && peers.newClosestIndex() < globals.ALPHA) {
          peers.first(globals.ALPHA, map);
        }
      }
      return peers;
    }

    function end(peers, map, reached) {
      lookup.reject(new XORSortedPeerArray(reached, key));
    }

    // -- UI HACK
    lookup._target = key;
    this.emit('iterativeFindValue', lookup, close);

    return lookup
      .map(map)
      .reduce(reduce, init)
      .end(end);
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
   * @param  {String} key - key
   * @param  {*} value - value to store on the network
   * @param  {Date | Integer} [exp = never] - experiation date of the value
   * @return {Deferred}
   */
  iterativeStore: function(key, value, exp) {
    if (!globals.REGEX_NODE_ID.test(key)) {
      throw new TypeError('non valid key');
    }

    function querieds(rpcs) {
      return new PeerArray(rpcs.map(function(rpc) {
        return rpc.getQueried();
      }));
    }

    var def = new Deferred(),
        send = this.send();

    var stores = function(peers) {
      var targets = peers.first(globals.K);
      var rpcs = targets.map(function(peer) {
        return send(new StoreRPC(peer, key, value, exp));
      });
      Deferred.whenAtLeast(rpcs, 1)
              .then(function(stored, notStored) {
                def.resolve(key, querieds(stored), querieds(notStored));
              }, function(stored, notStored) {
                def.reject(querieds(notStored));
              });
    };

    this.iterativeFindNode(key)
        .then(stores, function() { def.reject(new PeerArray()); });

    return def;
  },

  /**
   * Closure to proxy the reactor send method
   */
  send: function() {
    var reactor = this._reactor;
    return function() {
      return reactor.sendRPC.apply(reactor, arguments);
    };
  }

});