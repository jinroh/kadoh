var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var res = mod._cached ? mod._cached : mod();
    return res;
}

require.paths = [];
require.modules = {};
require.extensions = [".js",".coffee"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = x + '/package.json';
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

require.define = function (filename, fn) {
    var dirname = require._core[filename]
        ? ''
        : require.modules.path().dirname(filename)
    ;
    
    var require_ = function (file) {
        return require(file, dirname)
    };
    require_.resolve = function (name) {
        return require.resolve(name, dirname);
    };
    require_.modules = require.modules;
    require_.define = require.define;
    var module_ = { exports : {} };
    
    require.modules[filename] = function () {
        require.modules[filename]._cached = module_.exports;
        fn.call(
            module_.exports,
            require_,
            module_,
            module_.exports,
            dirname,
            filename
        );
        require.modules[filename]._cached = module_.exports;
        return module_.exports;
    };
};

if (typeof process === 'undefined') process = {};

if (!process.nextTick) process.nextTick = (function () {
    var queue = [];
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;
    
    if (canPost) {
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);
    }
    
    return function (fn) {
        if (canPost) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        }
        else setTimeout(fn, 0);
    };
})();

if (!process.title) process.title = 'browser';

if (!process.binding) process.binding = function (name) {
    if (name === 'evals') return require('vm')
    else throw new Error('No such module')
};

if (!process.cwd) process.cwd = function () { return '.' };

if (!process.env) process.env = {};
if (!process.argv) process.argv = [];

require.define("path", function (require, module, exports, __dirname, __filename) {
function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("/lib/node.js", function (require, module, exports, __dirname, __filename) {
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
        lookup = new IterativeDeferred(init),
        staled = false;

    function map(peer) {
      var rpc = new FindNodeRPC(peer, target);
      send(rpc);
      return rpc;
    }

    function reduce(peers, newPeers, map) {
      peers.add(newPeers);
      if (peers.newClosestIndex() >= 0 && peers.newClosestIndex() < globals.ALPHA) {
        peers.first(globals.ALPHA, map);
      }
      return peers;
    }

    function end(peers, map, reached) {
      if (staled) {
        lookup.reject(new XORSortedPeerArray(reached, target));
        return;
      }

      if (reached.length <= globals.ALPHA && peers.size() > 0) {
        staled = true;
        peers.first(globals.K, map);
      } else {
        lookup.resolve(new XORSortedPeerArray(reached, target));
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
      var rpc = new FindValueRPC(peer, key);
      send(rpc);
      return rpc;
    }

    function reduce(peers, nodes, result, map, queried, reached) {
      peers.add(nodes);
      if (result) {
        var index = (peers.newClosestIndex() > 0) ? 0 : 1;
        var rpc = new StoreRPC(peers.getPeer(index), key, result.value, result.exp);
        send(rpc);
        lookup.resolve(result, new XORSortedPeerArray(reached, key));
      } else {
        if(peers.newClosestIndex() >= 0 && peers.newClosestIndex() < globals.ALPHA) {
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
});

require.define("/lib/util/state-eventemitter.js", function (require, module, exports, __dirname, __filename) {
var EventEmitter = require('./eventemitter');

var StateEventEmitter = module.exports = EventEmitter.extend({
  
  initialize: function() {
    this.supr();
    this.addEvent('state_change');
    this.state = null;
  },

  /**
   * Set state of the object and emit an event whose name is the given state.
   *
   * You can pass additional arguments that will be emited with.
   *
   * @example
   * obj.setState('connecting', 'google.com');
   * //will do :
   * obj.emit('connecting', 'google.com');
   *
   * @param {String}  state       the state to set
   * @param {*}       [add_args]  additionals arguments that will be passed in emit after the state
   *
   * @return {self}   this
   */
  setState: function(state) {
    if (this.state !== state) {
      this.setStateSilently(state);
      this.emit.apply(this, arguments);
      this.emit('state_change', state);
    }
    return this;
  },

  /**
   * Set state but don't emit any event.
   * @param {String} state the state to set
   *
   * @return {self} this
   */
  setStateSilently: function(state) {
    this.state = String(state);
    return this;
  },

  /**
   * Getter for the state of the object.
   * @return {String} state
   */
  getState: function() {
    return this.state;
  },

  /**
   * Match tester for the state of the object.
   * @param  {String} state state to be tested
   * @return {Booelean} result of the test
   */
  stateIs: function(state) {
    return this.state === state;
  },

  /**
   * Not match tester for the state of the object.
   * @param  {String} state state to be tested
   * @return {Booelean} result of the test
   */
  stateIsNot: function(state) {
    return this.state !== state;
  },

  /**
   * Call a function when the state change. The callback
   * function willl be called with the state as parameter.
   * @param  {Function} cb  The function to be called when state changes
   * @param  {Object}   [ctx] Context in which the callback function willl be called
   * @return {self} this
   */
  onStateChange: function(cb, ctx) {
    this.on('state_change', cb, ctx);
    return this;
  }

});
});

require.define("/lib/util/eventemitter.js", function (require, module, exports, __dirname, __filename) {
var klass = require('klass');

var Event = function(options) {
  this.callbacks   = [];
  this.stack       = [];
  this.args        = null;
  this.firing      = false;
  this.firingIndex = 0;
  this.firingStart = 0;
  this.disabled    = false;

  //
  // Config flags
  //
  this.memory = (options && options.memory) || false;
  this.once   = (options && options.once)   || false;
};

Event.prototype.addListener = function(listener, scope, once) {
  var length = this.callbacks.push({
    listener : listener,
    scope    : scope,
    once     : once
  });
  if (this.firing) {
    this.firingLength = length;
  } else if (this.args && this.args !== true) {
    this.firingStart = length - 1;
    this._fire(this.args);
  }
};

Event.prototype.removeListener = function(listener) {
  var i = this.callbacks.length - 1;
  for (; i >= 0; i--) {
    if (this.callbacks[i].listener === listener) {
      if (this.firing) {
        this.firingLength--;
        if (i <= this.firingIndex) {
          this.firingIndex--;
        }
      }
      this.callbacks.splice(i, 1);
    }
  }
};

Event.prototype.removeAllListeners = function() {
  this.callbacks = [];
};

Event.prototype.disable = function() {
  this.addListener = this.removeListener = this.fire = function() {};
  this.callbacks   = this.stack = null;
  this.disabled    = true;
};

Event.prototype.fired = function() {
  return !!this.args;
};

Event.prototype.fire = function(args) {
  if (this.firing) {
    if (!this.once) {
      this.stack.push(args);
    }
  }
  else if (!(this.once && this.args)) {
    this._fire(args);
  }
};

Event.prototype._fire = function(args) {
  this.args = !this.memory || args;
  if (this.callbacks.length) {
    this.firing = true;
    this.firingLength = this.callbacks.length;
    this.firingIndex  = this.firingStart || 0;
    for (; this.callbacks && this.firingIndex < this.firingLength; this.firingIndex++) {
      var callback = this.callbacks[this.firingIndex];
      if (callback.once && !this.once) {
        this.removeListener(callback.listener);
      }
      callback.listener.apply(callback.scope, args);
    }
    this.firing = false;
  }

  if (!this.once) {
    if (this.stack.length) {
      this.args = this.stack.shift();
      this.fire(this.args);
    }
  } else if (this.args === true) {
    this.disable(this);
  } else {
    this.callbacks = [];
  }
};

var EventEmitter = module.exports = klass(
    /** @lends EventEmitter# */
  {
  /**
   * Return an instance of EventEmitter
   * @class Ready to be extended to make object able to emit events.
   *
   * Inspiration : {@link https://github.com/Wolfy87/EventEmitter/blob/master/src/EventEmitter.js}
   * @constructs
   * @return {EventEmitter} The current EventEmitter instance to allow chaining
   */
  initialize: function() {
    this._events      = {};
    this._subscribers = [];
  },

  /**
   * Add a specific event
   * @param {String}   type          Name of the event
   * @paral {Function} [constructor] Constructor of the Event object
   * @param {Object}   [options]     Event options
   */
  addEvent: function(type, constructor, options) {
    if (this._events.hasOwnProperty(type)) {
      throw new Error(type + ' event already exists');
    } else {
      if (typeof constructor !== 'function') {
        options     = constructor;
        constructor = Event;
      }
      this._events[type] = new constructor(options);
    }
  },

  /**
   * Adds an event listener for the specified event
   *
   * @param {String} type - Event type name
   * @param {Function} listener - Function to be called when the event is fired
   * @param {Object} [scope = current {@link EventEmitter} instance] - Object that _this_ should be set to when the listener is called
   * @param {Boolean} [once = false] - If true then the listener will be removed after the first call
   * @return {EventEmitter} The current EventEmitter instance to allow chaining
   */
  on: function(type, listener, scope, once) {
    var events, event;

    // handle multiple events object
    if (typeof type === 'object') {
      events = type;
      for (event in events) {
        if (events.hasOwnProperty(event)) {
          this.on(event, events[event], listener, scope);
        }
      }
      return this;
    }

    // add the new listener
    events = this._events;
    if (events.hasOwnProperty(type)) {
      event = events[type];
    } else {
      event = events[type] = new Event();
    }
    event.addListener(listener, scope || this, once || false);
    return this;
  },

  /**
   * Alias for {@link EventEmitter#on} method : adds an event listener for the specified event.
   *
   * @param {String} type - Event type name
   * @param {Function} listener - Function to be called when the event is fired
   * @param {Object} [scope = current {@link EventEmitter} instance] - Object that _this_ should be set to when the listener is called
   * @param {Boolean} [once = false] - If true then the listener will be removed after the first call
   * @return {EventEmitter} The current EventEmitter instance to allow chaining
   */
  addListener: function() {
    return this.on.apply(this, arguments);
  },

  /**
   * Subscribe to all events fired. The listener function will be called with the name of the event as first argument.
   *
   * @param {Function} listener - Function to be called when any event is fired
   * @param {Object} [context = current {@link EventEmitter} instance] - Object that _this_ should be set to when the listener is called
   * @return {EventEmitter} The current EventEmitter instance to allow chaining
   */
  subscribe: function(listener, scope) {
    this._subscribers.push({
      scope    : scope || this,
      listener : listener
    });
    return this;
  },

  /**
   * Alias for {@link EventEmitter#subscribe}
   */
  onAny: function() {
    return this.subscribe.apply(this, arguments);
  },

  /**
   * Alias for {@link EventEmitter#on} method, but will remove the event after the first use
   *
   * @param {String} type - Event type name
   * @param {Function} listener - Function to be called when the event is fired
   * @param {Object} [scope = current {@link EventEmitter} instance] - Object that _this_ should be set to when the listener is called
   * @return {EventEmitter} The current EventEmitter instance to allow chaining
   */
  once: function(type, listener, scope) {
    return this.on(type, listener, scope, true);
  },

  /**
   * Removes the a listener for the specified event
   *
   * @param {String} type - Event type name the listener must have for the event to be removed
   * @param {Function} listener - Listener the event must have to be removed
   * @return {EventEmitter} The current EventEmitter instance to allow chaining
   */
  removeListener: function(type, listener) {
    if (this._events.hasOwnProperty(type)) {
      this._events[type].removeListener(listener);
    }
    return this;
  },

  /**
   * Removes all listeners for all or a specified event
   *
   * @param {String} [type] - The listeners' event type to be removed
   */
  removeAllListeners: function(type) {
    var events = this._events;
    if (!type) {
      for (var event in events) {
        if (events.hasOwnProperty(event)) {
          events[event].removeAllListeners();
        }
      }
    }
    else if (events.hasOwnProperty(type)) {
      events[type].removeAllListeners();
    }
  },

  /**
   * Unsubscribe a listener from all the events
   *
   * @param {Function} listener - Listener the event must have to be removed
   * @return {EventEmitter} The current EventEmitter instance to allow chaining
   */
  unsubscribe: function(listener) {
    var subscribers = this._subscribers;
    var i = subscribers.length - 1;
    for (; i >= 0; i--) {
      if (subscribers[i].listener === listener) {
        subscribers.splice(i, 1);
        break;
      }
    }
    return this;
  },

  /**
  * Emits an event executing all appropriate listeners.
  *
  * All values passed after the type will be passed as arguments to the listeners.
  *
  * @param {String} type - Event type name to run all listeners from
  * @param {*} args - Numerous arguments of any kind to be passed to the listener.
  * @return {EventEmitter} The current EventEmitter instance to allow chaining
  */
  emit: function(type) {
    var exists = this._events.hasOwnProperty(type),
        event  = this._events[type];

    if (!(exists && event.disabled)) {
      for (var i = 0; i < this._subscribers.length; i++) {
        var sub = this._subscribers[i];
        sub.listener.apply(sub.scope, arguments);
      }

      if (exists) {
        event.fire(Array.prototype.slice.call(arguments, 1));
      }
    }
    return this;
  },

  /**
   * Disable a particular event
   *
   * @param  {String|Event} event - The event to disable
   * @return {EventEmitter} The current EventEmitter instance to allow chaining
   */
  disable: function(event) {
    if (typeof event === 'string') {
      event = this._events[event];
    }
    event.disable();
    return this;
  },

  /**
   * Return wheter or not a given event has been fired
   *
   * @param  {String|Event} event - The given event
   * @return {Boolean}
   */
  fired: function(event) {
    if (typeof event === 'string') {
      event = this._events[event];
    }
    return event.fired();
  }

});
});

require.define("/node_modules/klass/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {"main":"./klass.js"}
});

require.define("/node_modules/klass/klass.js", function (require, module, exports, __dirname, __filename) {
/*!
  * klass: a classical JS OOP façade
  * https://github.com/ded/klass
  * License MIT (c) Dustin Diaz & Jacob Thornton 2012
  */

!function (name, definition) {
  if (typeof define == 'function') define(definition)
  else if (typeof module != 'undefined') module.exports = definition()
  else this[name] = definition()
}('klass', function () {
  var context = this
    , old = context.klass
    , f = 'function'
    , fnTest = /xyz/.test(function () {xyz}) ? /\bsupr\b/ : /.*/
    , proto = 'prototype'

  function klass(o) {
    return extend.call(isFn(o) ? o : function () {}, o, 1)
  }

  function isFn(o) {
    return typeof o === f
  }

  function wrap(k, fn, supr) {
    return function () {
      var tmp = this.supr
      this.supr = supr[proto][k]
      var ret = fn.apply(this, arguments)
      this.supr = tmp
      return ret
    }
  }

  function process(what, o, supr) {
    for (var k in o) {
      if (o.hasOwnProperty(k)) {
        what[k] = isFn(o[k])
          && isFn(supr[proto][k])
          && fnTest.test(o[k])
          ? wrap(k, o[k], supr) : o[k]
      }
    }
  }

  function extend(o, fromSub) {
    // must redefine noop each time so it doesn't inherit from previous arbitrary classes
    function noop() {}
    noop[proto] = this[proto]
    var supr = this
      , prototype = new noop()
      , isFunction = isFn(o)
      , _constructor = isFunction ? o : this
      , _methods = isFunction ? {} : o
    function fn() {
      if (this.initialize) this.initialize.apply(this, arguments)
      else {
        fromSub || isFunction && supr.apply(this, arguments)
        _constructor.apply(this, arguments)
      }
    }

    fn.methods = function (o) {
      process(prototype, o, supr)
      fn[proto] = prototype
      return this
    }

    fn.methods.call(fn, _methods).prototype.constructor = fn

    fn.extend = arguments.callee
    fn[proto].implement = fn.statics = function (o, optFn) {
      o = typeof o == 'string' ? (function () {
        var obj = {}
        obj[o] = optFn
        return obj
      }()) : o
      process(this, o, supr)
      return this
    }

    return fn
  }

  klass.noConflict = function () {
    context.klass = old
    return this
  }
  //context.klass = klass

  return klass
});
});

require.define("/lib/util/deferred.js", function (require, module, exports, __dirname, __filename) {
var StateEventEmitter = require('./state-eventemitter');


//
// Optimized event with memory for Deferreds
//
var DeferredEvent = function() {
  this.callbacks = [];
  this.args      = undefined;
  this.disabled  = false;
};

DeferredEvent.prototype.addListener = function(listener, scope) {
  if (this.fired()) {
    listener.apply(scope, this.args);
  } else {
    this.callbacks.push({
      listener : listener,
      scope    : scope
    });
  }
};

DeferredEvent.prototype.removeListener = function(listener) {
  var i = this.callbacks.length - 1;
  for (; i >= 0; i--) {
    if (this.callbacks[i].listener === listener) {
      this.callbacks.splice(i, 1);
    }
  }
};

DeferredEvent.prototype.removeAllListeners = function() {
  this.callbacks = [];
};

DeferredEvent.prototype.disable = function() {
  this.addListener = this.removeListener = this.fire = function() {};
  this.callbacks   = undefined;
  this.disabled    = true;
};

DeferredEvent.prototype.fired = function() {
  return (typeof this.args !== 'undefined');
};

DeferredEvent.prototype.fire = function(args) {
  this.fire = function() {};
  this.args = args;
  var i = 0,
      l = this.callbacks.length;
  for (; i < l; i++) {
    var callback = this.callbacks[i];
    callback.listener.apply(callback.scope, args);
  }
  this.callbacks = undefined;
};

var Deferred = module.exports = StateEventEmitter.extend({
  
  initialize: function() {
    this.supr();

    this.addEvent('rejected', DeferredEvent);
    this.addEvent('resolved', DeferredEvent);
    this.addEvent('progress');
    this.setStateSilently('progress');

    if (arguments.length > 0) {
      this.then.apply(this, arguments);
    }
  },

  //
  // Callbacks functions
  //

  then: function(callback, errback, progress) {
    var context = arguments[arguments.length - 1];

    if (typeof context === 'function')
      context = this;

    this.addCallback(callback, context)
        .addErrback(errback,   context)
        .addProgress(progress, context);

    return this;
  },

  pipe: function() {
    var deferred  = new Deferred(),
        callbacks = arguments,
        context   = arguments[arguments.length - 1];

    if (typeof context === 'function')
      context = this;

    var pipes = ['resolve', 'reject', 'progress'].map(function(action, index) {
      return (typeof callbacks[index] === 'function') ? function() {
        var returned = callbacks[index].apply(context, arguments);
        if (typeof returned === 'undefined') {
          deferred[action]();
        } else if (Deferred.isPromise(returned)) {
          returned.then(deferred.resolve, deferred.reject, deferred.progress, deferred);
        } else if (action !== 'progress') {
          if (returned instanceof Error) {
            deferred.reject(returned);
          } else {
            deferred.resolve(returned);
          }
        } else {
          deferred[action](returned);
        }
      } : function() {
        deferred[action].apply(deferred, arguments);
      }
      ;
    });

    this.then.apply(this, pipes);
    return deferred;
  },

  always: function() {
    this.addCallback.apply(this, arguments)
        .addErrback.apply(this, arguments);

    return this;
  },

  addCallback: function(callback, context) {
    if (typeof callback === 'function')
      this.on('resolved', callback, context || this);
    return this;
  },

  addErrback: function(errback, context) {
    if (typeof errback === 'function')
      this.on('rejected', errback, context || this);
    return this;
  },

  addProgress: function(progress, context) {
    if (typeof progress === 'function')
      this.on('progress', progress, context || this);
    return this;
  },

  //
  // Firing functions
  //

  resolve: function() {
    this.disable('rejected');
    this._complete('resolved', arguments);
    return this;
  },

  reject: function() {
    this.disable('resolved');
    this._complete('rejected', arguments);
    return this;
  },

  _complete: function(state, args) {
    // Deactivate firing functions
    var self = this;
    this.resolve = this.reject = this.progress = function() {
      return self;
    };

    // Free the progress event
    this.disable('progress');
    
    // Fire the event chain
    args = Array.prototype.slice.call(args);
    args.unshift(state);
    this.setState.apply(this, args);
  },

  progress: function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('progress');
    this.emit.apply(this, args);
    return this;
  },

  //
  // Helpers
  //

  getResolvePassedArgs: function() {
    if (!this.isResolved()) {
      throw new Error('not resolved');
    } else {
      return this._events.resolved.args;
    }
  },

  getRejectPassedArgs: function() {
    if (!this.isRejected()) {
      throw new Error('not rejected');
    } else {
      return this._events.rejected.args;
    }
  },

  isCompleted: function() {
    return (
      this.fired('resolved') ||
      this.fired('rejected')
    );
  },

  isResolved: function() {
    return this.stateIs('resolved');
  },

  isRejected: function() {
    return this.stateIs('rejected');
  },

  inProgress: function() {
    return this.stateIs('progress');
  },

  cancel: function() {
    this.disable('resolved');
    this.disable('rejected');
  }

}).statics({
  
  /**
   * Static function which accepts a promise object
   * or any kind of object and returns a promise.
   * If the given object is a promise, it simply returns
   * the same object, if it's a value it returns a
   * new resolved deferred object
   *
   * @param  {Object} promise Promise or value
   * @return {Deferred}
   */
  when: function(promise) {
    if (this.isPromise(promise))
      return promise;

    return new Deferred().resolve(promise);
  },

  //
  // Inspired by when.js from Brian Cavalier
  //
  whenAtLeast: function(promises, toResolve) {
    toResolve    = Math.max(1, Math.min(toResolve || 1, promises.length));

    var deferred = new Deferred(),
        promisesLeft = promises.length,
        resolved = [],
        rejected = [];

    var finish = function() {
      if (--promisesLeft === 0) {
        if (resolved.length >= toResolve) {
          deferred.resolve(resolved, rejected);
        } else {
          deferred.reject(resolved, rejected);
        }
      }
    };

    var failure = function() {
      rejected.push(this);
      finish();
    };

    var success = function() {
      resolved.push(this);
      finish();
    };

    for (var i = 0; i < promises.length; i++) {
      Deferred.when(promises[i])
              .then(success.bind(promises[i]), failure.bind(promises[i]), deferred.progress);
    }
    return deferred;
  },
  
  whenAll: function(promises) {
    return Deferred.whenSome(promises, promises.length);
  },

  whenSome: function(promises, toResolve) {
    var results  = [],
        deferred = new Deferred();

    toResolve = Math.max(0, Math.min(toResolve, promises.length));
    var success = function() {
      var index = promises.indexOf(this);
      results[index] = Array.prototype.slice.call(arguments);
      if (--toResolve === 0) {
        deferred.resolve.apply(deferred, results);
      }
    };

    if (toResolve === 0) {
      deferred.resolve.apply(deferred, results);
    } else {
      for (var i = 0; i < promises.length; i++) {
        Deferred.when(promises[i])
                .then(success.bind(promises[i]), deferred.reject, deferred.progress);
      }
    }
    return deferred;
  },

  whenMap: function(promises, map) {
    var results  = [],
        deferred = new Deferred(),
        total    = promises.length,
        success;
        
    success = function() {
      var index = promises.indexOf(this);
      results[index] = map.apply(this, arguments);
      if (--total === 0) {
        deferred.resolve(results);
      }
    };

    for (var i = 0, l = promises.length; i < l; i++) {
      Deferred.when(promises[i])
              .then(success.bind(promises[i]), deferred.reject, deferred.progress);
    }
    return deferred;
  },

  isPromise: function(promise) {
    return promise && typeof promise.then === 'function';
  }

});
});

require.define("/lib/util/crypto.js", function (require, module, exports, __dirname, __filename) {
/*
 * Crypto-JS v2.5.3
 * http://code.google.com/p/crypto-js/
 * Copyright (c) 2011, Jeff Mott. All rights reserved.
 * http://code.google.com/p/crypto-js/wiki/License
 */

var Crypto = module.exports = {
  // Bit-wise rotate left
  rotl: function (n, b) {
    return (n << b) | (n >>> (32 - b));
  },

  // Bit-wise rotate right
  rotr: function (n, b) {
    return (n << (32 - b)) | (n >>> b);
  },

  // Swap big-endian to little-endian and vice versa
  endian: function (n) {
    // If number given, swap endian
    if (n.constructor == Number) {
      return Crypto.rotl(n, 8) & 0x00FF00FF | Crypto.rotl(n, 24) & 0xFF00FF00;
    }

    // Else, assume array and swap all items
    for (var i = 0; i < n.length; i++)
      n[i] = Crypto.endian(n[i]);
    return n;
  },

  // Generate an array of any length of random bytes
  randomBytes: function (n) {
    for (var bytes = []; n > 0; n--)
      bytes.push(Math.floor(Math.random() * 256));
    return bytes;
  },

  // Convert a byte array to big-endian 32-bit words
  bytesToWords: function (bytes) {
    for (var words = [], i = 0, b = 0; i < bytes.length; i++, b += 8)
      words[b >>> 5] |= bytes[i] << (24 - b % 32);
    return words;
  },

  // Convert big-endian 32-bit words to a byte array
  wordsToBytes: function (words) {
    for (var bytes = [], b = 0; b < words.length * 32; b += 8)
      bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF);
    return bytes;
  },

  // Convert a byte array to a hex string
  bytesToHex: function (bytes) {
    for (var hex = [], i = 0; i < bytes.length; i++) {
      hex.push((bytes[i] >>> 4).toString(16));
      hex.push((bytes[i] & 0xF).toString(16));
    }
    return hex.join("");
  },

  // Convert a hex string to a byte array
  hexToBytes: function (hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
      bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
  },

  /**
   * Compares two bytes array and tell which
   * one is greater than the other.
   * It is possible to use this function with
   * `Array.prototype.sort`
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/sort
   *
   * @param  {Array} a Bytes array
   * @param  {Array} b Bytes array
   * @return {-1|0|1}
   */
  compareBytes: function(a, b, xor) {
    var i, l,
        byte_a, byte_b;
    if (typeof xor !== 'undefined') {
      for (i = 0, l = a.length; i < l; i++) {
        byte_a = a[i] ^ xor[i];
        byte_b = b[i] ^ xor[i];
        if (byte_a[i] > byte_b[i])      return 1;
        else if (byte_a[i] < byte_b[i]) return -1;
      }
    } else {
      for (i = 0, l = a.length; i < l; i++) {
        if (a[i] > b[i])      return 1;
        else if (a[i] < b[i]) return -1;
      }
    }
    return 0;
  },

  compareHex: function(a, b, xor) {
    var c, l,
        byte_a, byte_b, byte_x;
    if (typeof xor !== 'undefined') {
      for (c = 0, l = a.length; c < l; c += 2) {
        byte_x = parseInt(xor.substr(c, 2), 16);
        byte_a = parseInt(a.substr(c, 2), 16) ^ byte_x;
        byte_b = parseInt(b.substr(c, 2), 16) ^ byte_x;
        if (byte_a > byte_b)      return 1;
        else if (byte_a < byte_b) return -1;
      }
    } else {
      for (c = 0, l = a.length; c < l; c += 2) {
        byte_a = parseInt(a.substr(c, 2), 16);
        byte_b = parseInt(b.substr(c, 2), 16);
        if (byte_a > byte_b)      return 1;
        else if (byte_a < byte_b) return -1;
      }
    }
    return 0;
  },

  /**
   * Return the position of the first different bit
   * between two hexadecimal strings
   *
   * @param {String} hex1 the first hexadecimal string
   * @param {String} hex2 the second hexadecimal string
   * @return {Integer} the position of the bit
   * @see http://jsperf.com/integral-binary-logarithm/3
   */
  distance: function(hex1, hex2, bytes) {
    if (bytes === true) {
      hex1 = Crypto.bytesToHex(hex1);
      hex2 = Crypto.bytesToHex(hex2);
    }

    if (hex1 === hex2) {
      return 0;
    }

    var length = hex1.length,
        diff   = 0;
    if (hex2.length !== length) {
      throw new TypeError('different length string', hex1, hex2);
    }

    for (var c = 0; c < length; c+=2) {
      diff = parseInt(hex1.substr(c, 2), 16) ^ parseInt(hex2.substr(c, 2), 16);
      if (diff > 0)
        return 4*(length - c) + Math.floor(Math.log(diff) / Math.LN2) - 7;
    }
    return 0;
  }
};


Crypto.charenc = {};
Crypto.charenc.Binary = {

  // Convert a string to a byte array
  stringToBytes: function (str) {
    for (var bytes = [], i = 0; i < str.length; i++)
    bytes.push(str.charCodeAt(i) & 0xFF);
    return bytes;
  },

  // Convert a byte array to a string
  bytesToString: function (bytes) {
    for (var str = [], i = 0; i < bytes.length; i++)
    str.push(String.fromCharCode(bytes[i]));
    return str.join("");
  }

};

Crypto.charenc.UTF8 = {

  // Convert a string to a byte array
  stringToBytes: function (str) {
    return Crypto.charenc.Binary.stringToBytes(unescape(encodeURIComponent(str)));
  },

  // Convert a byte array to a string
  bytesToString: function (bytes) {
    return decodeURIComponent(escape(Crypto.charenc.Binary.bytesToString(bytes)));
  }

};

// Digest (SHA1)

Crypto.digest = {

  SHA1: function(message) {
    var digestbytes = Crypto.wordsToBytes(Crypto.digest._sha1(message));
    return Crypto.bytesToHex(digestbytes);
  },

  randomSHA1: function(id, range) {
    var bytes = [];
    var index = 0;

    if (id) {
      var distance;
      if (typeof range.min === 'number' &&
          typeof range.max === 'number') {
        distance = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      }
      else if (typeof range === 'number') {
        distance = range;
      }

      if (distance && distance > 0) {
        bytes = Crypto.hexToBytes(id);
        index = Math.floor(20 - distance / 8);

        var pow = (distance - 1) % 8;
        var max = Math.pow(2, pow + 1) - 1;
        var min = Math.pow(2, pow);
        bytes[index] ^= Math.floor(Math.random() * (max - min + 1)) + min;
        
        index += 1;
      }
      else {
        return id;
      }
    }

    for (; index < 20; index++) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
    return Crypto.bytesToHex(bytes);
  },

  _sha1: function (message) {
    // Convert to byte array
    if (message.constructor == String) message = Crypto.charenc.UTF8.stringToBytes(message);

    /* else, assume byte array already */
    var m  = Crypto.bytesToWords(message),
    l  = message.length * 8,
    w  =  [],
    H0 =  1732584193,
    H1 = -271733879,
    H2 = -1732584194,
    H3 =  271733878,
    H4 = -1009589776;

    // Padding
    m[l >> 5] |= 0x80 << (24 - l % 32);
    m[((l + 64 >>> 9) << 4) + 15] = l;

    for (var i = 0; i < m.length; i += 16) {

      var a = H0,
          b = H1,
          c = H2,
          d = H3,
          e = H4;

      for (var j = 0; j < 80; j++) {

        if (j < 16) w[j] = m[i + j];
        else {
          var n = w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16];
          w[j] = (n << 1) | (n >>> 31);
        }

        var t = ((H0 << 5) | (H0 >>> 27)) + H4 + (w[j] >>> 0) + (
          j < 20 ? (H1 & H2 | ~H1 & H3) + 1518500249 :
          j < 40 ? (H1 ^ H2 ^ H3) + 1859775393 :
          j < 60 ? (H1 & H2 | H1 & H3 | H2 & H3) - 1894007588 :
                   (H1 ^ H2 ^ H3) - 899497514);

        H4 =  H3;
        H3 =  H2;
        H2 = (H1 << 30) | (H1 >>> 2);
        H1 =  H0;
        H0 =  t;

      }

      H0 += a;
      H1 += b;
      H2 += c;
      H3 += d;
      H4 += e;

    }

    return [H0, H1, H2, H3, H4];
  }

};
});

require.define("/lib/util/peerarray.js", function (require, module, exports, __dirname, __filename) {
var klass   = require('klass'),
    Peer    = require('../dht/peer');

var PeerArray = module.exports = klass({

  initialize: function(peers) {
    this.array = [];
    if (peers) {
      this.add(peers);
    }
  },

  //
  // Mutator methods
  //

  add: function(peers) {
    var that = this;
    peers.forEach(function(peer) {
      that.addPeer(peer);
    });
    return this;
  },

  addPeer: function(peer) {
    peer = (peer instanceof Peer) ? peer : new Peer(peer);
    if (!this.contains(peer)) {
      this.array.push(peer);
    }
    return this;
  },

  remove: function(rmPeers) {
    this.array = this.array.filter(function(peer) {
      return rmPeers.every(function(rmPeer) {
        return !(rmPeer.equals(peer));
      });
    });
    return this;
  },

  removePeer: function (rmPeer) {
    var index = this.find(rmPeer);
    if (~index)
      this.array.splice(index, 1);
    
    return this;
  },

  move: function(oldIndex, newIndex) {
    if (newIndex < 0 || newIndex >= this.size())
      throw new RangeError('new index out of range');

    this.array.splice(newIndex, 0, this.array.splice(oldIndex, 1)[0]);
    return this;
  },

  sort: function(compareFn) {
    this.array.sort(compareFn);
    return this;
  },

  //
  // Accessor Methods
  //

  toArray: function() {
    return this.array;
  },

  getTripleArray: function() {
    return this.array.map(function(peer) {
      return peer.getTriple();
    });
  },

  getPeer: function(index) {
    if (index instanceof Peer) {
      index = this.find(index);
      if (index === -1)
        throw new ReferenceError('this peer does not exist');
    } else {
      if (index < 0 || index >= this.size())
        throw new RangeError(index + ' out of range');
    }
    return this.array[index];
  },

  size: function() {
    return this.array.length;
  },

  find: function(peer) {
    var i = this.array.indexOf(peer);
    if (~i) {
      return i;
    } else {
      var l = this.size();
      for (i = 0; i < l; i++)
        if (peer.equals(this.array[i]))
          return i;
    }
    return -1;
  },

  contains: function(sample) {
    if (sample instanceof Peer) {
      return (this.find(sample) !== -1);
    }

    var that = this;
    return sample.every(function(samplePeer) {
      return that.array.some(function(peer) {
        return peer.equals(samplePeer);
      });
    });
  },

  equals: function(peers) {
    peers = (peers instanceof PeerArray) ? peers : (new PeerArray(peers));
    return this.contains(peers) && peers.contains(this);
  },

  empty: function() {
    return this.array.length === 0;
  },

  join: function(separator) {
    return this.array.join(separator);
  },

  clone: function(array) {
    if (array || array === null) {
      var clone = new this.constructor();
      clone.array = array || [];
      for (var prop in this) {
        if (this.hasOwnProperty(prop) && !Array.isArray(this[prop]))
          clone[prop] = this[prop];
      }
      return clone;
    } else {
      return this.clone(this.array.slice());
    }
  },

  union: function(peers) {
    return this.clone().add(peers);
  },

  difference: function(peers) {
    var clone = this.clone();
    if (peers instanceof Peer) {
      clone.removePeer(peers);
    } else {
      clone.remove(peers);
    }
    return clone;
  },

  first: function(number, iterator) {
    if (!number) {
      number = 1;
    } else if (typeof number === 'function') {
      iterator = number;
      number = 1;
    }

    if (iterator) {
      var clone = this.clone(null),
          i = 0, r = 0, l = this.size();
      while (r < number && i < l) {
        if (iterator.call(null, this.array[i]) === true) {
          clone.addPeer(this.array[i]);
          r++;
        }
        i++;
      }
      return clone;
    } else {
      return this.clone(this.array.slice(0, number));
    }
  },

  //
  // Iteration methods
  //

  forEach: function(iterator, context) {
    this.array.forEach(iterator, context);
    return this;
  },

  map: function(iterator, context) {
    return this.array.map(iterator, context);
  },

  reduce: function(iterator, context) {
    return this.array.reduce(iterator, context);
  },

  filter: function(iterator, context) {
    return this.clone(this.array.filter(iterator, context));
  },

  some: function(iterator, context) {
    return this.array.some(iterator, context);
  },

  every: function(iterator, context) {
    return this.array.every(iterator, context);
  },

  // -- DEPRECATED --
  sendThemFindRPC : function(iter_lookup) {
    iter_lookup.sendFindRPC(this);
    return this;
  }

});
});

require.define("/lib/dht/peer.js", function (require, module, exports, __dirname, __filename) {
var klass   = require('klass'),
    Crypto  = require('../util/crypto'),
    globals = require('../globals');

var Peer = module.exports = klass({

  /**
   * Peer constructor
   *
   * @param {String|Array} address Address of the Peer or tuple representation
   * @param {String}       id      ID of the Peer
   */
  initialize: function() {
    var args  = arguments;

    if (Array.isArray(args[0])) {
      args  = args[0];
    }

    this.touch();
    this._distance = null;
    this._address  = args[0];
    this._id       = args[1];

    if (!this._validateID(this._id)) {
      throw new Error('non valid ID');
    }
  },

  //
  // Public
  //

  touch: function() {
    this._lastSeen = new Date().getTime();
    return this;
  },

  setID: function(id) {
    this._id = id;
  },

  setAddress: function(address) {
    this._address = address;
  },

  getLastSeen: function() {
    return this._lastSeen;
  },

  getID: function() {
    return this._id;
  },

  cacheDistance: function(id) {
    this._distance = this._distance || this.getDistanceTo(id);
    return this;
  },

  getDistance: function() {
    return this._distance;
  },

  getDistanceTo: function(id) {
     return Crypto.distance(this.getID(), id);
  },

  getAddress: function() {
    return this._address;
  },

  getTriple: function() {
    return [this._address, this._id];
  },

  equals: function(peer) {
    return (this._id === peer.getID());
  },

  toString: function() {
    return '<' + this._address + '#' + this._id + '>';
  },

  //
  // Private
  //

  _validateID: function(id) {
    return typeof id === 'string' && globals.REGEX_NODE_ID.test(id);
  },

  _generateID: function() {
    //return globals.DIGEST(this._address);
    return Crypto.digest.randomSHA1();
  }

});
});

require.define("/lib/globals.js", function (require, module, exports, __dirname, __filename) {
module.exports = {

  // Maximum number of contacts in a k-bucket
  K: 8,

  // Degree of parallelism for network calls
  ALPHA: 3,

  // The number of triple to put in a response
  BETA: 8,

  // Size of the space in bits
  B: 160,

  // Implemented RPCs
  RPCS: [
    'PING',
    'FIND_NODE',
    'FIND_VALUE',
    'STORE'
  ],
  
  // Request timeout in milliseconds
  TIMEOUT_RPC: 5 * 1000,

  // Refresh timeout for kbuckets in milliseconds
  TIMEOUT_REFRESH: 3600 * 1000,

  // Readujst the timeout refresh around a random window, in percent
  TIMEOUT_REFRESH_WINDOW: 0.1,

  // Expire timeout for key-value in milliseconds
  TIMEOUT_EXPIRE: 24 * 3600 * 1000,

  // republish timeout for key-value in milliseconds
  TIMEOUT_REPUBLISH: 3600 * 1000,

  // Readujst the timeout republish around a random window, in percent
  TIMEOUT_REPUBLISH_WINDOW: 0.1,

  // Default transport server or proxy
  // https://www.draugr.de/bosh
  // http://bosh.melo.fr.nf/http-bind
  // https://jabber.kiev.ua:5281/http-bind
  // http://jaim.at:5280/http-bind
  // http://jwchat.org/JHB/
  // https://www.jappix.com/bind
  // http://bosh.metajack.im:5280/xmpp-httpbind
  // ...
  BOSH_SERVER: 'http://bosh.melo.fr.nf/http-bind',

  // Default protocol: jsonrpc2, xmlrpc, ...
  PROTOCOL: 'xmlrpc',

  // Interval for cleanup of the Reactor's RPCs in milliseconds
  CLEANUP_INTERVAL: 30 * 1000,

  // Interval to compute a new adaptive timeout value
  ADAPTIVE_TIMEOUT_INTERVAL: 5 * 1000,

  // ID validator: B/4 hexadecimal characters
  REGEX_NODE_ID: /^[0-9a-fA-F]{40}$/,

  // The resource of the JabberID for KadOH
  JID_RESOURCE: 'kadoh'

};
});

require.define("/lib/util/xorsorted-peerarray.js", function (require, module, exports, __dirname, __filename) {
var SortedPeerArray = require('./sorted-peerarray'),
    Crypto          = require('./crypto');
    Peer            = require('../dht/peer')

var XORSortedPeerArray = module.exports = SortedPeerArray.extend({
  
  initialize: function(peers, relative) {
    if (relative) {
      this.setRelative(relative);
    }
    this.supr(peers);
  },

  setRelative: function(relative) {
    this._relative = (relative instanceof Peer) ? relative.getID() : relative;
    return this;
  },

  _insertionSort: function(newPeer) {
    if (!this._relative) throw new Error('no relative node id');
    return this.supr(newPeer);
  },

  compareFn: function(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return Crypto.compareHex(a.getID(), b.getID(), this._relative);
  }

});
});

require.define("/lib/util/sorted-peerarray.js", function (require, module, exports, __dirname, __filename) {
var PeerArray = require('./peerarray'),
    Peer      = require('../dht/peer');

var SortedPeerArray = module.exports = PeerArray.extend({
  
  initialize: function(peers) {
    this._newClosestIndex = -1;
    this.supr(peers);
  },

  add: function(peers) {
    var newIndex = Infinity;
    peers.forEach(function(peer) {
      var index = this._insertionSort(peer);
      if (index !== -1) {
        newIndex = Math.min(newIndex, index);
      }
    }, this);
    this._newClosestIndex = isFinite(newIndex) ? newIndex : -1;
    return this;
  },

  addPeer: function(peer) {
    this._newClosestIndex = this._insertionSort(peer);
    return this;
  },

  sort: function() {
    this.supr(this.compareFn);
  },

  compare: function(compare) {
    this.compareFn = compare;
    return this;
  },

  newClosest: function() {
    return this._newClosestIndex === 0;
  },

  newClosestIndex: function() {
    return this._newClosestIndex;
  },

  _insertionSort: function(peer) {
    if (!(peer instanceof Peer)) {
      peer = new Peer(peer);
    }
    var i = -1, diff = 0, l = this.size();
    do {
      diff = this.compareFn(peer, this.array[++i]);
      if (diff === 0) return -1;
    } while (diff > 0 && i < l);

    this.array.splice(i, 0, peer);
    return i;
  },

  compareFn: function(a, b) {
    return a - b;
  }

});
});

require.define("/lib/util/iterative-deferred.js", function (require, module, exports, __dirname, __filename) {
var Deferred  = require('./deferred');

var IterativeDeferred = module.exports = Deferred.extend({
  initialize: function(to_map) {
    this.supr();
    this.to_map = to_map;
    this._started = false;

    this._onFly = 0;
    this._mapped = [];
    this._resolved = [];
    this._rejected = [];
    this._reduceBuffer = [];
    this._endShouldBeLaunched = false;
  },

  /**
   * Functional programming: easy setter for the map function.
   *
   *   | The map function, to be defined: should map a key to a deferred object.
   *   | Should return a deferred object that will be registered: the iterative
   *   | process won't stop until all registered deferred are completed or a
   *   | manual intervention.
   *   |
   *   | If the key has already been mapped, the mapping will be ignored. To test
   *   | equality between key, @see #equalTestFn.
   *   |
   *   | @param  {object} key - key to map to a Deferred
   *   | @return {undefined | Deferred} mapped Deferred
   *
   * @param  {Function} mapFn [description]
   */
  map: function(mapFn) {
    this.mapFn = mapFn;

    //directly start if anything to map
    if (this.to_map)
      this.start();
    return this;
  },

  /**
   * Set itinial reduce value.
   *
   * @param  {*} init_value
   */
  init: function(init_value) {
    this._currentReduceResult = init_value;
    return this;
  },

  /**
   * Functional programming: easy setter for the reduce function:
   *
   *   | The reduce function, to be defined: should combine resolved result from
   *   | mapped deferred and the previous reduce result. It can feed the mapping
   *   | process with keys to map, by calling the map argument function.
   *   | If the deferred resolved multiple arguments, the additional arguments are
   *   | present.
   *   | At any moment the iterative process can be stopped manually just by
   *   | completing the working process as deferred: simply call `this.resolve` or
   *   | `this.reject`.
   *   | The end arguments key, resolved and rejected are if needed to decide the
   *   | reduce process.
   *   | @param  {*}     previous - previously returned by the reduce function
   *   | @param  {*}       result - the result resolved by the mapped Deferred
   *   | @param  {*} [additional] - if the resolve callback was called with multiple
   *   |                            arguments, additional arguments are present
   *   | @param  {function}   map - use this function to feed the mapping process with
   *   |                            new keys
   *   | @param  {object}     key - original mapping key whose deferred produced the
   *   |                            given resolved result
   *   | @param  {array} resolved - array of keys which mapped Deferred have been resolved
   *   | @param  {array} rejected - array of keys which mapped Deferred have been rejected
   *   | @return {*} reduce result
   *
   * @param {function} reduceFn -  see above
   * @param {*}    initialValue - initial reduce value
   */
  reduce: function(reduceFn, initialValue) {
    this.reduceFn = reduceFn;

    if (initialValue)
      this.init(initialValue);

    //if waiting reduces in buffer, empty it :
    while (this._reduceBuffer.length >0) {
      var args = this._reduceBuffer.shift();
      this._launchReduce.apply(this, args);
    }

    return this;
  },

  /**
   * Functionnal programming: easy setter for the end function.
   *
   *   | The end function, will be called when the iterative process ends, ie. there
   *   | is no more uncompleted mapped Deferred and all reduce processes are finished.
   *   |
   *   | The end function should complete the process by calling `this.resolve` or
   *   | `this.reject`. If this is not done, the process will be automatically resolved.
   *   |
   *   | @param {*} reduce_result - what finally came out the reduce process
   *   | @param {function}    map - use this function to feed the mapping process with
   *   |                            new keys if you want to relaunch the process again
   *   | @param {array}  resolved - array of keys which mapped Deferred have been resolved
   *   | @param {array}  rejected - array of keys which mapped Deferred have been rejected
   *
   * @param  {function} endFn [description]
   */
  end: function(endFn) {
    this.endFn = endFn;

    //it's over : launch immediatly end
    if (this._endShouldBeLaunched)
      this._launchEnd();

    return this;
  },

  /**
   * Start the iterative map/reduce given the this array of
   * map consumable.
   *
   * @param  {Array<key>} array [description]
   */
  start: function(array) {
    if (this._started)
      return this;
    this._started = true;

    if (array)
      this.to_map = array;

    var to_map = this.to_map;
    var length = to_map.length || to_map.size();
    if (length !== 0) {
      //go !
      this.to_map.forEach(function(key) {
        this._launchMap(key);
      }, this);
    } else {
      this._launchEnd();
    }
    return this;
  },

  /**
   * Test the equality of 2 keys.
   *
   * Used to determine if a key has already been mapped. Use an #equals method if
   * present. Else use the result of `===`.
   *
   * @param  {*} key1
   * @param  {*} key2
   * @return {boolean} result
   */
  equalTestFn: function(key1, key2) {
    return (typeof key1.equals === 'function') ?
            key1.equals(key2)
          : key1 === key2;
  },

  _launchMap: function(key) {

    //if the key has alreday been mapped
    var already = this._mapped.some(function(key2) {
      return this.equalTestFn(key, key2);
    }, this);

    if (already) {
      return false;
    }

    this._mapped.push(key);

    //call the map function and get the deferred
    var def = this.mapFn(key);

    if (!def) return true;
    def = Deferred.when(def);

    //we've got a new deferred on the fly
    this._onFly ++;

    function callback() {
      this._onFly --;
      if (!this.isCompleted()) {
        //add to resolved
        this._resolved.push(key);
        //reduce result
        this._launchReduce(key, arguments);
      }
    }

    function errback() {
      this._onFly --; 
      if (!this.isCompleted()) {
        //add to rejected
        this._rejected.push(key);
        //end ?
        this._checkFinish();
      }
    }

    //on deferred resolve or reject, decrement
    def.then(callback, errback, this);
    return true;
  },

  _launchReduce: function(key, result) {
    //if the reduce function is not yet defined, put in a buffer for later
    if (!this.reduceFn) {
      this._reduceBuffer.push(arguments);
      return;
    }

    var reduce_args = [],
        i, l, that = this;

    //add previous reduce result
    reduce_args.push(this._currentReduceResult);
    //add resolve result of the mapped deferred
    for (i = 0, l = result.length; i < l; i++) { reduce_args.push(result[i]); }
    reduce_args.push(function map(key) {
      return that._launchMap(key);
    });
    //add the key that produced result
    reduce_args.push(key);
    //add current resolved key
    reduce_args.push(this._resolved);
    //add current rejected key
    reduce_args.push(this._rejected);

    //call reduce
    this._currentReduceResult = this.reduceFn.apply(this, reduce_args);

    //end ?
    this._checkFinish();
  },

  _launchEnd: function() {
    this._endShouldBeLaunched = true;

    if (this.endFn) {
      var toMap = [];
      var map = function(key) { toMap.push(key); };
      this.endFn(this._currentReduceResult, map, this._resolved, this._rejected);

      // if we have to relaunch a mapping
      if (toMap.length) {
        for (var i = 0, l = toMap.length; i < l; i++) {
          this._launchMap(toMap[i]);
        }
      } else if (!this.isCompleted()) {
        //force the completion of the process if endFn didn't do it
        this.resolve(this._currentReduceResult);
      }
      
    }
  },

  _checkFinish: function() {
    if (this._onFly === 0 && this._reduceBuffer.length === 0 && !this.isCompleted()) {
      this._launchEnd();
    }
  }
});
});

require.define("/lib/dht/routing-table.js", function (require, module, exports, __dirname, __filename) {
var EventEmitter      = require('../util/eventemitter'),
    Crypto            = require('../util/crypto'),
    globals           = require('../globals.js'),
    
    KBucket           = require('./kbucket'),
    Peer              = require('./peer'),
    PeerArray         = require('../util/peerarray'),

    log               = require('../logging').ns('RoutingTable');


/**
 * Represents the routing table of a {@link Node}.
 * @name RoutingTable
 * @augments EventEmitter
 * @class
 */
var RoutingTable = module.exports = EventEmitter.extend(
  /** @lends RoutingTable# */
  {
  /**
   * Construct an instance of a {@link RoutingTable} associated to the instance of {@link Node} passed as parameter.
   * @xclass Represents the routing table of a {@link Node}.
   * @xaugments EventEmitter
   * @constructs
   * @param {Node} node - Associated node.
   */
  initialize: function(node) {
    this.supr();
    this._node = node;
    this._parentID = ('string' === typeof node) ? node : node.getID();
    this._kbuckets = [new KBucket(this)];
  },

  // Public

  /**
   * Start the routing table engine :
   *   - start all refreshTimeouts for KBuckets
   * @return {this}
   */
  start: function() {
    this.stop();
    for (var i = 0, l = this._kbuckets.length; i < l; i++) {
      this._kbuckets[i].setRefreshTimeout();
    }
  },
  
  /**
   * Stop the routing table engine :
   *   - stop all refreshTimout for KBuckets
   * @return {this}
   */
  stop: function() {
    for (var i = 0, l = this._kbuckets.length; i < l; i++) {
      this._kbuckets[i].stopRefreshTimeout();
    }
    return this;
  },

  /**
   * Calculates the distance from 0 to B-1 between the parent `id` and the given `key`.
   * These keys are SHA1 hashes as hexadecimal `String`
   * @see {@link Crypto#distance}
   *
   * @param {String} key
   * @return {String} distance between the two keys
   * @public
   */
  distance: function(peer) {
    var dist;
    if (peer instanceof Peer) {
      dist = peer.getDistance();
      if (!dist) {
        peer.cacheDistance(this._parentID);
        dist = peer.getDistance();
      }
    } else {
      dist = Crypto.distance(this._parentID, peer);
    }
    return dist;
  },

  /**
   * Add multiple peers to the routing table
   *
   * @param {Peer[]} peers List of peers to add to the table
   */
  add: function(peers) {
    peers.forEach(function(peer) {
      this.addPeer(peer);
    }, this);
    return this;
  },

  /**
   * Add a peer to the routing table or update it if its already in.
   *
   * @param {Peer} peer object to add
   * @return {Void}
   * @public
   */
  addPeer: function(peer) {
    if (peer.getID() === this._parentID) {
      return;
    }

    peer.cacheDistance(this._parentID);

    var index   = this._kbucketIndexFor(peer),
        kbucket = this._kbuckets[index];

    // find the kbucket for the peer
    try {
      kbucket.addPeer(peer);
      log.debug( 'add peer', peer.getAddress(), peer.getID());
      this.emit('added', peer);
    } catch(e) {
      // if the kbucket is full and splittable
      if (e === 'split') {
        var range = kbucket.getRange();
        this._kbuckets.push(kbucket.split());
        this.emit('splitted');
        log.debug('split kbucket', range, kbucket.getRange());
        this.addPeer(peer);
      } else {
        throw e;
      }
    }
    return this;
  },

  /**
   * Get the `number` closest peers from a given `id`
   * but ignore the specified ones in an Array
   *
   * @param {String} id
   * @param {Number} [number = {@link globals.ALPHA}] The number of peers you want
   * @param {String[] | Peer[]} exclude Array of ids or peers to exclude
   */
  getClosePeers: function(id, number, exclude) {
    if (typeof number !== 'number') {
      number = globals.BETA;
    }
    
    // get the default kbucket for this id
    var index         = this._kbucketIndexFor(id),
        kbuckets_left = this.howManyKBuckets() - 1,
        peers         = new PeerArray();

    peers.add(this._kbuckets[index].getPeers(number, exclude));

    // if we don't have enough peers in the default kbucket
    // try to find other ones in the closest kbuckets
    if (peers.size() < number && kbuckets_left > 0) {
      var indexes_path = [],
          i;

      // build an array which values are the kbuckets index
      // sorted by their distance with the default kbucket
      for (i = 0; i < this.howManyKBuckets(); i++) {
        if (i !== index) {
          indexes_path.push(i);
        }
      }

      if (index > 1) {
        indexes_path.sort(function(a, b) {
          var diff = Math.abs(a - index) - Math.abs(b - index);
          if (diff < 0)
            return -1;
          else if (diff > 0)
            return 1;
          return 0;
        });
      }

      // read through the sorted kbuckets and retrieve the closest peers
      // until we get the good amount
      i = 0;
      while (peers.size() < number && (index = indexes_path[i++])) {
        peers.add(this._kbuckets[index].getPeers(number - peers.size(), exclude));
      }
    }
    
    return peers;
  },

  getPeer: function(peer) {
    peer = this._kbucketFor(peer).getPeer(peer);
    if (peer) {
      return peer;
    }
    return false;
  },

  removePeer: function(peer) {
    return this._kbucketFor(peer).removePeer(peer);
  },

  getKBuckets: function() {
    return this._kbuckets;
  },

  howManyKBuckets: function() {
    return this._kbuckets.length;
  },

  howManyPeers: function() {
    return this._kbuckets.reduce(function(sum, kbucket) {
      return sum + kbucket.size();
    }, 0);
  },

  getParentID: function() {
    return this._parentID;
  },

  // Private

  /**
   * Find the appropriate KBucket index for a given key
   *
   * @param {String} key SHA1 hash
   * @return {Integer} index for the `_kbuckets`
   * @private
   */
  _kbucketIndexFor: function(peer) {
    var dist = this.distance(peer);
    // if the id is our id, return the splittable kbucket
    if (dist === 0) {
      return this._kbuckets.length - 1;
    }
    // find the kbucket with the distance in range
    for (var i = 0; i < this._kbuckets.length; i++) {
      if (this._kbuckets[i].distanceInRange(dist)) {
        return i;
      }
    }
    return -1;
  },

  _kbucketFor: function(peer) {
    var index = this._kbucketIndexFor(peer);
    if (index !== -1)
      return this._kbuckets[index];
    return false;
  },

  /**
   * Exports the routing table to a serializable object
   *
   * @param {Object}  [options] options hash
   * @param {Boolean} [options.include_lastseen] If true the last_seen
   * paramter will be included in peer triple array
   *
   * @param {Boolean} [options.include_distance] If true the distance
   * paramter will be included in peer triple array
   *
   * @return {Object}
   */
  exports: function(options) {
    var refresh  = Infinity;
    var kbuckets = this._kbuckets.map(function(kbucket) {
      var object = kbucket.exports(options);
      refresh = Math.min(refresh, object.refresh);
      return object;
    });
    return {
      id       : this._parentID,
      kbuckets : kbuckets,
      refresh  : refresh
    };
  },

  /**
   * Imports a previously exported routing table
   * and returns true if the process succeeded
   *
   * @param  {Object} routing_table
   * @return {Boolean}
   */
  imports: function(routing_table) {
    if (routing_table.id !== this._parentID) {
      return false;
    }
    var now = new Date().getTime();
    if (routing_table.refresh < now) {
      return false;
    }

    try {
      var kbuckets = routing_table.kbuckets;
      for (var i = 0, l = kbuckets.length; i < l; i++) {
        var kbucket = new KBucket();
        if (!kbucket.imports(kbuckets[i])) {
          throw new Error();
        }
        this._kbuckets[i] = kbucket;
      }
      return true;
    } catch(e) {
      log.fatal( 'failed to import', routing_table);
      return false;
    }
  }

});
});

require.define("/lib/dht/kbucket.js", function (require, module, exports, __dirname, __filename) {
var PeerArray = require('../util/peerarray'),
    globals   = require('../globals'),
    Crypto    = require('../util/crypto');


var KBucket = module.exports = PeerArray.extend(
  /** @lends KBucket# */
  {
  /**
   *
   * @class Namespace : KadOH.KBucket </br> Represents a KBucket.
   * @constructs
   * @param  {Node|String} node - Node instance or parent node ID
   * @param  {Number} [min=0] - Min limit of this KBucket (expressed as bit position)
   * @param  {Number} [max=globals.B] - Max limit of this KBucket (expressed as bit position)
   */
  initialize: function(rt, min, max) {
    this.supr();
    if (arguments.length > 0) {
      this._routingTable = rt;
      this._parentID     = (typeof rt.getParentID === 'function') ? rt.getParentID() : rt;
      this._min          = min || 0;
      this._max          = max || globals.B;
      this._timeoutID    = undefined;
      this.touch();
    }
  },

  // Public

  /**
   * Add then given Peer to the KBucket
   * If the Peer is already in the KBucket, it will be updated
   *
   * @param {Peer} peer - The peer to add or update
   * @return {KBucket} self to allow chaining
   */
  addPeer: function(peer) {
    var index = this.find(peer);
    if (~index) {
      this.getPeer(index).touch();
      this.move(index, 0);
      this.touch();
    } else {
      if (!this.isFull()) {
        peer.cacheDistance(this._parentID);
        if (!this.peerInRange(peer)) {
          throw new Error(peer + ' is not in range for ' + this);
        }
        this.array.unshift(peer);
        this.touch();
      }
      else {
        if (!this.isSplittable()) {
          var oldest = this.getOldestPeer();
          if (oldest) {
            this.removePeer(oldest);
            this.addPeer(peer);
            this.touch();
          }
        } else {
          throw 'split';
        }
      }
    }
    return this;
  },

  /**
   * Get the latest seen Peer.
   *
   * @return {Peer}
   */
  getNewestPeer: function() {
    return this.getPeer(0);
  },
  
  /**
   * Get the least recent Peer.
   *
   * @return {Peer}
   */
  getOldestPeer: function() {
    return this.getPeer(this.size() - 1);
  },
  
  /**
   * Get all the peers from the KBucket
   *
   * @param {Integer} number - fix the number of peers to get
   * @param {Peer|Peer[]} [exclude] - the {@link Peer}s to exclude
   * @return {Array}
   */
  getPeers: function(number, exclude) {
    var clone = new PeerArray(this);
    if (exclude)
      clone = clone.difference(exclude);
    if (number > 0)
      clone = clone.first(number);
    return clone;
  },

  peerInRange: function(peer) {
    return this.distanceInRange(peer.getDistance());
  },
  
  /**
   * Check wether or not the given NodeID
   * is in range of the KBucket
   *
   * @param {String} id - NodeID to check
   * @return {Boolean} true if it is in range.
   */
  idInRange: function(id) {
    return this.distanceInRange(Crypto.distance(id, this._parentID));
  },
  
  /**
   * Check wether or not a given distance is in range of the
   *
   * @param {String} distance - distance to check
   * @return {Boolean}
   */
  distanceInRange: function(distance) {
    return (this._min < distance) && (distance <= this._max);
  },

  /**
   * Get an `Object` with the `min` and `max` values
   * of the KBucket's range (expressed as bit position).
   *
   * @return {Object} range - range object
   * @return {Integer} range.min - minimum bit position
   * @return {Integer} renage.max - maximum bit position
   */
  getRange: function() {
    return {
      min: this._min,
      max: this._max
    };
  },

  /**
   * Set the range of the KBucket (expressed as bit position)
   *
   * @param {Object} range - range object
   * @param {Integer} range.min - minimum bit position
   * @param {Integer} range.max - maximum bit position
   * @return {KBucket} self to allow chaining
   */
  setRange: function(range) {
    this._min = range.min;
    this._max = range.max;
    return this;
  },

  /**
   * Set the range min of the KBucket (expressed as bit position)
   *
   * @param {Integer} min - minimum bit position
   * @return {KBucket} self to allow chaining
   */
  setRangeMin: function(min) {
    this._min = min;
    return this;
  },
  
  /**
   * Set the range max of the KBucket (expressed as bit position)
   *
   * @param {Integer} max - max bit position
   * @return {KBucket} self to allow chaining
   */
  setRangeMax: function(max) {
    this._max = max;
    return this;
  },

  /**
   * Split the KBucket range in half (higher range)
   * and return a new KBucket with the lower range
   *
   * @return {KBucket} The created KBucket
   */
  split: function() {
    var split_value = this._max - 1;

    var new_kbucket = new this.constructor(this._routingTable, this.min, split_value);
    this.setRangeMin(split_value);

    var i = this.size() - 1;
    if (i > 0) {
      var trash = [];
      for (; i >= 0; i--) {
        var peer = this.array[i];
        if (new_kbucket.peerInRange(peer)) {
          trash.push(peer);
          new_kbucket.addPeer(peer);
        }
      }
      this.remove(trash);
    }
    return new_kbucket;
  },

  /**
   * Check wether or not the KBucket is splittable
   *
   * @return {Boolean} true if splittable
   */
  isSplittable: function() {
    return (this._min === 0);
  },

  /**
   * Check wether or not the KBucket is full
   *
   * @return {Boolean} true if full
   */
  isFull: function() {
    return (this.size() == globals.K);
  },

  /**
   * Initiates the refresh process
   */
  setRefreshTimeout: function() {
    this._timeoutID = setTimeout(function(self) {
      self._routingTable.emit('refresh', self);
      self.touch();
    }, (this._refreshTime - new Date().getTime()), this);
    return this;
  },

  /**
   * Stop refresh timeout
   */
  stopRefreshTimeout : function() {
    if (this._timeoutID) {
      clearTimeout(this._timeoutID);
      this._timeoutID = undefined;
    }
    return this;
  },

  /**
   * To be called whenever the KBucket is updated
   * This function re-initiate de refresh process
   */
  touch: function() {
    // if the refreshTime is in the past (the app wasn't running)
    this._refreshTime = new Date().getTime() +
                        Math.floor(globals.TIMEOUT_REFRESH*(1+(2*Math.random()-1)*globals.TIMEOUT_REFRESH_WINDOW));
    return this.stopRefreshTimeout()
               .setRefreshTimeout();
  },

  /**
   * Represent the KBucket as a String
   *
   * @return {String} representation of the KBucket
   */
  toString: function() {
    return '<' + this._min + ':' + this._max + '><#' + this.size() + '>';
  },

  //
  // Export
  //

  exports: function(options) {
    var peers = [];

    if (options && (options.include_lastseen || options.include_distance)) {
      this.forEach(function(peer) {
        var ar = peer.getTriple();
        if (options.include_lastseen) ar.push(peer.getLastSeen());
        if (options.include_distance) ar.push(peer.getDistance());
        peers.push(ar);
      });
    } else {
      peers = this.getTripleArray();
    }

    return {
      range   : this.getRange(),
      peers   : peers,
      refresh : this._refreshTime
    };
  },

  imports: function(kbucket) {
    try {
      this.setRange(kbucket.range);
      this.add(kbucket.peers);
      this._refreshTime = kbucket.refresh;
      this.stopRefreshTimeout()
          .setRefreshTimeout();
      return true;
    } catch(e) {
      return false;
    }
  }

});
});

require.define("/lib/logging.js", function (require, module, exports, __dirname, __filename) {
var LogEmitter = require('./logger/logemitter');
module.exports = new LogEmitter();
});

require.define("/lib/logger/logemitter.js", function (require, module, exports, __dirname, __filename) {
var EventEmitter = require('../util/eventemitter');

var LogEmitter = module.exports = EventEmitter.extend({

/**
 * Emit a debug level log event.
 *
 * @param  {String} ns   - namespace associated to this log = where does it come from ?
 * @param  {Array}  args - array of arguments to log
 * @param  {String} [event] - in case of the log comes from an event (@see #subscribeTo), specify the name of the event.
 */
  debug : function(ns, args, event) {
    this.emit('debug', {
      ns    : ns,
      args  : args,
      event : event
    });
    return this;
  },

/**
 * @see #debug
 */
  info : function(ns, args, event) {
    this.emit('info', {
      ns    : ns,
      args  : args,
      event : event
    });
    return this;
  },

/**
 * @see #debug
 */
  warn : function(ns, args, event) {
    this.emit('warn', {
      ns    : ns,
      args  : args,
      event : event
    });
    return this;
  },

/**
 * @see #debug
 */
  error : function(ns, args, event) {
    this.emit('error', {
      ns    : ns,
      args  : args,
      event : event
    });
    return this;
  },

/**
 * @see #debug
 */
  fatal : function(ns, args, event) {
    this.emit('fatal', {
      ns    : ns,
      args  : args,
      event : event
    });
    return this;
  },

 /**
  * Subscribe to an EventEmitter object. All events emitted by this object will be re-emited as log-event.
  *
  * @param  {Object} eventemitter   - the EventEmitter object to subscibe to.
  * @param  {[type]} [ns=null]      - namespace associate to these log events.
  * @param  {[type]} [level=debug]  - log level
  */
  subscribeTo : function(eventemitter, ns, level) {
      ns    = ns    || null ;
      level = level || 'debug';

      if (eventemitter instanceof EventEmitter ||
          typeof eventemitter.subscribe == 'function') {
        eventemitter.subscribe(function() {
          var args = Array.prototype.slice.call(arguments);
          var event = args.shift();
          this[level].call(this, ns, args, event);
        }, this);
      }
      return this;
    },

  /**
   * Returns an already namespaced logger shim.
   *
   * The returned object got all the log methods from the
   * logemiter (info, debug, warn, error, fatal) but already namespaced
   * according to the namespace passed as arguments.
   * The shimed methods, regular functions, can be called naturally.
   *
   * @example
   * var reactor_log = log_emitter.ns('Reactor');
   * reactor_log.debug('Does'nt work', 'why ?', 'don't know !');
   *
   * @param  {String} ns - the wanted namespace
   * @return {Object} objecy with info, debug, warn, error, fatal functions.
   */
  ns : function(ns) {
    ns = ns || null;
    var log = {};
    var emitter = this;

    ['info', 'debug', 'warn', 'error', 'fatal'].forEach(function(i) {
      log[i] = function() {
        var args = Array.prototype.slice.call(arguments);
        return emitter[i](ns, args);
      };
    });
    return log;
  }
});

});

require.define("/lib/dht/bootstrap-peer.js", function (require, module, exports, __dirname, __filename) {
var Peer = require('./peer');

var BootstrapPeer = module.exports = Peer.extend({

  initialize: function() {
    var args  = arguments;

    if (Array.isArray(args[0])) {
      args  = args[0];
    }

    this.touch();
    this._distance = null;
    this._address  = args[0];
    this._id       = null;
  }

});
});

require.define("/lib/network/reactor.js", function (require, module, exports, __dirname, __filename) {
var StateEventEmitter = require('../util/state-eventemitter'),
    globals           = require('../globals'),

    protocol          = require('./protocol'),

    //@browserify-alias[simudp] ./transport/simudp  --replace
    //@browserify-alias[xmpp] ./transport/strophe --replace
    Transport      = require('./transport/strophe'),
 
    log = require('../logging').ns('Reactor');
  
var Reactor = module.exports = StateEventEmitter.extend({

  /**
   * TODO : explicit the options
   *
   * @param  {Node}   node    - the Node Instance to which this reactor is associated
   * @param  {Object} options - options
   */
  initialize: function(node, options) {
    this.supr();
    this._node = node;

    // load config
    var config = this.config = {
      protocol : globals.PROTOCOL,
      cleanup  : globals.CLEANUP_INTERVAL,
      adaptiveTimeout : globals.ADAPTIVE_TIMEOUT_INTERVAL
    };
    for (var option in options) {
      this.config[option] = options[option];
    }

    if (typeof config.protocol === 'string' && !protocol.hasOwnProperty(config.protocol))
      throw new Error('non defined protocol');

    // instantiate the transport and protocol
    this._protocol  = (typeof config.protocol === 'string') ? protocol[config.protocol] : config.protocol;
    this._transport = (typeof config.transportInstance !== 'undefined')
                    ? config.transportInstance
                    : new Transport(
                        config.host,
                        config.transport
                      );

    // request table and ragular clean up the table
    this._requests = {};
    this._startCleanup();
    this._rtts = [];

    // associate RPC object to RPC methods
    this.RPCObject = {
      __default  : undefined
    };

    this.setState('disconnected');
  },

  /**
   * Register RPC objects to associate with RPC method names.
   * 
   * @example
   * reactor.register({
   *   'PING'  : PingRPC,
   *   'STORE' : StoreRPC
   * });
   * 
   * Special method name '__default' : object use when method
   * names not associated to any RPCObject.
   * 
   * @param  {Object} rpcs - hash of RPCS to register
   */
  register: function(rpcs) {
    //TODO suppress reference to reactor
    for(var i in rpcs) {
      this.RPCObject[i] = rpcs[i].extend({reactor : this});
    }
    return this;
  },

  /**
   * Stop the reactor:
   * stop clean-up process and disconnect transport.
   */
  stop: function() {
    this._stopCleanup();
    this._stopAdaptiveTimeout();
    this.disconnectTransport();
  },

  /**
   * Return the node instance (also a Peer instance).
   * @return {Object} node instance
   */
  getMeAsPeer: function() {
    return this._node;
  },

  /**
   * Connect the transport.
   */
  connectTransport: function() {
    if (this._transport.stateIsNot('connected')) {
      this._transport.once('connected', function(address) {
        // main listen loop
        this._transport.listen(this.handleRPCMessage, this);
        this._startCleanup();
        this.setState('connected', address);
      }, this);
      this._transport.connect();
    }
    return this;
  },

  /**
   * Disconnect the transport.
   * @return {[type]}
   */
  disconnectTransport: function() {
    if (this._transport.stateIsNot('disconnected')) {
      this._transport.once('disconnected', function() {
        this.setState('disconnected');
      }, this);
      this._transport.disconnect();
    }
    return this;
  },

  /**
   * Send a RPC query : add it to the requests table and pass it
   * to #sendNormalizedQuery.
   *
   * @param  {RPC} rpc - rpc to send
   */
  sendRPCQuery: function(rpc) {
    if (this.stateIsNot('connected')) {
      rpc.reject('transport not connected');
      log.error('send query : transport disconnected', rpc);
    }
    else {
      this._storeRequest(rpc);
      this.sendNormalizedQuery(rpc.normalizeQuery(), rpc.getQueried(), rpc);
      log.debug('Reactor', 'send query', rpc.getMethod(), rpc.getQueried().getAddress(), rpc.normalizeQuery());
    }
    this.emit('querying', rpc);
    return this;
  },
  
  /**
   * Encode a normalised query whith the appropriate protcol,
   * and send it.
   *
   * @param  {Object} query    - normalized query
   * @param  {Peer} dst_peer - destination peer
   */
  sendNormalizedQuery: function(query, dst_peer) {
    var req = this._protocol.encode(query);
    this._transport.send(dst_peer.getAddress(), req, query);
  },

  /**
   * Send a RPC response.
   * @param  {RPC} rpc - RPC object to send.
   */
  sendRPCResponse: function(rpc) {
    if (this.stateIsNot('connected')) {
      rpc.reject('transport not connected');
      log.error('send response : transport disconnected', rpc);
    } else {
      this.sendNormalizedResponse(rpc.normalizeResponse(), rpc.getQuerying(), rpc);
      log.debug('send response', rpc.getMethod(), rpc.getQuerying().getAddress(), rpc.normalizeResponse());
    }
    return this;
  },

  /**
   * Encode a normalised query whith the appropriate protcol,
   * and send it.
   *
   * @param  {Object} response    - normalized query
   * @param  {Peer} dst_peer - destination peer
   */
  sendNormalizedResponse: function(response, dst_peer) {
    var res  = this._protocol.encode(response);
    this._transport.send(dst_peer.getAddress(), res, response);
  },

  /**
   * Handle an incoming encoded RPC message :
   * normalyse the message and pass it to the right handler.
   *
   * @param  {Object} data - raw data
   */
  handleRPCMessage: function(data) {
    var message;
    try {
      message = this._protocol.decode(data.msg);
    }
    catch(RPCError) {
      log.warn('received a broken RPC message', RPCError);
      return;
    }

    switch(message.type) {
      case 'request' :
        this.handleNormalizedQuery(message, data.src)
        break;
      case 'error' :
      case 'response' :
        this.handleNormalizedResponse(message, data.src)
        break;
    }
  },

  /**
   * Handle a normalized query : construct the associated RPC object,
   * and emit `queried` wiht the object. Bind the resolve or reject for
   * sending the response.
   *
   * @param  {Object} query - normalized query
   * @param  {String} from  - address of the querying peer
   */
  handleNormalizedQuery: function(query, from) {
    var method = (this.RPCObject.hasOwnProperty(query.method)) ? query.method : '__default';

    if (!this.RPCObject[method]) {
      log.warn( 'receive query with method "' + query.method + '" not available');
      return;
    }
    
    //crate the appropirate RPC object
    var rpc = new this.RPCObject[method]();

    rpc.handleNormalizedQuery(query, from);

    //when resolved or rejected, send response
    rpc.always(rpc.sendResponse);

    //handler could have rejected the query
    if (!rpc.isRejected()) {
      this.emit('reached', rpc.getQuerying());
      log.debug('received query', rpc.getMethod(), from, query);
      this.emit('queried', rpc);
    }
  },

  /**
   * Handle a normalized response : find the associated RPC
   * object (correspond to the rpc id) and pass to it.
   * @param  {Object} response - normalized response
   * @param  {String} from     - address of the peer that responded
   */
  handleNormalizedResponse: function(response, from) {
    var rpc = this._getRequestByID(response.id);

    if (!rpc) {
      log.warn('response matches no request', from, response);
    } else {
      log.debug('received response', rpc.getMethod(), from, response);
      rpc.handleNormalizedResponse(response, from);
      this.addRTT(rpc.getRTT());
    }
    return this;
  },

  /**
   * Find a request in the requests table given its rpc id.
   * @param  {String} id - rpc id
   */
  _getRequestByID: function(id) {
    return this._requests[id];
  },

  /**
   * Store the request in he table.
   * @param  {RPC} rpc - rpc to store
   */
  _storeRequest: function(rpc) {
    this._requests[rpc.getID()] = rpc;
  },

  /**
   * Periodicly remove the stored requests already completed.
   */
  _startCleanup: function() {
    this._cleanupProcess = setInterval(function(self) {
      var requests = self._requests;
      for (var id in requests) {
        if (requests.hasOwnProperty(id)) {
          if (requests[id].isCompleted())
            delete requests[id];
        }
      }
    }, this.config.cleanup, this);
  },

  /**
   * Stop the periodic cleanup.
   */
  _stopCleanup: function() {
    clearInterval(this._cleanupProcess);
  },

  //helpers :
  
  /**
   * kethod to send a rpc.
   * 
   * @param  {RPC | Array<RPC>} rpc - rpc to send
   */
  sendRPC: function(rpc) {

    //an array of RPCs
    if(Array.isArray(rpc)) {
      for(var i  = 0; i < rpc.length; i++) {
        this.sendRPC(rpc[i]);
      }
      return this;
    }

    //pass instace of reactor
    rpc.reactor = this;
    rpc.setQuerying(this.getMeAsPeer());
    
    var success = function() {
      // emit the reach as the first event
      this.emit('reached', rpc.getQueried());
    };
    var failure = function(type) {
      if (type === 'outdated') {
        // forward outdated events
        this.emit.apply(this, arguments);
      }
    };

    rpc.then(success, failure, this);
    return rpc.sendQuery();
  },

  //
  // Statistics
  //

  timeoutValue: globals.TIMEOUT_RPC,

  adaptive: {
    size : 3000,
    tolerance : 0.75,
    max : 10 * 1000,
    min : 1000,
    deflt : globals.TIMEOUT_RPC,
    running : false
  },

  addRTT: function(rtt) {
    if (rtt <= 0) return;
    this._rtts.push(rtt);
    if (!this.adaptive.running) {
      this.adaptive.running = true;
      if (this.config.adaptiveTimeout) {
        var self = this;
        setTimeout(function() {
          self._adaptiveTimeout();
        }, this.config.adaptiveTimeout);
      }
    }
  },

  /**
   * Implements the algorithm to compute a
   * long-term-adaptive-timeout value
   */
  _adaptiveTimeout: function() {
    var adaptive = this.adaptive;
    var rtts = this._rtts;

    if (rtts.length > adaptive.size) {
      this._rtts = rtts = rtts.slice(rtts.length - adaptive.size);
    }

    var timeout = this.adaptiveFn(rtts.slice(), adaptive);
    if (timeout > adaptive.max) {
      timeout = adaptive.max;
    } else if (timeout < adaptive.min) {
      timeout = adaptive.min;
    }

    this.timeoutValue = timeout;
    adaptive.running = false;
  },

  /**
   * Default adaptive function based on a fault tolerance
   * adaptive timeout.
   * This function can be overridden
   */
  adaptiveFn: function(distribution, adaptive) {
    distribution.sort(function(a, b) { return a - b; });
    var i = Math.round(distribution.length * adaptive.tolerance) - 1;
    if (i < distribution.length - 1) {
      return distribution[i];
    }
    return adaptive.deflt;
  }

});
});

require.define("/lib/network/protocol/index.js", function (require, module, exports, __dirname, __filename) {
exports.jsonrpc2    = require('./jsonrpc2');
exports.xmlrpc      = require('./xmlrpc');

if(process.title !== 'browser') {
  //@browserify-ignore
  exports.node_xmlrpc = require('./node-xmlrpc');
}

});

require.define("/lib/network/protocol/jsonrpc2.js", function (require, module, exports, __dirname, __filename) {
var util = require('util');

/**
 * Decode a JSON-RPC-2.0 encoded rpc object or stringified object.
 *
 * @throws {RPCError} If eeor durning decoding rpc
 *
 * @param  {Object|String} raw - rpc encoded to decode
 * @return {Object}   normalized rpc object
 */
exports.decode = function(raw) {
  var obj = {};

  if (typeof raw === 'string') {
    raw = JSON.parse(raw);
  }

  if (typeof raw !== 'object')
    throw new RPCError(-32600);

  // ID
  if (raw.id){
    if (typeof raw.id === 'number') {
      if (raw.id >>> 0 !== raw.id) //is a integer
        throw new RPCError(-32600);
    }
    else if (typeof raw.id !== 'string' && typeof raw.id === 'boolean')
      throw new RPCError(-32600);
    //OK
    obj.id = String(raw.id);
  }
  else {
    obj.id = null;
  }
  
  // jsonrpc version
  if (raw.jsonrpc !== '2.0')
    throw new RPCError(-32600, null, {id : obj.id});
  
  // Request
  if (raw.method) {
    if (raw.error || raw.result || typeof raw.method !== 'string')
      throw new RPCError(-32600, null, {id : obj.id});
    
    var method = raw.method.toUpperCase();
    obj.method = method;
    obj.type = 'request';
    
    if (raw.params && !Array.isArray(raw.params))
      throw new RPCError(-32602, null, {id : obj.id});
    obj.params = raw.params || [];
  }
  
  // Response
  else if (raw.result) {
    if (raw.error)
      throw new RPCError(-32600, null, {id : obj.id});
    obj.result = raw.result;
    obj.type = 'response';

  }
  
  // Errorresponse
  else if (raw.error) {
    obj.type = 'error';
    obj.error = {
      code    : raw.error.code,
      message : raw.error.message,
      data    : raw.error.data
    };
  }

  else {
    throw new RPCError(-32600, null, {id : obj.id});
  }

  return obj;
};

/**
 * Encode the given normalized rpc object into a JSON-RPC-2.0
 * encoded rpc object.
 *
 * @param  {Object} rpc - normalyzed rpc object
 * @return {Object} ecoded rpc
 */
exports.encode = function(rpc) {
  var obj = {};
  obj.jsonrpc = '2.0';

  switch(rpc.type) {
    case 'request' :
      obj.method = rpc.method;
      obj.params = rpc.params;
      obj.id = rpc.id;
      break;
    case 'response' :
      obj.result = rpc.result;
      obj.id = rpc.id;
      break;
    case 'error' :
      obj.error = rpc.error;
      if (rpc.id)
        obj.id = rpc.id;
      break;
    default:
      throw new Error('No rpc type during encoding');
  }
  return obj;
};

/**
 * JSONRPC 2 error code significations.
 */
var JSONRPC_ERROR_STRINGS = {
  "-32700" : "Parse error.",
  "-32600" : "Invalid Request.",
  "-32601" : "Method not found.",
  "-32602" : "Invalid params.",
  "-32603" : "Internal error."
};

/**
 * RPC error object.
 * In the data arguments object, it can be passed as property the ID of the related RPCMessage.
 * @extends {Error}
 *
 * @param {Number} code    JSON RPC error code.
 * @param {String} [message] Description of the error.
 * @param {Object} [data]    Optionnal complementary data about error.
 */
var RPCError = function(code, message, data) {
  message = message ? message : (JSONRPC_ERROR_STRINGS[code] ? JSONRPC_ERROR_STRINGS[code] : '');

  Error.call(this,'['+code+'] '+ message);
  this.code    = code;
  this.message = message;

  if (data)
    this.data = data;
};

util.inherits(RPCError, Error);
exports.RPCError = RPCError;
});

require.define("util", function (require, module, exports, __dirname, __filename) {
var events = require('events');

exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

});

require.define("events", function (require, module, exports, __dirname, __filename) {
if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = list.indexOf(listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

});

require.define("/lib/network/protocol/xmlrpc.js", function (require, module, exports, __dirname, __filename) {
var util = require('util');

// Greatly inspired from :
// Some easier XML-RPC methods for Mozilla.
// 12/7/2005, 26/12/2005, 6/1/2006 David Murray.
// http://deepestsender.mozdev.org/
// v0.3
// @see http://code.google.com/p/qpanel/source/browse/trunk/src/client/lib/xmlrpc.js

var _convertToXML = function(obj) {
  var xml = document.implementation.createDocument('', 'value', null);
  var findtype = new RegExp('function (.*?)\\(\\) \\{.*');
  var value, numtype;
  switch (findtype.exec(obj.constructor.toString())[1]) {
    case 'Number':
      // Numbers can only be sent as integers or doubles.
      if (Math.floor(obj) !== obj) {
        numtype = xml.createElement('double');
      } else {
        numtype = xml.createElement('i4');
      }
      var number = xml.documentElement.appendChild(numtype);
      number.appendChild(xml.createTextNode(obj));
      break;
    case 'String':
      var string = xml.documentElement.appendChild(xml.createElement('string'));
      string.appendChild(xml.createTextNode(obj));
      break;
    case 'Boolean':
      var bool = xml.documentElement.appendChild(xml.createElement('boolean'));
      bool.appendChild(xml.createTextNode(obj * 1));
      break;
    case 'Object':
      var struct = xml.documentElement.appendChild(xml.createElement('struct'));
      for (var w in obj) {
        if(obj[y] && typeof obj[y] === 'function')
          continue;
        var member = struct.appendChild(xml.createElement('member'));
        member.appendChild(xml.createElement('name'))
              .appendChild(xml.createTextNode(w));
        member.appendChild(_convertToXML(obj[w]));
      }
      break;
    case 'Date':
      var datetext = obj.getFullYear() + _padNumber(obj.getMonth() + 1) + _padNumber(obj.getDate()) + 'T' + _padNumber(obj.getHours()) + ':' + _padNumber(obj.getMinutes()) + ':' + _padNumber(obj.getSeconds());
      xml.documentElement.appendChild(xml.createElement('dateTime.iso8601'))
         .appendChild(xml.createTextNode(datetext));
      break;
    case 'Array':
      var array = xml.documentElement.appendChild(xml.createElement('array'));
      var data = array.appendChild(xml.createElement('data'));
      for (var y in obj) {
        if(typeof obj[y] === 'function')
          continue;
        value = data.appendChild(xml.createElement('value'));
        value.appendChild(_convertToXML(obj[y]));
      }
      break;
    default:
      // Hellishly awful binary encoding shit goes here.
      // GZiped base64
      // @TODO
      break;
  }
  return xml.documentElement;
};

var _padNumber = function(num) {
  if (num < 10) {
    num = '0' + num;
  }
  return num;
};

var _removeWhiteSpace = function(node) {
  var notWhitespace = /\S/;
  for (var x = 0; x < node.childNodes.length; x++) {
    var childNode = node.childNodes[x];
    if ((childNode.nodeType === 3) && (!notWhitespace.test(childNode.textContent))) {
      // that is, if it's a whitespace text node
      node.removeChild(node.childNodes[x]);
      x--;
    }
    if (childNode.nodeType === 1) {
      // elements can have text child nodes of their own
      _removeWhiteSpace(childNode);
    }
  }
};

var _convertFromXML = function(obj) {
  if (!obj)
    return null;

  var data;
  var tag = obj.tagName.toLowerCase();

  try {
    switch (tag) {
      case "value":
        return _convertFromXML(obj.firstChild);
      case "double":
      case "i4":
      case "int":
        var number = obj.textContent;
        data = number * 1;
        break;
      case "boolean":
        var bool = obj.textContent;
        data = (bool === "1" || bool === "true") ? true : false;
        break;
      case "datetime.iso8601":
        var date = obj.textContent;
        data = new Date();
        data.setFullYear(date.substring(0,4), date.substring(4,6) - 1, date.substring(6,8));
        data.setHours(date.substring(9,11), date.substring(12,14), date.substring(15,17));
        break;
      case "array":
        data = [];
        var datatag = obj.firstChild;
        for (var k = 0; k < datatag.childNodes.length; k++) {
          var value = datatag.childNodes[k];
          data.push(_convertFromXML(value.firstChild));
        }
        break;
      case "struct":
        data = {};
        for (var j = 0; j < obj.childNodes.length; j++) {
          var membername  = obj.childNodes[j].getElementsByTagName("name")[0].textContent;
          var membervalue = obj.childNodes[j].getElementsByTagName("value")[0].firstChild;
          data[membername] = membervalue ? _convertFromXML(membervalue) : null;
        }
        break;
      case "string":
        data = obj.textContent;
        break;
      default:
        data = null;
        break;
    }
  } catch(e) {
    data = null;
  }
  return data;
};

 var _decodeRequestMessage = function(iq) {
  var rpc = {};
  rpc.id  = iq.getAttribute("id") || null;

  // Method name
  var method = iq.getElementsByTagName("methodName")[0];
  rpc.method = method ? method.textContent : null;
  rpc.type = 'request';

  // Parameters
  rpc.params = null;
  try {
    var params = iq.getElementsByTagName("params")[0]
                   .childNodes;
    if (params && params.length > 0) {
      rpc.params = [];
      for (var i = 0; i < params.length; i++) {
        rpc.params.push(_convertFromXML(params[i].firstChild));
      }
    }
  } catch(e) {
    throw new RPCError(-32600, null, {id : rpc.id});
  }
  return rpc;
};

var _decodeResponseMessage = function(iq) {
  var rpc = {};
  rpc.id  = iq.getAttribute("id") || null;

  try {
    var result = iq.getElementsByTagName("methodResponse")[0].firstChild;

    // Response
    var tag = result.tagName;
    if (tag === "params") {
      rpc.type = 'response';
      rpc.result = _convertFromXML(result.firstChild.firstChild);
    }
    // Error
    else if (tag === "fault") {
      rpc.type = 'error';
      rpc.error  = _convertFromXML(result.firstChild);
    }
  } catch(e) {
    throw new RPCError(-32600, null, {id : rpc.id});
  }
  return rpc;
};

/**
 * Decode a XML-RPC encoded rpc.
 *
 * @param  {DomElement|String} iq
 * @return {Object}   normalized rpc object
 */
exports.decode = function(iq) {
  if (typeof iq === 'string') {
    try {
      var parser = new DOMParser();
      var doc    = parser.parseFromString(iq, 'text/xml');
      _removeWhiteSpace(doc);
      iq = doc.documentElement;
      if (iq.tagName == "parsererror") {
        throw new RPCError(-32600, null, {});
      }
    } catch(e) {
      throw new RPCError(-32600, null, {});
    }
  }
  var type = iq.getAttribute('type');
  if (type === 'set') {
    return _decodeRequestMessage(iq);
  } else if (type === 'result') {
    return _decodeResponseMessage(iq);
  } else {
    throw new RPCError(-32600, null, {id : iq.getAttribute('id')});
  }
};

/**
 * Encode the given normalized rpc object into an XML-rpc
 * encoded rpc object.
 *
 * @param  {Object} rpc - normalized rpc object
 * @return {DomElement}   encoded rpc
 */
exports.encode = function(rpc) {
  switch(rpc.type) {
    case 'request' :
      return _encodeRequest(rpc);
    case 'response' :
      return _encodeResponse(rpc);
    case 'error' :
      return _encodeError(rpc);
    default:
      throw new Error('No rpc type during encoding');
  }
};

var _encodeRequest = function(rpc) {
  var xml = document.implementation.createDocument('', 'methodCall', null);
  xml.documentElement.appendChild(xml.createElement('methodName'))
                     .appendChild(xml.createTextNode(rpc.method));
  
  var xmlparams = xml.documentElement.appendChild(xml.createElement('params'));
  for (var i = 0; i < rpc.params.length; i++) {
    xmlparams.appendChild(xml.createElement('param'))
             .appendChild(_convertToXML(rpc.params[i]));
  }
  
  return xml.documentElement;
};

var _encodeResponse = function(rpc) {
  var xml = document.implementation.createDocument('', 'methodResponse', null);
  xml.documentElement.appendChild(xml.createElement('params'))
                     .appendChild(xml.createElement('param'))
                     .appendChild(_convertToXML(rpc.result));

  return xml.documentElement;
};

var _encodeError = function(rpc) {
  var xml = document.implementation.createDocument('', 'methodResponse', null);
  xml.documentElement.appendChild(xml.createElement('fault'))
                     .appendChild(_convertToXML({
                       faultCode: rpc.error.code,
                       faultString: rpc.error.message
                     }));

  return  xml.documentElement;
};

var XMLRPC_ERROR_STRINGS = {
  '-32700' : 'Parse error.',
  '-32600' : 'Invalid Request.',
  '-32601' : 'Method not found.',
  '-32602' : 'Invalid params.',
  '-32603' : 'Internal error.'
};

/**
 * RPC error object.
 * In the data arguments object, it can be passed as property the ID of the related RPCMessage.
 * @extends {Error}
 *
 * @param {Number} code    JSON RPC error code.
 * @param {String} [message] Description of the error.
 * @param {Object} [data]    Optionnal complementary data about error.
 */
var RPCError = function(code, message, data) {
  message = message ? message : (XMLRPC_ERROR_STRINGS[code] ? XMLRPC_ERROR_STRINGS[code] : '');

  Error.call(this,'['+code+'] '+ message);
  this.code    = code;
  this.message = message;

  if (data)
    this.data = data;
};

util.inherits(RPCError, Error);
exports.RPCError = RPCError;
});

require.define("/lib/network/transport/strophe.js", function (require, module, exports, __dirname, __filename) {
var StateEventEmitter = require('../../util/state-eventemitter'),
    globals           = require('../../globals');

require('Strophe.js'); //available as Strophe global variable
require('./strophe.disco.js');
require('./strophe.rpc.js');

var log = require('../../logging').ns('Transport');

Strophe.log = function(level, message) {
  switch (level) {
    case Strophe.LogLevel.WARN:
      log.warn(message);
      break;
    case Strophe.LogLevel.ERROR:
      log.error(message);
      break;
    case Strophe.LogLevel.FATAL:
      log.fatal(message);
      break;
    default:
      // log.debug(message);
      break;
  }
};

var $msg  = function(attrs) { return new Strophe.Builder('message',  attrs); };
var $pres = function(attrs) { return new Strophe.Builder('presence', attrs); };

var StropheTransport = module.exports = StateEventEmitter.extend({

  initialize: function(host, options) {
    this.supr();

    this._host       = host || globals.BOSH_SERVER;
    this._jid        = Strophe.getBareJidFromJid(options.jid) + '/' +
                       (options.resource || globals.JID_RESOURCE);
    this._password   = options.password;
    this._connection = null;

    this.setState('disconnected');
    if (!this._jid || !this._password)
      throw new Error('No JID or password to connect');
  },

  // @TODO: Using `attach()` instead of `connect()` when we can
  // by storing the RID and SID in the localStorage for security
  // and performance reasons...since it would be possible to have
  // session persistence
  // @see: Professional XMPP p.377
  connect: function() {
    var self = this;
    this.setState('connecting', this._host, this._jid);

    this._connection = new Strophe.Connection(this._host);

    this._connection.rawInput = function(data) {
      self.emit('data-in', data);
    };

    this._connection.rawOutput = function(data) {
      self.emit('data-out', data);
    };

    var onConnect = function(status, error) {
      switch (status) {
        case Strophe.Status.CONNECTED:
        case Strophe.Status.ATTACHED:
          self._jid = self._connection.jid;
          self._setConnCookies();
          self._connection._notifyIncrementRid = function(rid) {
            self._setConnCookies();
          };
          self.setState('connected', self._connection.jid);
          break;
        case Strophe.Status.DISCONNECTING:
          self.setState('disconnecting');
          break;
        case Strophe.Status.DISCONNECTED:
          self._deleteConnCookies();
          self.setState('disconnected');
          break;
        case Strophe.Status.AUTHFAIL:
        case Strophe.Status.CONNFAIL:
          self._deleteConnCookies();
          self.setState('failed', error);
          break;
        case Strophe.Status.ERROR:
          throw error;
        default:
          return;
      }
    };
    
    var prev_session = this._getConnCookies();

    if(prev_session.sid !== null && prev_session.rid !== null) {
      log.info('try connection attach');

      this._connection.attach(this._jid, prev_session.sid, prev_session.rid,
        function(status, error) {
          if(status === Strophe.Status.ATTACHED) {
            self._connection.send($pres().tree());

            setTimeout(function() {
              if(!self._connection.connected) {
                log.info('Attach failed : trying normal connect');

                self._connection.connect(self._jid, self._password, function(status, error) {
                  if(status === Strophe.Status.CONNECTED) {
                    self._connection.send($pres().tree());
                  }
                  onConnect(status, error);
                });
              }
            }, 4000);
            //self._connection.connect(self._jid, self._password, onConnect);
          }
          onConnect(status, error);
      });
    } else {
      this._connection.connect(this._jid, this._password, function(status, error) {
        if(status === Strophe.Status.CONNECTED) {
          self._connection.send($pres().tree());
        }
        onConnect(status, error);
      });
    }
  },

  disconnect: function() {
    this._connection.disconnect();
  },

  send: function(to, encoded, normalized) {
    if (this.stateIsNot('connected'))
      throw new Error('XMPP transport layer not connected');
    
    this._connection.rpc.sendXMLElement(
      normalized.id,
      to,
      normalized.type === 'request' ? 'set' : 'result',
      encoded
    );
  },

  listen: function(fn, context) {
    if (this.stateIsNot('connected'))
      throw new Error('XMPP transport layer not connected');
    
    context = context || this;
    var handler = function(iq) {
      fn.call(context, {
        dst: iq.getAttribute('to'),
        src: iq.getAttribute('from'),
        msg: iq
      });
      return true;
    };
    this._connection.rpc.addXMLHandler(handler, context);
  },

  _setConnCookies: function() {
    var exp = (new Date((Date.now()+90*1000))).toGMTString();
    document.cookie = '_strophe_sid_'+this._jid+'='+String(this._connection.sid)+'; expires='+exp;
    document.cookie = '_strophe_rid_'+this._jid+'='+String(this._connection.rid)+'; expires='+exp;
  },

  _deleteConnCookies : function() {
    document.cookie = '_strophe_sid_'+this._jid+'='+'foo'+'; expires=Thu, 01-Jan-1970 00:00:01 GMT';
    document.cookie = '_strophe_rid_'+this._jid+'='+'bar'+'; expires=Thu, 01-Jan-1970 00:00:01 GMT';
  },

  _getConnCookies: function() {
    var sid_match = (new RegExp('_strophe_sid_'+this._jid+"=([^;]*)", "g")).exec(document.cookie);
    var rid_match = (new RegExp('_strophe_rid_'+this._jid+"=([^;]*)", "g")).exec(document.cookie);

    return {
      sid : (sid_match !== null) ? sid_match[1] : null,
      rid : (rid_match !== null) ? rid_match[1] : null
    };
  }

});
});

require.define("/node_modules/Strophe.js/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {"main":"./strophe.js"}
});

require.define("/node_modules/Strophe.js/strophe.js", function (require, module, exports, __dirname, __filename) {
// This code was written by Tyler Akins and has been placed in the
// public domain.  It would be nice if you left this header intact.
// Base64 code from Tyler Akins -- http://rumkin.com

var Base64 = (function () {
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    var obj = {
        /**
         * Encodes a string in base64
         * @param {String} input The string to encode in base64.
         */
        encode: function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;

            do {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);

                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;

                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }

                output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) +
                    keyStr.charAt(enc3) + keyStr.charAt(enc4);
            } while (i < input.length);

            return output;
        },

        /**
         * Decodes a base64 string.
         * @param {String} input The string to decode.
         */
        decode: function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;

            // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

            do {
                enc1 = keyStr.indexOf(input.charAt(i++));
                enc2 = keyStr.indexOf(input.charAt(i++));
                enc3 = keyStr.indexOf(input.charAt(i++));
                enc4 = keyStr.indexOf(input.charAt(i++));

                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;

                output = output + String.fromCharCode(chr1);

                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }
            } while (i < input.length);

            return output;
        }
    };

    return obj;
})();
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = "="; /* base-64 pad character. "=" for strict RFC compliance   */
var chrsz   = 8;  /* bits per input character. 8 - ASCII; 16 - Unicode      */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_sha1(s){return binb2hex(core_sha1(str2binb(s),s.length * chrsz));}
function b64_sha1(s){return binb2b64(core_sha1(str2binb(s),s.length * chrsz));}
function str_sha1(s){return binb2str(core_sha1(str2binb(s),s.length * chrsz));}
function hex_hmac_sha1(key, data){ return binb2hex(core_hmac_sha1(key, data));}
function b64_hmac_sha1(key, data){ return binb2b64(core_hmac_sha1(key, data));}
function str_hmac_sha1(key, data){ return binb2str(core_hmac_sha1(key, data));}

/*
 * Perform a simple self-test to see if the VM is working
 */
function sha1_vm_test()
{
  return hex_sha1("abc") == "a9993e364706816aba3e25717850c26c9cd0d89d";
}

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function core_sha1(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  var w = new Array(80);
  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;
  var e = -1009589776;

  var i, j, t, olda, oldb, oldc, oldd, olde;
  for (i = 0; i < x.length; i += 16)
  {
    olda = a;
    oldb = b;
    oldc = c;
    oldd = d;
    olde = e;

    for (j = 0; j < 80; j++)
    {
      if (j < 16) { w[j] = x[i + j]; }
      else { w[j] = rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1); }
      t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)),
                       safe_add(safe_add(e, w[j]), sha1_kt(j)));
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = t;
    }

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
    e = safe_add(e, olde);
  }
  return [a, b, c, d, e];
}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d)
{
  if (t < 20) { return (b & c) | ((~b) & d); }
  if (t < 40) { return b ^ c ^ d; }
  if (t < 60) { return (b & c) | (b & d) | (c & d); }
  return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t)
{
  return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
         (t < 60) ? -1894007588 : -899497514;
}

/*
 * Calculate the HMAC-SHA1 of a key and some data
 */
function core_hmac_sha1(key, data)
{
  var bkey = str2binb(key);
  if (bkey.length > 16) { bkey = core_sha1(bkey, key.length * chrsz); }

  var ipad = new Array(16), opad = new Array(16);
  for (var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = core_sha1(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
  return core_sha1(opad.concat(hash), 512 + 160);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * Convert an 8-bit or 16-bit string to an array of big-endian words
 * In 8-bit function, characters >255 have their hi-byte silently ignored.
 */
function str2binb(str)
{
  var bin = [];
  var mask = (1 << chrsz) - 1;
  for (var i = 0; i < str.length * chrsz; i += chrsz)
  {
    bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (32 - chrsz - i%32);
  }
  return bin;
}

/*
 * Convert an array of big-endian words to a string
 */
function binb2str(bin)
{
  var str = "";
  var mask = (1 << chrsz) - 1;
  for (var i = 0; i < bin.length * 32; i += chrsz)
  {
    str += String.fromCharCode((bin[i>>5] >>> (32 - chrsz - i%32)) & mask);
  }
  return str;
}

/*
 * Convert an array of big-endian words to a hex string.
 */
function binb2hex(binarray)
{
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var str = "";
  for (var i = 0; i < binarray.length * 4; i++)
  {
    str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) +
           hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);
  }
  return str;
}

/*
 * Convert an array of big-endian words to a base-64 string
 */
function binb2b64(binarray)
{
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var str = "";
  var triplet, j;
  for (var i = 0; i < binarray.length * 4; i += 3)
  {
    triplet = (((binarray[i   >> 2] >> 8 * (3 -  i   %4)) & 0xFF) << 16) |
              (((binarray[i+1 >> 2] >> 8 * (3 - (i+1)%4)) & 0xFF) << 8 ) |
               ((binarray[i+2 >> 2] >> 8 * (3 - (i+2)%4)) & 0xFF);
    for (j = 0; j < 4; j++)
    {
      if (i * 8 + j * 6 > binarray.length * 32) { str += b64pad; }
      else { str += tab.charAt((triplet >> 6*(3-j)) & 0x3F); }
    }
  }
  return str;
}
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

var MD5 = (function () {
    /*
     * Configurable variables. You may need to tweak these to be compatible with
     * the server-side, but the defaults work in most cases.
     */
    var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase */
    var b64pad  = ""; /* base-64 pad character. "=" for strict RFC compliance */
    var chrsz   = 8;  /* bits per input character. 8 - ASCII; 16 - Unicode */

    /*
     * Add integers, wrapping at 2^32. This uses 16-bit operations internally
     * to work around bugs in some JS interpreters.
     */
    var safe_add = function (x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    };

    /*
     * Bitwise rotate a 32-bit number to the left.
     */
    var bit_rol = function (num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    };

    /*
     * Convert a string to an array of little-endian words
     * If chrsz is ASCII, characters >255 have their hi-byte silently ignored.
     */
    var str2binl = function (str) {
        var bin = [];
        var mask = (1 << chrsz) - 1;
        for(var i = 0; i < str.length * chrsz; i += chrsz)
        {
            bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (i%32);
        }
        return bin;
    };

    /*
     * Convert an array of little-endian words to a string
     */
    var binl2str = function (bin) {
        var str = "";
        var mask = (1 << chrsz) - 1;
        for(var i = 0; i < bin.length * 32; i += chrsz)
        {
            str += String.fromCharCode((bin[i>>5] >>> (i % 32)) & mask);
        }
        return str;
    };

    /*
     * Convert an array of little-endian words to a hex string.
     */
    var binl2hex = function (binarray) {
        var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
        var str = "";
        for(var i = 0; i < binarray.length * 4; i++)
        {
            str += hex_tab.charAt((binarray[i>>2] >> ((i%4)*8+4)) & 0xF) +
                hex_tab.charAt((binarray[i>>2] >> ((i%4)*8  )) & 0xF);
        }
        return str;
    };

    /*
     * Convert an array of little-endian words to a base-64 string
     */
    var binl2b64 = function (binarray) {
        var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var str = "";
        var triplet, j;
        for(var i = 0; i < binarray.length * 4; i += 3)
        {
            triplet = (((binarray[i   >> 2] >> 8 * ( i   %4)) & 0xFF) << 16) |
                (((binarray[i+1 >> 2] >> 8 * ((i+1)%4)) & 0xFF) << 8 ) |
                ((binarray[i+2 >> 2] >> 8 * ((i+2)%4)) & 0xFF);
            for(j = 0; j < 4; j++)
            {
                if(i * 8 + j * 6 > binarray.length * 32) { str += b64pad; }
                else { str += tab.charAt((triplet >> 6*(3-j)) & 0x3F); }
            }
        }
        return str;
    };

    /*
     * These functions implement the four basic operations the algorithm uses.
     */
    var md5_cmn = function (q, a, b, x, s, t) {
        return safe_add(bit_rol(safe_add(safe_add(a, q),safe_add(x, t)), s),b);
    };

    var md5_ff = function (a, b, c, d, x, s, t) {
        return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
    };

    var md5_gg = function (a, b, c, d, x, s, t) {
        return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
    };

    var md5_hh = function (a, b, c, d, x, s, t) {
        return md5_cmn(b ^ c ^ d, a, b, x, s, t);
    };

    var md5_ii = function (a, b, c, d, x, s, t) {
        return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
    };

    /*
     * Calculate the MD5 of an array of little-endian words, and a bit length
     */
    var core_md5 = function (x, len) {
        /* append padding */
        x[len >> 5] |= 0x80 << ((len) % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        var a =  1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d =  271733878;

        var olda, oldb, oldc, oldd;
        for (var i = 0; i < x.length; i += 16)
        {
            olda = a;
            oldb = b;
            oldc = c;
            oldd = d;

            a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
            d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
            c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
            b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
            a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
            d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
            c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
            b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
            a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
            d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
            c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
            b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
            a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
            d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
            c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
            b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

            a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
            d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
            c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
            b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
            a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
            d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
            c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
            b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
            a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
            d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
            c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
            b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
            a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
            d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
            c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
            b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

            a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
            d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
            c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
            b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
            a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
            d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
            c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
            b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
            a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
            d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
            c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
            b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
            a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
            d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
            c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
            b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

            a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
            d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
            c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
            b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
            a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
            d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
            c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
            b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
            a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
            d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
            c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
            b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
            a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
            d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
            c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
            b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

            a = safe_add(a, olda);
            b = safe_add(b, oldb);
            c = safe_add(c, oldc);
            d = safe_add(d, oldd);
        }
        return [a, b, c, d];
    };


    /*
     * Calculate the HMAC-MD5, of a key and some data
     */
    var core_hmac_md5 = function (key, data) {
        var bkey = str2binl(key);
        if(bkey.length > 16) { bkey = core_md5(bkey, key.length * chrsz); }

        var ipad = new Array(16), opad = new Array(16);
        for(var i = 0; i < 16; i++)
        {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }

        var hash = core_md5(ipad.concat(str2binl(data)), 512 + data.length * chrsz);
        return core_md5(opad.concat(hash), 512 + 128);
    };

    var obj = {
        /*
         * These are the functions you'll usually want to call.
         * They take string arguments and return either hex or base-64 encoded
         * strings.
         */
        hexdigest: function (s) {
            return binl2hex(core_md5(str2binl(s), s.length * chrsz));
        },

        b64digest: function (s) {
            return binl2b64(core_md5(str2binl(s), s.length * chrsz));
        },

        hash: function (s) {
            return binl2str(core_md5(str2binl(s), s.length * chrsz));
        },

        hmac_hexdigest: function (key, data) {
            return binl2hex(core_hmac_md5(key, data));
        },

        hmac_b64digest: function (key, data) {
            return binl2b64(core_hmac_md5(key, data));
        },

        hmac_hash: function (key, data) {
            return binl2str(core_hmac_md5(key, data));
        },

        /*
         * Perform a simple self-test to see if the VM is working
         */
        test: function () {
            return MD5.hexdigest("abc") === "900150983cd24fb0d6963f7d28e17f72";
        }
    };

    return obj;
})();
/*
    This program is distributed under the terms of the MIT license.
    Please see the LICENSE file for details.

    Copyright 2006-2008, OGG, LLC
*/

/* jslint configuration: */
/*global document, window, setTimeout, clearTimeout, console,
    XMLHttpRequest, ActiveXObject,
    Base64, MD5,
    Strophe, $build, $msg, $iq, $pres */

/** File: strophe.js
 *  A JavaScript library for XMPP BOSH.
 *
 *  This is the JavaScript version of the Strophe library.  Since JavaScript
 *  has no facilities for persistent TCP connections, this library uses
 *  Bidirectional-streams Over Synchronous HTTP (BOSH) to emulate
 *  a persistent, stateful, two-way connection to an XMPP server.  More
 *  information on BOSH can be found in XEP 124.
 */

/** PrivateFunction: Function.prototype.bind
 *  Bind a function to an instance.
 *
 *  This Function object extension method creates a bound method similar
 *  to those in Python.  This means that the 'this' object will point
 *  to the instance you want.  See
 *  <a href='https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind'>MDC's bind() documentation</a> and 
 *  <a href='http://benjamin.smedbergs.us/blog/2007-01-03/bound-functions-and-function-imports-in-javascript/'>Bound Functions and Function Imports in JavaScript</a>
 *  for a complete explanation.
 *
 *  This extension already exists in some browsers (namely, Firefox 3), but
 *  we provide it to support those that don't.
 *
 *  Parameters:
 *    (Object) obj - The object that will become 'this' in the bound function.
 *    (Object) argN - An option argument that will be prepended to the 
 *      arguments given for the function call
 *
 *  Returns:
 *    The bound function.
 */
if (!Function.prototype.bind) {
    Function.prototype.bind = function (obj /*, arg1, arg2, ... */)
    {
        var func = this;
        var _slice = Array.prototype.slice;
        var _concat = Array.prototype.concat;
        var _args = _slice.call(arguments, 1);

        return function () {
            return func.apply(obj ? obj : this,
                              _concat.call(_args,
                                           _slice.call(arguments, 0)));
        };
    };
}

/** PrivateFunction: Array.prototype.indexOf
 *  Return the index of an object in an array.
 *
 *  This function is not supplied by some JavaScript implementations, so
 *  we provide it if it is missing.  This code is from:
 *  http://developer.mozilla.org/En/Core_JavaScript_1.5_Reference:Objects:Array:indexOf
 *
 *  Parameters:
 *    (Object) elt - The object to look for.
 *    (Integer) from - The index from which to start looking. (optional).
 *
 *  Returns:
 *    The index of elt in the array or -1 if not found.
 */
if (!Array.prototype.indexOf)
{
    Array.prototype.indexOf = function(elt /*, from*/)
    {
        var len = this.length;

        var from = Number(arguments[1]) || 0;
        from = (from < 0) ? Math.ceil(from) : Math.floor(from);
        if (from < 0) {
            from += len;
        }

        for (; from < len; from++) {
            if (from in this && this[from] === elt) {
                return from;
            }
        }

        return -1;
    };
}

/* All of the Strophe globals are defined in this special function below so
 * that references to the globals become closures.  This will ensure that
 * on page reload, these references will still be available to callbacks
 * that are still executing.
 */

(function (callback) {
var Strophe;

/** Function: $build
 *  Create a Strophe.Builder.
 *  This is an alias for 'new Strophe.Builder(name, attrs)'.
 *
 *  Parameters:
 *    (String) name - The root element name.
 *    (Object) attrs - The attributes for the root element in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder object.
 */
function $build(name, attrs) { return new Strophe.Builder(name, attrs); }
/** Function: $msg
 *  Create a Strophe.Builder with a <message/> element as the root.
 *
 *  Parmaeters:
 *    (Object) attrs - The <message/> element attributes in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder object.
 */
function $msg(attrs) { return new Strophe.Builder("message", attrs); }
/** Function: $iq
 *  Create a Strophe.Builder with an <iq/> element as the root.
 *
 *  Parameters:
 *    (Object) attrs - The <iq/> element attributes in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder object.
 */
function $iq(attrs) { return new Strophe.Builder("iq", attrs); }
/** Function: $pres
 *  Create a Strophe.Builder with a <presence/> element as the root.
 *
 *  Parameters:
 *    (Object) attrs - The <presence/> element attributes in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder object.
 */
function $pres(attrs) { return new Strophe.Builder("presence", attrs); }

/** Class: Strophe
 *  An object container for all Strophe library functions.
 *
 *  This class is just a container for all the objects and constants
 *  used in the library.  It is not meant to be instantiated, but to
 *  provide a namespace for library objects, constants, and functions.
 */
Strophe = {
    /** Constant: VERSION
     *  The version of the Strophe library. Unreleased builds will have
     *  a version of head-HASH where HASH is a partial revision.
     */
    VERSION: "42cc694",

    /** Constants: XMPP Namespace Constants
     *  Common namespace constants from the XMPP RFCs and XEPs.
     *
     *  NS.HTTPBIND - HTTP BIND namespace from XEP 124.
     *  NS.BOSH - BOSH namespace from XEP 206.
     *  NS.CLIENT - Main XMPP client namespace.
     *  NS.AUTH - Legacy authentication namespace.
     *  NS.ROSTER - Roster operations namespace.
     *  NS.PROFILE - Profile namespace.
     *  NS.DISCO_INFO - Service discovery info namespace from XEP 30.
     *  NS.DISCO_ITEMS - Service discovery items namespace from XEP 30.
     *  NS.MUC - Multi-User Chat namespace from XEP 45.
     *  NS.SASL - XMPP SASL namespace from RFC 3920.
     *  NS.STREAM - XMPP Streams namespace from RFC 3920.
     *  NS.BIND - XMPP Binding namespace from RFC 3920.
     *  NS.SESSION - XMPP Session namespace from RFC 3920.
     *  NS.XHTML_IM - XHTML-IM namespace from XEP 71.
     *  NS.XHTML - XHTML body namespace from XEP 71.
     */
    NS: {
        HTTPBIND: "http://jabber.org/protocol/httpbind",
        BOSH: "urn:xmpp:xbosh",
        CLIENT: "jabber:client",
        AUTH: "jabber:iq:auth",
        ROSTER: "jabber:iq:roster",
        PROFILE: "jabber:iq:profile",
        DISCO_INFO: "http://jabber.org/protocol/disco#info",
        DISCO_ITEMS: "http://jabber.org/protocol/disco#items",
        MUC: "http://jabber.org/protocol/muc",
        SASL: "urn:ietf:params:xml:ns:xmpp-sasl",
        STREAM: "http://etherx.jabber.org/streams",
        BIND: "urn:ietf:params:xml:ns:xmpp-bind",
        SESSION: "urn:ietf:params:xml:ns:xmpp-session",
        VERSION: "jabber:iq:version",
        STANZAS: "urn:ietf:params:xml:ns:xmpp-stanzas",
        XHTML_IM: "http://jabber.org/protocol/xhtml-im",
        XHTML: "http://www.w3.org/1999/xhtml"
    },


    /** Constants: XHTML_IM Namespace 
     *  contains allowed tags, tag attributes, and css properties. 
     *  Used in the createHtml function to filter incoming html into the allowed XHTML-IM subset.
     *  See http://xmpp.org/extensions/xep-0071.html#profile-summary for the list of recommended
     *  allowed tags and their attributes.
     */
    XHTML: {
		tags: ['a','blockquote','br','cite','em','img','li','ol','p','span','strong','ul','body'],
		attributes: {
			'a':          ['href'],
			'blockquote': ['style'],
			'br':         [],
			'cite':       ['style'],
			'em':         [],
			'img':        ['src', 'alt', 'style', 'height', 'width'],
			'li':         ['style'],
			'ol':         ['style'],
			'p':          ['style'],
			'span':       ['style'],
			'strong':     [],
			'ul':         ['style'],
			'body':       []
		},
		css: ['background-color','color','font-family','font-size','font-style','font-weight','margin-left','margin-right','text-align','text-decoration'],
		validTag: function(tag)
		{
			for(var i = 0; i < Strophe.XHTML.tags.length; i++) {
				if(tag == Strophe.XHTML.tags[i]) {
					return true;
				}
			}
			return false;
		},
		validAttribute: function(tag, attribute)
		{
			if(typeof Strophe.XHTML.attributes[tag] !== 'undefined' && Strophe.XHTML.attributes[tag].length > 0) {
				for(var i = 0; i < Strophe.XHTML.attributes[tag].length; i++) {
					if(attribute == Strophe.XHTML.attributes[tag][i]) {
						return true;
					}
				}
			}
			return false;
		},
		validCSS: function(style)
		{
			for(var i = 0; i < Strophe.XHTML.css.length; i++) {
				if(style == Strophe.XHTML.css[i]) {
					return true;
				}
			}
			return false;
		}
    },

    /** Function: addNamespace 
     *  This function is used to extend the current namespaces in
     *	Strophe.NS.  It takes a key and a value with the key being the
     *	name of the new namespace, with its actual value.
     *	For example:
     *	Strophe.addNamespace('PUBSUB', "http://jabber.org/protocol/pubsub");
     *
     *  Parameters:
     *    (String) name - The name under which the namespace will be
     *      referenced under Strophe.NS
     *    (String) value - The actual namespace.
     */
    addNamespace: function (name, value)
    {
	    Strophe.NS[name] = value;
    },

    /** Constants: Connection Status Constants
     *  Connection status constants for use by the connection handler
     *  callback.
     *
     *  Status.ERROR - An error has occurred
     *  Status.CONNECTING - The connection is currently being made
     *  Status.CONNFAIL - The connection attempt failed
     *  Status.AUTHENTICATING - The connection is authenticating
     *  Status.AUTHFAIL - The authentication attempt failed
     *  Status.CONNECTED - The connection has succeeded
     *  Status.DISCONNECTED - The connection has been terminated
     *  Status.DISCONNECTING - The connection is currently being terminated
     *  Status.ATTACHED - The connection has been attached
     */
    Status: {
        ERROR: 0,
        CONNECTING: 1,
        CONNFAIL: 2,
        AUTHENTICATING: 3,
        AUTHFAIL: 4,
        CONNECTED: 5,
        DISCONNECTED: 6,
        DISCONNECTING: 7,
        ATTACHED: 8
    },

    /** Constants: Log Level Constants
     *  Logging level indicators.
     *
     *  LogLevel.DEBUG - Debug output
     *  LogLevel.INFO - Informational output
     *  LogLevel.WARN - Warnings
     *  LogLevel.ERROR - Errors
     *  LogLevel.FATAL - Fatal errors
     */
    LogLevel: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        FATAL: 4
    },

    /** PrivateConstants: DOM Element Type Constants
     *  DOM element types.
     *
     *  ElementType.NORMAL - Normal element.
     *  ElementType.TEXT - Text data element.
     *  ElementType.FRAGMENT - XHTML fragment element.
     */
    ElementType: {
        NORMAL: 1,
        TEXT: 3,
        CDATA: 4,
        FRAGMENT: 11
    },

    /** PrivateConstants: Timeout Values
     *  Timeout values for error states.  These values are in seconds.
     *  These should not be changed unless you know exactly what you are
     *  doing.
     *
     *  TIMEOUT - Timeout multiplier. A waiting request will be considered
     *      failed after Math.floor(TIMEOUT * wait) seconds have elapsed.
     *      This defaults to 1.1, and with default wait, 66 seconds.
     *  SECONDARY_TIMEOUT - Secondary timeout multiplier. In cases where
     *      Strophe can detect early failure, it will consider the request
     *      failed if it doesn't return after
     *      Math.floor(SECONDARY_TIMEOUT * wait) seconds have elapsed.
     *      This defaults to 0.1, and with default wait, 6 seconds.
     */
    TIMEOUT: 1.1,
    SECONDARY_TIMEOUT: 0.1,

    /** Function: forEachChild
     *  Map a function over some or all child elements of a given element.
     *
     *  This is a small convenience function for mapping a function over
     *  some or all of the children of an element.  If elemName is null, all
     *  children will be passed to the function, otherwise only children
     *  whose tag names match elemName will be passed.
     *
     *  Parameters:
     *    (XMLElement) elem - The element to operate on.
     *    (String) elemName - The child element tag name filter.
     *    (Function) func - The function to apply to each child.  This
     *      function should take a single argument, a DOM element.
     */
    forEachChild: function (elem, elemName, func)
    {
        var i, childNode;

        for (i = 0; i < elem.childNodes.length; i++) {
            childNode = elem.childNodes[i];
            if (childNode.nodeType == Strophe.ElementType.NORMAL &&
                (!elemName || this.isTagEqual(childNode, elemName))) {
                func(childNode);
            }
        }
    },

    /** Function: isTagEqual
     *  Compare an element's tag name with a string.
     *
     *  This function is case insensitive.
     *
     *  Parameters:
     *    (XMLElement) el - A DOM element.
     *    (String) name - The element name.
     *
     *  Returns:
     *    true if the element's tag name matches _el_, and false
     *    otherwise.
     */
    isTagEqual: function (el, name)
    {
        return el.tagName.toLowerCase() == name.toLowerCase();
    },

    /** PrivateVariable: _xmlGenerator
     *  _Private_ variable that caches a DOM document to
     *  generate elements.
     */
    _xmlGenerator: null,

    /** PrivateFunction: _makeGenerator
     *  _Private_ function that creates a dummy XML DOM document to serve as
     *  an element and text node generator.
     */
    _makeGenerator: function () {
        var doc;

        // IE9 does implement createDocument(); however, using it will cause the browser to leak memory on page unload.
        // Here, we test for presence of createDocument() plus IE's proprietary documentMode attribute, which would be 
		// less than 10 in the case of IE9 and below.
        if (document.implementation.createDocument === undefined || 
			document.implementation.createDocument && document.documentMode && document.documentMode < 10) {
            doc = this._getIEXmlDom();
            doc.appendChild(doc.createElement('strophe'));
        } else {
            doc = document.implementation
                .createDocument('jabber:client', 'strophe', null);
        }

        return doc;
    },

    /** Function: xmlGenerator
     *  Get the DOM document to generate elements.
     *
     *  Returns:
     *    The currently used DOM document.
     */
    xmlGenerator: function () {
        if (!Strophe._xmlGenerator) {
            Strophe._xmlGenerator = Strophe._makeGenerator();
        }
        return Strophe._xmlGenerator;
    },

    /** PrivateFunction: _getIEXmlDom
     *  Gets IE xml doc object
     *
     *  Returns:
     *    A Microsoft XML DOM Object
     *  See Also:
     *    http://msdn.microsoft.com/en-us/library/ms757837%28VS.85%29.aspx
     */
    _getIEXmlDom : function() {
        var doc = null;
        var docStrings = [
            "Msxml2.DOMDocument.6.0",
            "Msxml2.DOMDocument.5.0",
            "Msxml2.DOMDocument.4.0",
            "MSXML2.DOMDocument.3.0",
            "MSXML2.DOMDocument",
            "MSXML.DOMDocument",
            "Microsoft.XMLDOM"
        ];

        for (var d = 0; d < docStrings.length; d++) {
            if (doc === null) {
                try {
                    doc = new ActiveXObject(docStrings[d]);
                } catch (e) {
                    doc = null;
                }
            } else {
                break;
            }
        }

        return doc;
    },

    /** Function: xmlElement
     *  Create an XML DOM element.
     *
     *  This function creates an XML DOM element correctly across all
     *  implementations. Note that these are not HTML DOM elements, which
     *  aren't appropriate for XMPP stanzas.
     *
     *  Parameters:
     *    (String) name - The name for the element.
     *    (Array|Object) attrs - An optional array or object containing
     *      key/value pairs to use as element attributes. The object should
     *      be in the format {'key': 'value'} or {key: 'value'}. The array
     *      should have the format [['key1', 'value1'], ['key2', 'value2']].
     *    (String) text - The text child data for the element.
     *
     *  Returns:
     *    A new XML DOM element.
     */
    xmlElement: function (name)
    {
        if (!name) { return null; }

        var node = Strophe.xmlGenerator().createElement(name);

        // FIXME: this should throw errors if args are the wrong type or
        // there are more than two optional args
        var a, i, k;
        for (a = 1; a < arguments.length; a++) {
            if (!arguments[a]) { continue; }
            if (typeof(arguments[a]) == "string" ||
                typeof(arguments[a]) == "number") {
                node.appendChild(Strophe.xmlTextNode(arguments[a]));
            } else if (typeof(arguments[a]) == "object" &&
                       typeof(arguments[a].sort) == "function") {
                for (i = 0; i < arguments[a].length; i++) {
                    if (typeof(arguments[a][i]) == "object" &&
                        typeof(arguments[a][i].sort) == "function") {
                        node.setAttribute(arguments[a][i][0],
                                          arguments[a][i][1]);
                    }
                }
            } else if (typeof(arguments[a]) == "object") {
                for (k in arguments[a]) {
                    if (arguments[a].hasOwnProperty(k)) {
                        node.setAttribute(k, arguments[a][k]);
                    }
                }
            }
        }

        return node;
    },

    /*  Function: xmlescape
     *  Excapes invalid xml characters.
     *
     *  Parameters:
     *     (String) text - text to escape.
     *
     *	Returns:
     *      Escaped text.
     */
    xmlescape: function(text)
    {
        text = text.replace(/\&/g, "&amp;");
        text = text.replace(/</g,  "&lt;");
        text = text.replace(/>/g,  "&gt;");
        text = text.replace(/'/g,  "&apos;");
        text = text.replace(/"/g,  "&quot;");
        return text;
    },

    /** Function: xmlTextNode
     *  Creates an XML DOM text node.
     *
     *  Provides a cross implementation version of document.createTextNode.
     *
     *  Parameters:
     *    (String) text - The content of the text node.
     *
     *  Returns:
     *    A new XML DOM text node.
     */
    xmlTextNode: function (text)
    {
        return Strophe.xmlGenerator().createTextNode(text);
    },

    /** Function: xmlHtmlNode
     *  Creates an XML DOM html node.
     *
     *  Parameters:
     *    (String) html - The content of the html node.
     *
     *  Returns:
     *    A new XML DOM text node.
     */
    xmlHtmlNode: function (html)
    {
        //ensure text is escaped
        if (window.DOMParser) {
            parser = new DOMParser();
            node = parser.parseFromString(html, "text/xml");
        } else {
            node = new ActiveXObject("Microsoft.XMLDOM");
            node.async="false";
            node.loadXML(html);
        }
        return node;
    },

    /** Function: getText
     *  Get the concatenation of all text children of an element.
     *
     *  Parameters:
     *    (XMLElement) elem - A DOM element.
     *
     *  Returns:
     *    A String with the concatenated text of all text element children.
     */
    getText: function (elem)
    {
        if (!elem) { return null; }

        var str = "";
        if (elem.childNodes.length === 0 && elem.nodeType ==
            Strophe.ElementType.TEXT) {
            str += elem.nodeValue;
        }

        for (var i = 0; i < elem.childNodes.length; i++) {
            if (elem.childNodes[i].nodeType == Strophe.ElementType.TEXT) {
                str += elem.childNodes[i].nodeValue;
            }
        }

        return Strophe.xmlescape(str);
    },

    /** Function: copyElement
     *  Copy an XML DOM element.
     *
     *  This function copies a DOM element and all its descendants and returns
     *  the new copy.
     *
     *  Parameters:
     *    (XMLElement) elem - A DOM element.
     *
     *  Returns:
     *    A new, copied DOM element tree.
     */
    copyElement: function (elem)
    {
        var i, el;
        if (elem.nodeType == Strophe.ElementType.NORMAL) {
            el = Strophe.xmlElement(elem.tagName);

            for (i = 0; i < elem.attributes.length; i++) {
                el.setAttribute(elem.attributes[i].nodeName.toLowerCase(),
                                elem.attributes[i].value);
            }

            for (i = 0; i < elem.childNodes.length; i++) {
                el.appendChild(Strophe.copyElement(elem.childNodes[i]));
            }
        } else if (elem.nodeType == Strophe.ElementType.TEXT) {
            el = Strophe.xmlGenerator().createTextNode(elem.nodeValue);
        }

        return el;
    },


    /** Function: createHtml
     *  Copy an HTML DOM element into an XML DOM.
     *
     *  This function copies a DOM element and all its descendants and returns
     *  the new copy.
     *
     *  Parameters:
     *    (HTMLElement) elem - A DOM element.
     *
     *  Returns:
     *    A new, copied DOM element tree.
     */
    createHtml: function (elem)
    {
        var i, el, j, tag, attribute, value, css, cssAttrs, attr, cssName, cssValue, children, child;
        if (elem.nodeType == Strophe.ElementType.NORMAL) {
            tag = elem.nodeName.toLowerCase();
            if(Strophe.XHTML.validTag(tag)) {
                try {
                    el = Strophe.xmlElement(tag);
                    for(i = 0; i < Strophe.XHTML.attributes[tag].length; i++) {
                        attribute = Strophe.XHTML.attributes[tag][i];
                        value = elem.getAttribute(attribute);
                        if(typeof value == 'undefined' || value === null || value === '' || value === false || value === 0) {
                            continue;
                        }
                        if(attribute == 'style' && typeof value == 'object') {
                            if(typeof value.cssText != 'undefined') {
                                value = value.cssText; // we're dealing with IE, need to get CSS out
                            }
                        }
                        // filter out invalid css styles
                        if(attribute == 'style') {
                            css = [];
                            cssAttrs = value.split(';');
                            for(j = 0; j < cssAttrs.length; j++) {
                                attr = cssAttrs[j].split(':');
                                cssName = attr[0].replace(/^\s*/, "").replace(/\s*$/, "").toLowerCase();
                                if(Strophe.XHTML.validCSS(cssName)) {
                                    cssValue = attr[1].replace(/^\s*/, "").replace(/\s*$/, "");
                                    css.push(cssName + ': ' + cssValue);
                                }
                            }
                            if(css.length > 0) {
                                value = css.join('; ');
                                el.setAttribute(attribute, value);
                            }
                        } else {
                            el.setAttribute(attribute, value);
                        }
                    }

                    for (i = 0; i < elem.childNodes.length; i++) {
                        el.appendChild(Strophe.createHtml(elem.childNodes[i]));
                    }
                } catch(e) { // invalid elements
                  el = Strophe.xmlTextNode('');
                }
            } else {
                el = Strophe.xmlGenerator().createDocumentFragment();
                for (i = 0; i < elem.childNodes.length; i++) {
                    el.appendChild(Strophe.createHtml(elem.childNodes[i]));
                }
            }
        } else if (elem.nodeType == Strophe.ElementType.FRAGMENT) {
            el = Strophe.xmlGenerator().createDocumentFragment();
            for (i = 0; i < elem.childNodes.length; i++) {
                el.appendChild(Strophe.createHtml(elem.childNodes[i]));
            }
        } else if (elem.nodeType == Strophe.ElementType.TEXT) {
            el = Strophe.xmlTextNode(elem.nodeValue);
        }

        return el;
    },

    /** Function: escapeNode
     *  Escape the node part (also called local part) of a JID.
     *
     *  Parameters:
     *    (String) node - A node (or local part).
     *
     *  Returns:
     *    An escaped node (or local part).
     */
    escapeNode: function (node)
    {
        return node.replace(/^\s+|\s+$/g, '')
            .replace(/\\/g,  "\\5c")
            .replace(/ /g,   "\\20")
            .replace(/\"/g,  "\\22")
            .replace(/\&/g,  "\\26")
            .replace(/\'/g,  "\\27")
            .replace(/\//g,  "\\2f")
            .replace(/:/g,   "\\3a")
            .replace(/</g,   "\\3c")
            .replace(/>/g,   "\\3e")
            .replace(/@/g,   "\\40");
    },

    /** Function: unescapeNode
     *  Unescape a node part (also called local part) of a JID.
     *
     *  Parameters:
     *    (String) node - A node (or local part).
     *
     *  Returns:
     *    An unescaped node (or local part).
     */
    unescapeNode: function (node)
    {
        return node.replace(/\\20/g, " ")
            .replace(/\\22/g, '"')
            .replace(/\\26/g, "&")
            .replace(/\\27/g, "'")
            .replace(/\\2f/g, "/")
            .replace(/\\3a/g, ":")
            .replace(/\\3c/g, "<")
            .replace(/\\3e/g, ">")
            .replace(/\\40/g, "@")
            .replace(/\\5c/g, "\\");
    },

    /** Function: getNodeFromJid
     *  Get the node portion of a JID String.
     *
     *  Parameters:
     *    (String) jid - A JID.
     *
     *  Returns:
     *    A String containing the node.
     */
    getNodeFromJid: function (jid)
    {
        if (jid.indexOf("@") < 0) { return null; }
        return jid.split("@")[0];
    },

    /** Function: getDomainFromJid
     *  Get the domain portion of a JID String.
     *
     *  Parameters:
     *    (String) jid - A JID.
     *
     *  Returns:
     *    A String containing the domain.
     */
    getDomainFromJid: function (jid)
    {
        var bare = Strophe.getBareJidFromJid(jid);
        if (bare.indexOf("@") < 0) {
            return bare;
        } else {
            var parts = bare.split("@");
            parts.splice(0, 1);
            return parts.join('@');
        }
    },

    /** Function: getResourceFromJid
     *  Get the resource portion of a JID String.
     *
     *  Parameters:
     *    (String) jid - A JID.
     *
     *  Returns:
     *    A String containing the resource.
     */
    getResourceFromJid: function (jid)
    {
        var s = jid.split("/");
        if (s.length < 2) { return null; }
        s.splice(0, 1);
        return s.join('/');
    },

    /** Function: getBareJidFromJid
     *  Get the bare JID from a JID String.
     *
     *  Parameters:
     *    (String) jid - A JID.
     *
     *  Returns:
     *    A String containing the bare JID.
     */
    getBareJidFromJid: function (jid)
    {
        return jid ? jid.split("/")[0] : null;
    },

    /** Function: log
     *  User overrideable logging function.
     *
     *  This function is called whenever the Strophe library calls any
     *  of the logging functions.  The default implementation of this
     *  function does nothing.  If client code wishes to handle the logging
     *  messages, it should override this with
     *  > Strophe.log = function (level, msg) {
     *  >   (user code here)
     *  > };
     *
     *  Please note that data sent and received over the wire is logged
     *  via Strophe.Connection.rawInput() and Strophe.Connection.rawOutput().
     *
     *  The different levels and their meanings are
     *
     *    DEBUG - Messages useful for debugging purposes.
     *    INFO - Informational messages.  This is mostly information like
     *      'disconnect was called' or 'SASL auth succeeded'.
     *    WARN - Warnings about potential problems.  This is mostly used
     *      to report transient connection errors like request timeouts.
     *    ERROR - Some error occurred.
     *    FATAL - A non-recoverable fatal error occurred.
     *
     *  Parameters:
     *    (Integer) level - The log level of the log message.  This will
     *      be one of the values in Strophe.LogLevel.
     *    (String) msg - The log message.
     */
    log: function (level, msg)
    {
        return;
    },

    /** Function: debug
     *  Log a message at the Strophe.LogLevel.DEBUG level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    debug: function(msg)
    {
        this.log(this.LogLevel.DEBUG, msg);
    },

    /** Function: info
     *  Log a message at the Strophe.LogLevel.INFO level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    info: function (msg)
    {
        this.log(this.LogLevel.INFO, msg);
    },

    /** Function: warn
     *  Log a message at the Strophe.LogLevel.WARN level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    warn: function (msg)
    {
        this.log(this.LogLevel.WARN, msg);
    },

    /** Function: error
     *  Log a message at the Strophe.LogLevel.ERROR level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    error: function (msg)
    {
        this.log(this.LogLevel.ERROR, msg);
    },

    /** Function: fatal
     *  Log a message at the Strophe.LogLevel.FATAL level.
     *
     *  Parameters:
     *    (String) msg - The log message.
     */
    fatal: function (msg)
    {
        this.log(this.LogLevel.FATAL, msg);
    },

    /** Function: serialize
     *  Render a DOM element and all descendants to a String.
     *
     *  Parameters:
     *    (XMLElement) elem - A DOM element.
     *
     *  Returns:
     *    The serialized element tree as a String.
     */
    serialize: function (elem)
    {
        var result;

        if (!elem) { return null; }

        if (typeof(elem.tree) === "function") {
            elem = elem.tree();
        }

        var nodeName = elem.nodeName;
        var i, child;

        if (elem.getAttribute("_realname")) {
            nodeName = elem.getAttribute("_realname");
        }

        result = "<" + nodeName;
        for (i = 0; i < elem.attributes.length; i++) {
               if(elem.attributes[i].nodeName != "_realname") {
                 result += " " + elem.attributes[i].nodeName.toLowerCase() +
                "='" + elem.attributes[i].value
                    .replace(/&/g, "&amp;")
                       .replace(/\'/g, "&apos;")
                       .replace(/>/g, "&gt;")
                       .replace(/</g, "&lt;") + "'";
               }
        }

        if (elem.childNodes.length > 0) {
            result += ">";
            for (i = 0; i < elem.childNodes.length; i++) {
                child = elem.childNodes[i];
                switch( child.nodeType ){
                  case Strophe.ElementType.NORMAL:
                    // normal element, so recurse
                    result += Strophe.serialize(child);
                    break;
                  case Strophe.ElementType.TEXT:
                    // text element to escape values
                    result += Strophe.xmlescape(child.nodeValue);
                    break;
                  case Strophe.ElementType.CDATA:
                    // cdata section so don't escape values
                    result += "<![CDATA["+child.nodeValue+"]]>";
                }
            }
            result += "</" + nodeName + ">";
        } else {
            result += "/>";
        }

        return result;
    },

    /** PrivateVariable: _requestId
     *  _Private_ variable that keeps track of the request ids for
     *  connections.
     */
    _requestId: 0,

    /** PrivateVariable: Strophe.connectionPlugins
     *  _Private_ variable Used to store plugin names that need
     *  initialization on Strophe.Connection construction.
     */
    _connectionPlugins: {},

    /** Function: addConnectionPlugin
     *  Extends the Strophe.Connection object with the given plugin.
     *
     *  Parameters:
     *    (String) name - The name of the extension.
     *    (Object) ptype - The plugin's prototype.
     */
    addConnectionPlugin: function (name, ptype)
    {
        Strophe._connectionPlugins[name] = ptype;
    }
};

/** Class: Strophe.Builder
 *  XML DOM builder.
 *
 *  This object provides an interface similar to JQuery but for building
 *  DOM element easily and rapidly.  All the functions except for toString()
 *  and tree() return the object, so calls can be chained.  Here's an
 *  example using the $iq() builder helper.
 *  > $iq({to: 'you', from: 'me', type: 'get', id: '1'})
 *  >     .c('query', {xmlns: 'strophe:example'})
 *  >     .c('example')
 *  >     .toString()
 *  The above generates this XML fragment
 *  > <iq to='you' from='me' type='get' id='1'>
 *  >   <query xmlns='strophe:example'>
 *  >     <example/>
 *  >   </query>
 *  > </iq>
 *  The corresponding DOM manipulations to get a similar fragment would be
 *  a lot more tedious and probably involve several helper variables.
 *
 *  Since adding children makes new operations operate on the child, up()
 *  is provided to traverse up the tree.  To add two children, do
 *  > builder.c('child1', ...).up().c('child2', ...)
 *  The next operation on the Builder will be relative to the second child.
 */

/** Constructor: Strophe.Builder
 *  Create a Strophe.Builder object.
 *
 *  The attributes should be passed in object notation.  For example
 *  > var b = new Builder('message', {to: 'you', from: 'me'});
 *  or
 *  > var b = new Builder('messsage', {'xml:lang': 'en'});
 *
 *  Parameters:
 *    (String) name - The name of the root element.
 *    (Object) attrs - The attributes for the root element in object notation.
 *
 *  Returns:
 *    A new Strophe.Builder.
 */
Strophe.Builder = function (name, attrs)
{
    // Set correct namespace for jabber:client elements
    if (name == "presence" || name == "message" || name == "iq") {
        if (attrs && !attrs.xmlns) {
            attrs.xmlns = Strophe.NS.CLIENT;
        } else if (!attrs) {
            attrs = {xmlns: Strophe.NS.CLIENT};
        }
    }

    // Holds the tree being built.
    this.nodeTree = Strophe.xmlElement(name, attrs);

    // Points to the current operation node.
    this.node = this.nodeTree;
};

Strophe.Builder.prototype = {
    /** Function: tree
     *  Return the DOM tree.
     *
     *  This function returns the current DOM tree as an element object.  This
     *  is suitable for passing to functions like Strophe.Connection.send().
     *
     *  Returns:
     *    The DOM tree as a element object.
     */
    tree: function ()
    {
        return this.nodeTree;
    },

    /** Function: toString
     *  Serialize the DOM tree to a String.
     *
     *  This function returns a string serialization of the current DOM
     *  tree.  It is often used internally to pass data to a
     *  Strophe.Request object.
     *
     *  Returns:
     *    The serialized DOM tree in a String.
     */
    toString: function ()
    {
        return Strophe.serialize(this.nodeTree);
    },

    /** Function: up
     *  Make the current parent element the new current element.
     *
     *  This function is often used after c() to traverse back up the tree.
     *  For example, to add two children to the same element
     *  > builder.c('child1', {}).up().c('child2', {});
     *
     *  Returns:
     *    The Stophe.Builder object.
     */
    up: function ()
    {
        this.node = this.node.parentNode;
        return this;
    },

    /** Function: attrs
     *  Add or modify attributes of the current element.
     *
     *  The attributes should be passed in object notation.  This function
     *  does not move the current element pointer.
     *
     *  Parameters:
     *    (Object) moreattrs - The attributes to add/modify in object notation.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    attrs: function (moreattrs)
    {
        for (var k in moreattrs) {
            if (moreattrs.hasOwnProperty(k)) {
                this.node.setAttribute(k, moreattrs[k]);
            }
        }
        return this;
    },

    /** Function: c
     *  Add a child to the current element and make it the new current
     *  element.
     *
     *  This function moves the current element pointer to the child,
     *  unless text is provided.  If you need to add another child, it
     *  is necessary to use up() to go back to the parent in the tree.
     *
     *  Parameters:
     *    (String) name - The name of the child.
     *    (Object) attrs - The attributes of the child in object notation.
     *    (String) text - The text to add to the child.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    c: function (name, attrs, text)
    {
        var child = Strophe.xmlElement(name, attrs, text);
        this.node.appendChild(child);
        if (!text) {
            this.node = child;
        }
        return this;
    },

    /** Function: cnode
     *  Add a child to the current element and make it the new current
     *  element.
     *
     *  This function is the same as c() except that instead of using a
     *  name and an attributes object to create the child it uses an
     *  existing DOM element object.
     *
     *  Parameters:
     *    (XMLElement) elem - A DOM element.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    cnode: function (elem)
    {
        var xmlGen = Strophe.xmlGenerator();
        try {
            var impNode = (xmlGen.importNode !== undefined);
        }
        catch (e) {
            var impNode = false;
        }
        var newElem = impNode ?
                      xmlGen.importNode(elem, true) :
                      Strophe.copyElement(elem);
        this.node.appendChild(newElem);
        this.node = newElem;
        return this;
    },

    /** Function: t
     *  Add a child text element.
     *
     *  This *does not* make the child the new current element since there
     *  are no children of text elements.
     *
     *  Parameters:
     *    (String) text - The text data to append to the current element.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    t: function (text)
    {
        var child = Strophe.xmlTextNode(text);
        this.node.appendChild(child);
        return this;
    },

    /** Function: h
     *  Replace current element contents with the HTML passed in.
     *
     *  This *does not* make the child the new current element
     *
     *  Parameters:
     *    (String) html - The html to insert as contents of current element.
     *
     *  Returns:
     *    The Strophe.Builder object.
     */
    h: function (html)
    {
        var fragment = document.createElement('body');

        // force the browser to try and fix any invalid HTML tags
        fragment.innerHTML = html;

        // copy cleaned html into an xml dom
        var xhtml = Strophe.createHtml(fragment);

        while(xhtml.childNodes.length > 0) {
            this.node.appendChild(xhtml.childNodes[0]);
        }
        return this;
    }
};

/** PrivateClass: Strophe.Handler
 *  _Private_ helper class for managing stanza handlers.
 *
 *  A Strophe.Handler encapsulates a user provided callback function to be
 *  executed when matching stanzas are received by the connection.
 *  Handlers can be either one-off or persistant depending on their
 *  return value. Returning true will cause a Handler to remain active, and
 *  returning false will remove the Handler.
 *
 *  Users will not use Strophe.Handler objects directly, but instead they
 *  will use Strophe.Connection.addHandler() and
 *  Strophe.Connection.deleteHandler().
 */

/** PrivateConstructor: Strophe.Handler
 *  Create and initialize a new Strophe.Handler.
 *
 *  Parameters:
 *    (Function) handler - A function to be executed when the handler is run.
 *    (String) ns - The namespace to match.
 *    (String) name - The element name to match.
 *    (String) type - The element type to match.
 *    (String) id - The element id attribute to match.
 *    (String) from - The element from attribute to match.
 *    (Object) options - Handler options
 *
 *  Returns:
 *    A new Strophe.Handler object.
 */
Strophe.Handler = function (handler, ns, name, type, id, from, options)
{
    this.handler = handler;
    this.ns = ns;
    this.name = name;
    this.type = type;
    this.id = id;
    this.options = options || {matchbare: false};
    
    // default matchBare to false if undefined
    if (!this.options.matchBare) {
        this.options.matchBare = false;
    }

    if (this.options.matchBare) {
        this.from = from ? Strophe.getBareJidFromJid(from) : null;
    } else {
        this.from = from;
    }

    // whether the handler is a user handler or a system handler
    this.user = true;
};

Strophe.Handler.prototype = {
    /** PrivateFunction: isMatch
     *  Tests if a stanza matches the Strophe.Handler.
     *
     *  Parameters:
     *    (XMLElement) elem - The XML element to test.
     *
     *  Returns:
     *    true if the stanza matches and false otherwise.
     */
    isMatch: function (elem)
    {
        var nsMatch;
        var from = null;
        
        if (this.options.matchBare) {
            from = Strophe.getBareJidFromJid(elem.getAttribute('from'));
        } else {
            from = elem.getAttribute('from');
        }

        nsMatch = false;
        if (!this.ns) {
            nsMatch = true;
        } else {
            var that = this;
            Strophe.forEachChild(elem, null, function (elem) {
                if (elem.getAttribute("xmlns") == that.ns) {
                    nsMatch = true;
                }
            });

            nsMatch = nsMatch || elem.getAttribute("xmlns") == this.ns;
        }

        if (nsMatch &&
            (!this.name || Strophe.isTagEqual(elem, this.name)) &&
            (!this.type || elem.getAttribute("type") == this.type) &&
            (!this.id || elem.getAttribute("id") == this.id) &&
            (!this.from || from == this.from)) {
                return true;
        }

        return false;
    },

    /** PrivateFunction: run
     *  Run the callback on a matching stanza.
     *
     *  Parameters:
     *    (XMLElement) elem - The DOM element that triggered the
     *      Strophe.Handler.
     *
     *  Returns:
     *    A boolean indicating if the handler should remain active.
     */
    run: function (elem)
    {
        var result = null;
        try {
            result = this.handler(elem);
        } catch (e) {
            if (e.sourceURL) {
                Strophe.fatal("error: " + this.handler +
                              " " + e.sourceURL + ":" +
                              e.line + " - " + e.name + ": " + e.message);
            } else if (e.fileName) {
                if (typeof(console) != "undefined") {
                    console.trace();
                    console.error(this.handler, " - error - ", e, e.message);
                }
                Strophe.fatal("error: " + this.handler + " " +
                              e.fileName + ":" + e.lineNumber + " - " +
                              e.name + ": " + e.message);
            } else {
                Strophe.fatal("error: " + e.message + "\n" + e.stack);
            }

            throw e;
        }

        return result;
    },

    /** PrivateFunction: toString
     *  Get a String representation of the Strophe.Handler object.
     *
     *  Returns:
     *    A String.
     */
    toString: function ()
    {
        return "{Handler: " + this.handler + "(" + this.name + "," +
            this.id + "," + this.ns + ")}";
    }
};

/** PrivateClass: Strophe.TimedHandler
 *  _Private_ helper class for managing timed handlers.
 *
 *  A Strophe.TimedHandler encapsulates a user provided callback that
 *  should be called after a certain period of time or at regular
 *  intervals.  The return value of the callback determines whether the
 *  Strophe.TimedHandler will continue to fire.
 *
 *  Users will not use Strophe.TimedHandler objects directly, but instead
 *  they will use Strophe.Connection.addTimedHandler() and
 *  Strophe.Connection.deleteTimedHandler().
 */

/** PrivateConstructor: Strophe.TimedHandler
 *  Create and initialize a new Strophe.TimedHandler object.
 *
 *  Parameters:
 *    (Integer) period - The number of milliseconds to wait before the
 *      handler is called.
 *    (Function) handler - The callback to run when the handler fires.  This
 *      function should take no arguments.
 *
 *  Returns:
 *    A new Strophe.TimedHandler object.
 */
Strophe.TimedHandler = function (period, handler)
{
    this.period = period;
    this.handler = handler;

    this.lastCalled = new Date().getTime();
    this.user = true;
};

Strophe.TimedHandler.prototype = {
    /** PrivateFunction: run
     *  Run the callback for the Strophe.TimedHandler.
     *
     *  Returns:
     *    true if the Strophe.TimedHandler should be called again, and false
     *      otherwise.
     */
    run: function ()
    {
        this.lastCalled = new Date().getTime();
        return this.handler();
    },

    /** PrivateFunction: reset
     *  Reset the last called time for the Strophe.TimedHandler.
     */
    reset: function ()
    {
        this.lastCalled = new Date().getTime();
    },

    /** PrivateFunction: toString
     *  Get a string representation of the Strophe.TimedHandler object.
     *
     *  Returns:
     *    The string representation.
     */
    toString: function ()
    {
        return "{TimedHandler: " + this.handler + "(" + this.period +")}";
    }
};

/** PrivateClass: Strophe.Request
 *  _Private_ helper class that provides a cross implementation abstraction
 *  for a BOSH related XMLHttpRequest.
 *
 *  The Strophe.Request class is used internally to encapsulate BOSH request
 *  information.  It is not meant to be used from user's code.
 */

/** PrivateConstructor: Strophe.Request
 *  Create and initialize a new Strophe.Request object.
 *
 *  Parameters:
 *    (XMLElement) elem - The XML data to be sent in the request.
 *    (Function) func - The function that will be called when the
 *      XMLHttpRequest readyState changes.
 *    (Integer) rid - The BOSH rid attribute associated with this request.
 *    (Integer) sends - The number of times this same request has been
 *      sent.
 */
Strophe.Request = function (elem, func, rid, sends)
{
    this.id = ++Strophe._requestId;
    this.xmlData = elem;
    this.data = Strophe.serialize(elem);
    // save original function in case we need to make a new request
    // from this one.
    this.origFunc = func;
    this.func = func;
    this.rid = rid;
    this.date = NaN;
    this.sends = sends || 0;
    this.abort = false;
    this.dead = null;
    this.age = function () {
        if (!this.date) { return 0; }
        var now = new Date();
        return (now - this.date) / 1000;
    };
    this.timeDead = function () {
        if (!this.dead) { return 0; }
        var now = new Date();
        return (now - this.dead) / 1000;
    };
    this.xhr = this._newXHR();
};

Strophe.Request.prototype = {
    /** PrivateFunction: getResponse
     *  Get a response from the underlying XMLHttpRequest.
     *
     *  This function attempts to get a response from the request and checks
     *  for errors.
     *
     *  Throws:
     *    "parsererror" - A parser error occured.
     *
     *  Returns:
     *    The DOM element tree of the response.
     */
    getResponse: function ()
    {
        var node = null;
        if (this.xhr.responseXML && this.xhr.responseXML.documentElement) {
            node = this.xhr.responseXML.documentElement;
            if (node.tagName == "parsererror") {
                Strophe.error("invalid response received");
                Strophe.error("responseText: " + this.xhr.responseText);
                Strophe.error("responseXML: " +
                              Strophe.serialize(this.xhr.responseXML));
                throw "parsererror";
            }
        } else if (this.xhr.responseText) {
            Strophe.error("invalid response received");
            Strophe.error("responseText: " + this.xhr.responseText);
            Strophe.error("responseXML: " +
                          Strophe.serialize(this.xhr.responseXML));
        }

        return node;
    },

    /** PrivateFunction: _newXHR
     *  _Private_ helper function to create XMLHttpRequests.
     *
     *  This function creates XMLHttpRequests across all implementations.
     *
     *  Returns:
     *    A new XMLHttpRequest.
     */
    _newXHR: function ()
    {
        var xhr = null;
        if (window.XMLHttpRequest) {
            xhr = new XMLHttpRequest();
            if (xhr.overrideMimeType) {
                xhr.overrideMimeType("text/xml");
            }
        } else if (window.ActiveXObject) {
            xhr = new ActiveXObject("Microsoft.XMLHTTP");
        }

        // use Function.bind() to prepend ourselves as an argument
        xhr.onreadystatechange = this.func.bind(null, this);

        return xhr;
    }
};

/** Class: Strophe.Connection
 *  XMPP Connection manager.
 *
 *  This class is the main part of Strophe.  It manages a BOSH connection
 *  to an XMPP server and dispatches events to the user callbacks as
 *  data arrives.  It supports SASL PLAIN, SASL DIGEST-MD5, and legacy
 *  authentication.
 *
 *  After creating a Strophe.Connection object, the user will typically
 *  call connect() with a user supplied callback to handle connection level
 *  events like authentication failure, disconnection, or connection
 *  complete.
 *
 *  The user will also have several event handlers defined by using
 *  addHandler() and addTimedHandler().  These will allow the user code to
 *  respond to interesting stanzas or do something periodically with the
 *  connection.  These handlers will be active once authentication is
 *  finished.
 *
 *  To send data to the connection, use send().
 */

/** Constructor: Strophe.Connection
 *  Create and initialize a Strophe.Connection object.
 *
 *  Parameters:
 *    (String) service - The BOSH service URL.
 *
 *  Returns:
 *    A new Strophe.Connection object.
 */
Strophe.Connection = function (service)
{
    /* The path to the httpbind service. */
    this.service = service;
    /* The connected JID. */
    this.jid = "";
    /* the JIDs domain */
    this.domain = null;
    /* request id for body tags */
    this.rid = Math.floor(Math.random() * 4294967295);
    /* The current session ID. */
    this.sid = null;
    this.streamId = null;
    /* stream:features */
    this.features = null;

    // SASL
    this._sasl_data = [];
    this.do_session = false;
    this.do_bind = false;

    // handler lists
    this.timedHandlers = [];
    this.handlers = [];
    this.removeTimeds = [];
    this.removeHandlers = [];
    this.addTimeds = [];
    this.addHandlers = [];

    this._authentication = {};
    this._idleTimeout = null;
    this._disconnectTimeout = null;

    this.do_authentication = true;
    this.authenticated = false;
    this.disconnecting = false;
    this.connected = false;

    this.errors = 0;

    this.paused = false;

    // default BOSH values
    this.hold = 1;
    this.wait = 60;
    this.window = 5;

    this._data = [];
    this._requests = [];
    this._uniqueId = Math.round(Math.random() * 10000);

    this._sasl_success_handler = null;
    this._sasl_failure_handler = null;
    this._sasl_challenge_handler = null;

    // Max retries before disconnecting
    this.maxRetries = 5;

    // setup onIdle callback every 1/10th of a second
    this._idleTimeout = setTimeout(this._onIdle.bind(this), 100);

    // initialize plugins
    for (var k in Strophe._connectionPlugins) {
        if (Strophe._connectionPlugins.hasOwnProperty(k)) {
	    var ptype = Strophe._connectionPlugins[k];
            // jslint complaints about the below line, but this is fine
            var F = function () {};
            F.prototype = ptype;
            this[k] = new F();
	    this[k].init(this);
        }
    }
};

Strophe.Connection.prototype = {
    /** Function: reset
     *  Reset the connection.
     *
     *  This function should be called after a connection is disconnected
     *  before that connection is reused.
     */
    reset: function ()
    {
        this.rid = Math.floor(Math.random() * 4294967295);

        this.sid = null;
        this.streamId = null;

        // SASL
        this.do_session = false;
        this.do_bind = false;

        // handler lists
        this.timedHandlers = [];
        this.handlers = [];
        this.removeTimeds = [];
        this.removeHandlers = [];
        this.addTimeds = [];
        this.addHandlers = [];
        this._authentication = {};

        this.authenticated = false;
        this.disconnecting = false;
        this.connected = false;

        this.errors = 0;

        this._requests = [];
        this._uniqueId = Math.round(Math.random()*10000);
    },

    /** Function: pause
     *  Pause the request manager.
     *
     *  This will prevent Strophe from sending any more requests to the
     *  server.  This is very useful for temporarily pausing while a lot
     *  of send() calls are happening quickly.  This causes Strophe to
     *  send the data in a single request, saving many request trips.
     */
    pause: function ()
    {
        this.paused = true;
    },

    /** Function: resume
     *  Resume the request manager.
     *
     *  This resumes after pause() has been called.
     */
    resume: function ()
    {
        this.paused = false;
    },

    /** Function: getUniqueId
     *  Generate a unique ID for use in <iq/> elements.
     *
     *  All <iq/> stanzas are required to have unique id attributes.  This
     *  function makes creating these easy.  Each connection instance has
     *  a counter which starts from zero, and the value of this counter
     *  plus a colon followed by the suffix becomes the unique id. If no
     *  suffix is supplied, the counter is used as the unique id.
     *
     *  Suffixes are used to make debugging easier when reading the stream
     *  data, and their use is recommended.  The counter resets to 0 for
     *  every new connection for the same reason.  For connections to the
     *  same server that authenticate the same way, all the ids should be
     *  the same, which makes it easy to see changes.  This is useful for
     *  automated testing as well.
     *
     *  Parameters:
     *    (String) suffix - A optional suffix to append to the id.
     *
     *  Returns:
     *    A unique string to be used for the id attribute.
     */
    getUniqueId: function (suffix)
    {
        if (typeof(suffix) == "string" || typeof(suffix) == "number") {
            return ++this._uniqueId + ":" + suffix;
        } else {
            return ++this._uniqueId + "";
        }
    },

    /** Function: connect
     *  Starts the connection process.
     *
     *  As the connection process proceeds, the user supplied callback will
     *  be triggered multiple times with status updates.  The callback
     *  should take two arguments - the status code and the error condition.
     *
     *  The status code will be one of the values in the Strophe.Status
     *  constants.  The error condition will be one of the conditions
     *  defined in RFC 3920 or the condition 'strophe-parsererror'.
     *
     *  Please see XEP 124 for a more detailed explanation of the optional
     *  parameters below.
     *
     *  Parameters:
     *    (String) jid - The user's JID.  This may be a bare JID,
     *      or a full JID.  If a node is not supplied, SASL ANONYMOUS
     *      authentication will be attempted.
     *    (String) pass - The user's password.
     *    (Function) callback - The connect callback function.
     *    (Integer) wait - The optional HTTPBIND wait value.  This is the
     *      time the server will wait before returning an empty result for
     *      a request.  The default setting of 60 seconds is recommended.
     *      Other settings will require tweaks to the Strophe.TIMEOUT value.
     *    (Integer) hold - The optional HTTPBIND hold value.  This is the
     *      number of connections the server will hold at one time.  This
     *      should almost always be set to 1 (the default).
	 *    (String) route
     */
    connect: function (jid, pass, callback, wait, hold, route)
    {
        this.jid = jid;
        this.pass = pass;
        this.connect_callback = callback;
        this.disconnecting = false;
        this.connected = false;
        this.authenticated = false;
        this.errors = 0;

        this.wait = wait || this.wait;
        this.hold = hold || this.hold;

        // parse jid for domain and resource
        this.domain = this.domain || Strophe.getDomainFromJid(this.jid);

        // build the body tag
        var body = this._buildBody().attrs({
            to: this.domain,
            "xml:lang": "en",
            wait: this.wait,
            hold: this.hold,
            content: "text/xml; charset=utf-8",
            ver: "1.6",
            "xmpp:version": "1.0",
            "xmlns:xmpp": Strophe.NS.BOSH
        });

		if(route){
			body.attrs({
				route: route
			});
		}

        this._changeConnectStatus(Strophe.Status.CONNECTING, null);

        var _connect_cb = this._connect_callback || this._connect_cb;
        this._connect_callback = null;

        this._requests.push(
            new Strophe.Request(body.tree(),
                                this._onRequestStateChange.bind(
                                    this, _connect_cb.bind(this)),
                                body.tree().getAttribute("rid")));
        this._throttledRequestHandler();
    },

    /** Function: attach
     *  Attach to an already created and authenticated BOSH session.
     *
     *  This function is provided to allow Strophe to attach to BOSH
     *  sessions which have been created externally, perhaps by a Web
     *  application.  This is often used to support auto-login type features
     *  without putting user credentials into the page.
     *
     *  Parameters:
     *    (String) jid - The full JID that is bound by the session.
     *    (String) sid - The SID of the BOSH session.
     *    (String) rid - The current RID of the BOSH session.  This RID
     *      will be used by the next request.
     *    (Function) callback The connect callback function.
     *    (Integer) wait - The optional HTTPBIND wait value.  This is the
     *      time the server will wait before returning an empty result for
     *      a request.  The default setting of 60 seconds is recommended.
     *      Other settings will require tweaks to the Strophe.TIMEOUT value.
     *    (Integer) hold - The optional HTTPBIND hold value.  This is the
     *      number of connections the server will hold at one time.  This
     *      should almost always be set to 1 (the default).
     *    (Integer) wind - The optional HTTBIND window value.  This is the
     *      allowed range of request ids that are valid.  The default is 5.
     */
    attach: function (jid, sid, rid, callback, wait, hold, wind)
    {
        this.jid = jid;
        this.sid = sid;
        this.rid = rid;
        this.connect_callback = callback;

        this.domain = Strophe.getDomainFromJid(this.jid);

        this.authenticated = true;
        this.connected = true;

        this.wait = wait || this.wait;
        this.hold = hold || this.hold;
        this.window = wind || this.window;

        this._changeConnectStatus(Strophe.Status.ATTACHED, null);
    },

    /** Function: xmlInput
     *  User overrideable function that receives XML data coming into the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.xmlInput = function (elem) {
     *  >   (user code)
     *  > };
     *
     *  Parameters:
     *    (XMLElement) elem - The XML data received by the connection.
     */
    xmlInput: function (elem)
    {
        return;
    },

    /** Function: xmlOutput
     *  User overrideable function that receives XML data sent to the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.xmlOutput = function (elem) {
     *  >   (user code)
     *  > };
     *
     *  Parameters:
     *    (XMLElement) elem - The XMLdata sent by the connection.
     */
    xmlOutput: function (elem)
    {
        return;
    },

    /** Function: rawInput
     *  User overrideable function that receives raw data coming into the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.rawInput = function (data) {
     *  >   (user code)
     *  > };
     *
     *  Parameters:
     *    (String) data - The data received by the connection.
     */
    rawInput: function (data)
    {
        return;
    },

    /** Function: rawOutput
     *  User overrideable function that receives raw data sent to the
     *  connection.
     *
     *  The default function does nothing.  User code can override this with
     *  > Strophe.Connection.rawOutput = function (data) {
     *  >   (user code)
     *  > };
     *
     *  Parameters:
     *    (String) data - The data sent by the connection.
     */
    rawOutput: function (data)
    {
        return;
    },

    /** Function: send
     *  Send a stanza.
     *
     *  This function is called to push data onto the send queue to
     *  go out over the wire.  Whenever a request is sent to the BOSH
     *  server, all pending data is sent and the queue is flushed.
     *
     *  Parameters:
     *    (XMLElement |
     *     [XMLElement] |
     *     Strophe.Builder) elem - The stanza to send.
     */
    send: function (elem)
    {
        if (elem === null) { return ; }
        if (typeof(elem.sort) === "function") {
            for (var i = 0; i < elem.length; i++) {
                this._queueData(elem[i]);
            }
        } else if (typeof(elem.tree) === "function") {
            this._queueData(elem.tree());
        } else {
            this._queueData(elem);
        }

        this._throttledRequestHandler();
        clearTimeout(this._idleTimeout);
        this._idleTimeout = setTimeout(this._onIdle.bind(this), 100);
    },

    /** Function: flush
     *  Immediately send any pending outgoing data.
     *
     *  Normally send() queues outgoing data until the next idle period
     *  (100ms), which optimizes network use in the common cases when
     *  several send()s are called in succession. flush() can be used to
     *  immediately send all pending data.
     */
    flush: function ()
    {
        // cancel the pending idle period and run the idle function
        // immediately
        clearTimeout(this._idleTimeout);
        this._onIdle();
    },

    /** Function: sendIQ
     *  Helper function to send IQ stanzas.
     *
     *  Parameters:
     *    (XMLElement) elem - The stanza to send.
     *    (Function) callback - The callback function for a successful request.
     *    (Function) errback - The callback function for a failed or timed
     *      out request.  On timeout, the stanza will be null.
     *    (Integer) timeout - The time specified in milliseconds for a
     *      timeout to occur.
     *
     *  Returns:
     *    The id used to send the IQ.
    */
    sendIQ: function(elem, callback, errback, timeout) {
        var timeoutHandler = null;
        var that = this;

        if (typeof(elem.tree) === "function") {
            elem = elem.tree();
        }
	var id = elem.getAttribute('id');

	// inject id if not found
	if (!id) {
	    id = this.getUniqueId("sendIQ");
	    elem.setAttribute("id", id);
	}

	var handler = this.addHandler(function (stanza) {
	    // remove timeout handler if there is one
            if (timeoutHandler) {
                that.deleteTimedHandler(timeoutHandler);
            }

            var iqtype = stanza.getAttribute('type');
	    if (iqtype == 'result') {
		if (callback) {
                    callback(stanza);
                }
	    } else if (iqtype == 'error') {
		if (errback) {
                    errback(stanza);
                }
	    } else {
                throw {
                    name: "StropheError",
                    message: "Got bad IQ type of " + iqtype
                };
            }
	}, null, 'iq', null, id);

	// if timeout specified, setup timeout handler.
	if (timeout) {
	    timeoutHandler = this.addTimedHandler(timeout, function () {
                // get rid of normal handler
                that.deleteHandler(handler);

	        // call errback on timeout with null stanza
                if (errback) {
		    errback(null);
                }
		return false;
	    });
	}

	this.send(elem);

	return id;
    },

    /** PrivateFunction: _queueData
     *  Queue outgoing data for later sending.  Also ensures that the data
     *  is a DOMElement.
     */
    _queueData: function (element) {
        if (element === null ||
            !element.tagName ||
            !element.childNodes) {
            throw {
                name: "StropheError",
                message: "Cannot queue non-DOMElement."
            };
        }
        
        this._data.push(element);
    },

    /** PrivateFunction: _sendRestart
     *  Send an xmpp:restart stanza.
     */
    _sendRestart: function ()
    {
        this._data.push("restart");

        this._throttledRequestHandler();
        clearTimeout(this._idleTimeout);
        this._idleTimeout = setTimeout(this._onIdle.bind(this), 100);
    },

    /** Function: addTimedHandler
     *  Add a timed handler to the connection.
     *
     *  This function adds a timed handler.  The provided handler will
     *  be called every period milliseconds until it returns false,
     *  the connection is terminated, or the handler is removed.  Handlers
     *  that wish to continue being invoked should return true.
     *
     *  Because of method binding it is necessary to save the result of
     *  this function if you wish to remove a handler with
     *  deleteTimedHandler().
     *
     *  Note that user handlers are not active until authentication is
     *  successful.
     *
     *  Parameters:
     *    (Integer) period - The period of the handler.
     *    (Function) handler - The callback function.
     *
     *  Returns:
     *    A reference to the handler that can be used to remove it.
     */
    addTimedHandler: function (period, handler)
    {
        var thand = new Strophe.TimedHandler(period, handler);
        this.addTimeds.push(thand);
        return thand;
    },

    /** Function: deleteTimedHandler
     *  Delete a timed handler for a connection.
     *
     *  This function removes a timed handler from the connection.  The
     *  handRef parameter is *not* the function passed to addTimedHandler(),
     *  but is the reference returned from addTimedHandler().
     *
     *  Parameters:
     *    (Strophe.TimedHandler) handRef - The handler reference.
     */
    deleteTimedHandler: function (handRef)
    {
        // this must be done in the Idle loop so that we don't change
        // the handlers during iteration
        this.removeTimeds.push(handRef);
    },

    /** Function: addHandler
     *  Add a stanza handler for the connection.
     *
     *  This function adds a stanza handler to the connection.  The
     *  handler callback will be called for any stanza that matches
     *  the parameters.  Note that if multiple parameters are supplied,
     *  they must all match for the handler to be invoked.
     *
     *  The handler will receive the stanza that triggered it as its argument.
     *  The handler should return true if it is to be invoked again;
     *  returning false will remove the handler after it returns.
     *
     *  As a convenience, the ns parameters applies to the top level element
     *  and also any of its immediate children.  This is primarily to make
     *  matching /iq/query elements easy.
     *
     *  The options argument contains handler matching flags that affect how
     *  matches are determined. Currently the only flag is matchBare (a
     *  boolean). When matchBare is true, the from parameter and the from
     *  attribute on the stanza will be matched as bare JIDs instead of
     *  full JIDs. To use this, pass {matchBare: true} as the value of
     *  options. The default value for matchBare is false.
     *
     *  The return value should be saved if you wish to remove the handler
     *  with deleteHandler().
     *
     *  Parameters:
     *    (Function) handler - The user callback.
     *    (String) ns - The namespace to match.
     *    (String) name - The stanza name to match.
     *    (String) type - The stanza type attribute to match.
     *    (String) id - The stanza id attribute to match.
     *    (String) from - The stanza from attribute to match.
     *    (String) options - The handler options
     *
     *  Returns:
     *    A reference to the handler that can be used to remove it.
     */
    addHandler: function (handler, ns, name, type, id, from, options)
    {
        var hand = new Strophe.Handler(handler, ns, name, type, id, from, options);
        this.addHandlers.push(hand);
        return hand;
    },

    /** Function: deleteHandler
     *  Delete a stanza handler for a connection.
     *
     *  This function removes a stanza handler from the connection.  The
     *  handRef parameter is *not* the function passed to addHandler(),
     *  but is the reference returned from addHandler().
     *
     *  Parameters:
     *    (Strophe.Handler) handRef - The handler reference.
     */
    deleteHandler: function (handRef)
    {
        // this must be done in the Idle loop so that we don't change
        // the handlers during iteration
        this.removeHandlers.push(handRef);
    },

    /** Function: disconnect
     *  Start the graceful disconnection process.
     *
     *  This function starts the disconnection process.  This process starts
     *  by sending unavailable presence and sending BOSH body of type
     *  terminate.  A timeout handler makes sure that disconnection happens
     *  even if the BOSH server does not respond.
     *
     *  The user supplied connection callback will be notified of the
     *  progress as this process happens.
     *
     *  Parameters:
     *    (String) reason - The reason the disconnect is occuring.
     */
    disconnect: function (reason)
    {
        this._changeConnectStatus(Strophe.Status.DISCONNECTING, reason);

        Strophe.info("Disconnect was called because: " + reason);
        if (this.connected) {
            // setup timeout handler
            this._disconnectTimeout = this._addSysTimedHandler(
                3000, this._onDisconnectTimeout.bind(this));
            this._sendTerminate();
        }
    },

    /** PrivateFunction: _changeConnectStatus
     *  _Private_ helper function that makes sure plugins and the user's
     *  callback are notified of connection status changes.
     *
     *  Parameters:
     *    (Integer) status - the new connection status, one of the values
     *      in Strophe.Status
     *    (String) condition - the error condition or null
     */
    _changeConnectStatus: function (status, condition)
    {
        // notify all plugins listening for status changes
        for (var k in Strophe._connectionPlugins) {
            if (Strophe._connectionPlugins.hasOwnProperty(k)) {
                var plugin = this[k];
                if (plugin.statusChanged) {
                    try {
                        plugin.statusChanged(status, condition);
                    } catch (err) {
                        Strophe.error("" + k + " plugin caused an exception " +
                                      "changing status: " + err);
                    }
                }
            }
        }

        // notify the user's callback
        if (this.connect_callback) {
            try {
                this.connect_callback(status, condition);
            } catch (e) {
                Strophe.error("User connection callback caused an " +
                              "exception: " + e);
            }
        }
    },

    /** PrivateFunction: _buildBody
     *  _Private_ helper function to generate the <body/> wrapper for BOSH.
     *
     *  Returns:
     *    A Strophe.Builder with a <body/> element.
     */
    _buildBody: function ()
    {
        var bodyWrap = $build('body', {
            rid: this.rid++,
            xmlns: Strophe.NS.HTTPBIND
        });

        this._notifyIncrementRid(this.rid);

        if (this.sid !== null) {
            bodyWrap.attrs({sid: this.sid});
        }

        return bodyWrap;
    },

    /**
     * Empty function to be overriden for usage. Called when connection rid
     * is incremented with the new rid as parameter.
     */
    _notifyIncrementRid: function(){
    },

    /** PrivateFunction: _removeRequest
     *  _Private_ function to remove a request from the queue.
     *
     *  Parameters:
     *    (Strophe.Request) req - The request to remove.
     */
    _removeRequest: function (req)
    {
        Strophe.debug("removing request");

        var i;
        for (i = this._requests.length - 1; i >= 0; i--) {
            if (req == this._requests[i]) {
                this._requests.splice(i, 1);
            }
        }

        // IE6 fails on setting to null, so set to empty function
        req.xhr.onreadystatechange = function () {};

        this._throttledRequestHandler();
    },

    /** PrivateFunction: _restartRequest
     *  _Private_ function to restart a request that is presumed dead.
     *
     *  Parameters:
     *    (Integer) i - The index of the request in the queue.
     */
    _restartRequest: function (i)
    {
        var req = this._requests[i];
        if (req.dead === null) {
            req.dead = new Date();
        }

        this._processRequest(i);
    },

    /** PrivateFunction: _processRequest
     *  _Private_ function to process a request in the queue.
     *
     *  This function takes requests off the queue and sends them and
     *  restarts dead requests.
     *
     *  Parameters:
     *    (Integer) i - The index of the request in the queue.
     */
    _processRequest: function (i)
    {
        var req = this._requests[i];
        var reqStatus = -1;

        try {
            if (req.xhr.readyState == 4) {
                reqStatus = req.xhr.status;
            }
        } catch (e) {
            Strophe.error("caught an error in _requests[" + i +
                          "], reqStatus: " + reqStatus);
        }

        if (typeof(reqStatus) == "undefined") {
            reqStatus = -1;
        }

        // make sure we limit the number of retries
        if (req.sends > this.maxRetries) {
            this._onDisconnectTimeout();
            return;
        }

        var time_elapsed = req.age();
        var primaryTimeout = (!isNaN(time_elapsed) &&
                              time_elapsed > Math.floor(Strophe.TIMEOUT * this.wait));
        var secondaryTimeout = (req.dead !== null &&
                                req.timeDead() > Math.floor(Strophe.SECONDARY_TIMEOUT * this.wait));
        var requestCompletedWithServerError = (req.xhr.readyState == 4 &&
                                               (reqStatus < 1 ||
                                                reqStatus >= 500));
        if (primaryTimeout || secondaryTimeout ||
            requestCompletedWithServerError) {
            if (secondaryTimeout) {
                Strophe.error("Request " +
                              this._requests[i].id +
                              " timed out (secondary), restarting");
            }
            req.abort = true;
            req.xhr.abort();
            // setting to null fails on IE6, so set to empty function
            req.xhr.onreadystatechange = function () {};
            this._requests[i] = new Strophe.Request(req.xmlData,
                                                    req.origFunc,
                                                    req.rid,
                                                    req.sends);
            req = this._requests[i];
        }

        if (req.xhr.readyState === 0) {
            Strophe.debug("request id " + req.id +
                          "." + req.sends + " posting");

            try {
                req.xhr.open("POST", this.service, true);
            } catch (e2) {
                Strophe.error("XHR open failed.");
                if (!this.connected) {
                    this._changeConnectStatus(Strophe.Status.CONNFAIL,
                                              "bad-service");
                }
                this.disconnect();
                return;
            }

            // Fires the XHR request -- may be invoked immediately
            // or on a gradually expanding retry window for reconnects
            var sendFunc = function () {
                req.date = new Date();
                req.xhr.send(req.data);
            };

            // Implement progressive backoff for reconnects --
            // First retry (send == 1) should also be instantaneous
            if (req.sends > 1) {
                // Using a cube of the retry number creates a nicely
                // expanding retry window
                var backoff = Math.min(Math.floor(Strophe.TIMEOUT * this.wait),
                                       Math.pow(req.sends, 3)) * 1000;
                setTimeout(sendFunc, backoff);
            } else {
                sendFunc();
            }

            req.sends++;

            if (this.xmlOutput !== Strophe.Connection.prototype.xmlOutput) {
                this.xmlOutput(req.xmlData);
            }
            if (this.rawOutput !== Strophe.Connection.prototype.rawOutput) {
                this.rawOutput(req.data);
            }
        } else {
            Strophe.debug("_processRequest: " +
                          (i === 0 ? "first" : "second") +
                          " request has readyState of " +
                          req.xhr.readyState);
        }
    },

    /** PrivateFunction: _throttledRequestHandler
     *  _Private_ function to throttle requests to the connection window.
     *
     *  This function makes sure we don't send requests so fast that the
     *  request ids overflow the connection window in the case that one
     *  request died.
     */
    _throttledRequestHandler: function ()
    {
        if (!this._requests) {
            Strophe.debug("_throttledRequestHandler called with " +
                          "undefined requests");
        } else {
            Strophe.debug("_throttledRequestHandler called with " +
                          this._requests.length + " requests");
        }

        if (!this._requests || this._requests.length === 0) {
            return;
        }

        if (this._requests.length > 0) {
            this._processRequest(0);
        }

        if (this._requests.length > 1 &&
            Math.abs(this._requests[0].rid -
                     this._requests[1].rid) < this.window) {
            this._processRequest(1);
        }
    },

    /** PrivateFunction: _onRequestStateChange
     *  _Private_ handler for Strophe.Request state changes.
     *
     *  This function is called when the XMLHttpRequest readyState changes.
     *  It contains a lot of error handling logic for the many ways that
     *  requests can fail, and calls the request callback when requests
     *  succeed.
     *
     *  Parameters:
     *    (Function) func - The handler for the request.
     *    (Strophe.Request) req - The request that is changing readyState.
     */
    _onRequestStateChange: function (func, req)
    {
        Strophe.debug("request id " + req.id +
                      "." + req.sends + " state changed to " +
                      req.xhr.readyState);

        if (req.abort) {
            req.abort = false;
            return;
        }

        // request complete
        var reqStatus;
        if (req.xhr.readyState == 4) {
            reqStatus = 0;
            try {
                reqStatus = req.xhr.status;
            } catch (e) {
                // ignore errors from undefined status attribute.  works
                // around a browser bug
            }

            if (typeof(reqStatus) == "undefined") {
                reqStatus = 0;
            }

            if (this.disconnecting) {
                if (reqStatus >= 400) {
                    this._hitError(reqStatus);
                    return;
                }
            }

            var reqIs0 = (this._requests[0] == req);
            var reqIs1 = (this._requests[1] == req);

            if ((reqStatus > 0 && reqStatus < 500) || req.sends > 5) {
                // remove from internal queue
                this._removeRequest(req);
                Strophe.debug("request id " +
                              req.id +
                              " should now be removed");
            }

            // request succeeded
            if (reqStatus == 200) {
                // if request 1 finished, or request 0 finished and request
                // 1 is over Strophe.SECONDARY_TIMEOUT seconds old, we need to
                // restart the other - both will be in the first spot, as the
                // completed request has been removed from the queue already
                if (reqIs1 ||
                    (reqIs0 && this._requests.length > 0 &&
                     this._requests[0].age() > Math.floor(Strophe.SECONDARY_TIMEOUT * this.wait))) {
                    this._restartRequest(0);
                }
                // call handler
                Strophe.debug("request id " +
                              req.id + "." +
                              req.sends + " got 200");
                func(req);
                this.errors = 0;
            } else {
                Strophe.error("request id " +
                              req.id + "." +
                              req.sends + " error " + reqStatus +
                              " happened");
                if (reqStatus === 0 ||
                    (reqStatus >= 400 && reqStatus < 600) ||
                    reqStatus >= 12000) {
                    this._hitError(reqStatus);
                    if (reqStatus >= 400 && reqStatus < 500) {
                        this._changeConnectStatus(Strophe.Status.DISCONNECTING,
                                                  null);
                        this._doDisconnect();
                    }
                }
            }

            if (!((reqStatus > 0 && reqStatus < 500) ||
                  req.sends > 5)) {
                this._throttledRequestHandler();
            }
        }
    },

    /** PrivateFunction: _hitError
     *  _Private_ function to handle the error count.
     *
     *  Requests are resent automatically until their error count reaches
     *  5.  Each time an error is encountered, this function is called to
     *  increment the count and disconnect if the count is too high.
     *
     *  Parameters:
     *    (Integer) reqStatus - The request status.
     */
    _hitError: function (reqStatus)
    {
        this.errors++;
        Strophe.warn("request errored, status: " + reqStatus +
                     ", number of errors: " + this.errors);
        if (this.errors > 4) {
            this._onDisconnectTimeout();
        }
    },

    /** PrivateFunction: _doDisconnect
     *  _Private_ function to disconnect.
     *
     *  This is the last piece of the disconnection logic.  This resets the
     *  connection and alerts the user's connection callback.
     */
    _doDisconnect: function ()
    {
        Strophe.info("_doDisconnect was called");
        this.authenticated = false;
        this.disconnecting = false;
        this.sid = null;
        this.streamId = null;
        this.rid = Math.floor(Math.random() * 4294967295);

        // tell the parent we disconnected
        if (this.connected) {
            this._changeConnectStatus(Strophe.Status.DISCONNECTED, null);
            this.connected = false;
        }

        // delete handlers
        this.handlers = [];
        this.timedHandlers = [];
        this.removeTimeds = [];
        this.removeHandlers = [];
        this.addTimeds = [];
        this.addHandlers = [];
    },

    /** PrivateFunction: _dataRecv
     *  _Private_ handler to processes incoming data from the the connection.
     *
     *  Except for _connect_cb handling the initial connection request,
     *  this function handles the incoming data for all requests.  This
     *  function also fires stanza handlers that match each incoming
     *  stanza.
     *
     *  Parameters:
     *    (Strophe.Request) req - The request that has data ready.
     */
    _dataRecv: function (req)
    {
        try {
            var elem = req.getResponse();
        } catch (e) {
            if (e != "parsererror") { throw e; }
            this.disconnect("strophe-parsererror");
        }
        if (elem === null) { return; }

        if (this.xmlInput !== Strophe.Connection.prototype.xmlInput) {
            this.xmlInput(elem);
        }
        if (this.rawInput !== Strophe.Connection.prototype.rawInput) {
            this.rawInput(Strophe.serialize(elem));
        }

        // remove handlers scheduled for deletion
        var i, hand;
        while (this.removeHandlers.length > 0) {
            hand = this.removeHandlers.pop();
            i = this.handlers.indexOf(hand);
            if (i >= 0) {
                this.handlers.splice(i, 1);
            }
        }

        // add handlers scheduled for addition
        while (this.addHandlers.length > 0) {
            this.handlers.push(this.addHandlers.pop());
        }

        // handle graceful disconnect
        if (this.disconnecting && this._requests.length === 0) {
            this.deleteTimedHandler(this._disconnectTimeout);
            this._disconnectTimeout = null;
            this._doDisconnect();
            return;
        }

        var typ = elem.getAttribute("type");
        var cond, conflict;
        if (typ !== null && typ == "terminate") {
            // Don't process stanzas that come in after disconnect
            if (this.disconnecting) {
                return;
            }

            // an error occurred
            cond = elem.getAttribute("condition");
            conflict = elem.getElementsByTagName("conflict");
            if (cond !== null) {
                if (cond == "remote-stream-error" && conflict.length > 0) {
                    cond = "conflict";
                }
                this._changeConnectStatus(Strophe.Status.CONNFAIL, cond);
            } else {
                this._changeConnectStatus(Strophe.Status.CONNFAIL, "unknown");
            }
            this.disconnect();
            return;
        }

        // send each incoming stanza through the handler chain
        var that = this;
        Strophe.forEachChild(elem, null, function (child) {
            var i, newList;
            // process handlers
            newList = that.handlers;
            that.handlers = [];
            for (i = 0; i < newList.length; i++) {
                var hand = newList[i];
                // encapsulate 'handler.run' not to lose the whole handler list if
                // one of the handlers throws an exception
                try {
                    if (hand.isMatch(child) &&
                        (that.authenticated || !hand.user)) {
                        if (hand.run(child)) {
                            that.handlers.push(hand);
                        }
                    } else {
                        that.handlers.push(hand);
                    }
                } catch(e) {
                    //if the handler throws an exception, we consider it as false
                }
            }
        });
    },

    /** PrivateFunction: _sendTerminate
     *  _Private_ function to send initial disconnect sequence.
     *
     *  This is the first step in a graceful disconnect.  It sends
     *  the BOSH server a terminate body and includes an unavailable
     *  presence if authentication has completed.
     */
    _sendTerminate: function ()
    {
        Strophe.info("_sendTerminate was called");
        var body = this._buildBody().attrs({type: "terminate"});

        if (this.authenticated) {
            body.c('presence', {
                xmlns: Strophe.NS.CLIENT,
                type: 'unavailable'
            });
        }

        this.disconnecting = true;

        var req = new Strophe.Request(body.tree(),
                                      this._onRequestStateChange.bind(
                                          this, this._dataRecv.bind(this)),
                                      body.tree().getAttribute("rid"));

        this._requests.push(req);
        this._throttledRequestHandler();
    },

    /** PrivateFunction: _connect_cb
     *  _Private_ handler for initial connection request.
     *
     *  This handler is used to process the initial connection request
     *  response from the BOSH server. It is used to set up authentication
     *  handlers and start the authentication process.
     *
     *  SASL authentication will be attempted if available, otherwise
     *  the code will fall back to legacy authentication.
     *
     *  Parameters:
     *    (Strophe.Request) req - The current request.
     *    (Function) _callback - low level (xmpp) connect callback function.
     *      Useful for plugins with their own xmpp connect callback (when their)
     *      want to do something special).
     */
    _connect_cb: function (req, _callback)
    {
        Strophe.info("_connect_cb was called");

        this.connected = true;
        var bodyWrap = req.getResponse();
        if (!bodyWrap) { return; }

        if (this.xmlInput !== Strophe.Connection.prototype.xmlInput) {
            this.xmlInput(bodyWrap);
        }
        if (this.rawInput !== Strophe.Connection.prototype.rawInput) {
            this.rawInput(Strophe.serialize(bodyWrap));
        }

        var typ = bodyWrap.getAttribute("type");
        var cond, conflict;
        if (typ !== null && typ == "terminate") {
            // an error occurred
            cond = bodyWrap.getAttribute("condition");
            conflict = bodyWrap.getElementsByTagName("conflict");
            if (cond !== null) {
                if (cond == "remote-stream-error" && conflict.length > 0) {
                    cond = "conflict";
                }
                this._changeConnectStatus(Strophe.Status.CONNFAIL, cond);
            } else {
                this._changeConnectStatus(Strophe.Status.CONNFAIL, "unknown");
            }
            return;
        }

        // check to make sure we don't overwrite these if _connect_cb is
        // called multiple times in the case of missing stream:features
        if (!this.sid) {
            this.sid = bodyWrap.getAttribute("sid");
        }
        if (!this.stream_id) {
            this.stream_id = bodyWrap.getAttribute("authid");
        }
        var wind = bodyWrap.getAttribute('requests');
        if (wind) { this.window = parseInt(wind, 10); }
        var hold = bodyWrap.getAttribute('hold');
        if (hold) { this.hold = parseInt(hold, 10); }
        var wait = bodyWrap.getAttribute('wait');
        if (wait) { this.wait = parseInt(wait, 10); }

        this._authentication.sasl_scram_sha1 = false;
        this._authentication.sasl_plain = false;
        this._authentication.sasl_digest_md5 = false;
        this._authentication.sasl_anonymous = false;
        this._authentication.legacy_auth = false;


        // Check for the stream:features tag
        var hasFeatures = bodyWrap.getElementsByTagName("stream:features").length > 0;
        if (!hasFeatures) {
            hasFeatures = bodyWrap.getElementsByTagName("features").length > 0;
        }
        var mechanisms = bodyWrap.getElementsByTagName("mechanism");
        var i, mech, auth_str, hashed_auth_str,
            found_authentication = false;
        if (hasFeatures && mechanisms.length > 0) {
            var missmatchedmechs = 0;
            for (i = 0; i < mechanisms.length; i++) {
                mech = Strophe.getText(mechanisms[i]);
                if (mech == 'SCRAM-SHA-1') {
                    this._authentication.sasl_scram_sha1 = true;
                } else if (mech == 'DIGEST-MD5') {
                    this._authentication.sasl_digest_md5 = true;
                } else if (mech == 'PLAIN') {
                    this._authentication.sasl_plain = true;
                } else if (mech == 'ANONYMOUS') {
                    this._authentication.sasl_anonymous = true;
                } else missmatchedmechs++;
            }

            this._authentication.legacy_auth =
                bodyWrap.getElementsByTagName("auth").length > 0;

            found_authentication =
                this._authentication.legacy_auth ||
                missmatchedmechs < mechanisms.length;
        }
        if (!found_authentication) {
            _callback = _callback || this._connect_cb;
            // we didn't get stream:features yet, so we need wait for it
            // by sending a blank poll request
            var body = this._buildBody();
            this._requests.push(
                new Strophe.Request(body.tree(),
                                    this._onRequestStateChange.bind(
                                        this, _callback.bind(this)),
                                    body.tree().getAttribute("rid")));
            this._throttledRequestHandler();
            return;
        }
        if (this.do_authentication !== false)
            this.authenticate();
    },

    /** Function: authenticate
     * Set up authentication
     *
     *  Contiunues the initial connection request by setting up authentication
     *  handlers and start the authentication process.
     *
     *  SASL authentication will be attempted if available, otherwise
     *  the code will fall back to legacy authentication.
     *
     */
    authenticate: function ()
    {
        if (Strophe.getNodeFromJid(this.jid) === null &&
            this._authentication.sasl_anonymous) {
            this._changeConnectStatus(Strophe.Status.AUTHENTICATING, null);
            this._sasl_success_handler = this._addSysHandler(
                this._sasl_success_cb.bind(this), null,
                "success", null, null);
            this._sasl_failure_handler = this._addSysHandler(
                this._sasl_failure_cb.bind(this), null,
                "failure", null, null);

            this.send($build("auth", {
                xmlns: Strophe.NS.SASL,
                mechanism: "ANONYMOUS"
            }).tree());
        } else if (Strophe.getNodeFromJid(this.jid) === null) {
            // we don't have a node, which is required for non-anonymous
            // client connections
            this._changeConnectStatus(Strophe.Status.CONNFAIL,
                                      'x-strophe-bad-non-anon-jid');
            this.disconnect();
        } else if (this._authentication.sasl_scram_sha1) {
            var cnonce = MD5.hexdigest(Math.random() * 1234567890);

            var auth_str = "n=" + Strophe.getNodeFromJid(this.jid);
            auth_str += ",r=";
            auth_str += cnonce;

            this._sasl_data["cnonce"] = cnonce;
            this._sasl_data["client-first-message-bare"] = auth_str;

            auth_str = "n,," + auth_str;

            this._changeConnectStatus(Strophe.Status.AUTHENTICATING, null);
            this._sasl_challenge_handler = this._addSysHandler(
                this._sasl_scram_challenge_cb.bind(this), null,
                "challenge", null, null);
            this._sasl_failure_handler = this._addSysHandler(
                this._sasl_failure_cb.bind(this), null,
                "failure", null, null);

            this.send($build("auth", {
                xmlns: Strophe.NS.SASL,
                mechanism: "SCRAM-SHA-1"
            }).t(Base64.encode(auth_str)).tree());
        } else if (this._authentication.sasl_digest_md5) {
            this._changeConnectStatus(Strophe.Status.AUTHENTICATING, null);
            this._sasl_challenge_handler = this._addSysHandler(
                this._sasl_digest_challenge1_cb.bind(this), null,
                "challenge", null, null);
            this._sasl_failure_handler = this._addSysHandler(
                this._sasl_failure_cb.bind(this), null,
                "failure", null, null);

            this.send($build("auth", {
                xmlns: Strophe.NS.SASL,
                mechanism: "DIGEST-MD5"
            }).tree());
        } else if (this._authentication.sasl_plain) {
            // Build the plain auth string (barejid null
            // username null password) and base 64 encoded.
            auth_str = Strophe.getBareJidFromJid(this.jid);
            auth_str = auth_str + "\u0000";
            auth_str = auth_str + Strophe.getNodeFromJid(this.jid);
            auth_str = auth_str + "\u0000";
            auth_str = auth_str + this.pass;

            this._changeConnectStatus(Strophe.Status.AUTHENTICATING, null);
            this._sasl_success_handler = this._addSysHandler(
                this._sasl_success_cb.bind(this), null,
                "success", null, null);
            this._sasl_failure_handler = this._addSysHandler(
                this._sasl_failure_cb.bind(this), null,
                "failure", null, null);

            hashed_auth_str = Base64.encode(auth_str);
            this.send($build("auth", {
                xmlns: Strophe.NS.SASL,
                mechanism: "PLAIN"
            }).t(hashed_auth_str).tree());
        } else {
            this._changeConnectStatus(Strophe.Status.AUTHENTICATING, null);
            this._addSysHandler(this._auth1_cb.bind(this), null, null,
                                null, "_auth_1");

            this.send($iq({
                type: "get",
                to: this.domain,
                id: "_auth_1"
            }).c("query", {
                xmlns: Strophe.NS.AUTH
            }).c("username", {}).t(Strophe.getNodeFromJid(this.jid)).tree());
        }
    },

    /** PrivateFunction: _sasl_digest_challenge1_cb
     *  _Private_ handler for DIGEST-MD5 SASL authentication.
     *
     *  Parameters:
     *    (XMLElement) elem - The challenge stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_digest_challenge1_cb: function (elem)
    {
        var attribMatch = /([a-z]+)=("[^"]+"|[^,"]+)(?:,|$)/;

        var challenge = Base64.decode(Strophe.getText(elem));
        var cnonce = MD5.hexdigest("" + (Math.random() * 1234567890));
        var realm = "";
        var host = null;
        var nonce = "";
        var qop = "";
        var matches;

        // remove unneeded handlers
        this.deleteHandler(this._sasl_failure_handler);

        while (challenge.match(attribMatch)) {
            matches = challenge.match(attribMatch);
            challenge = challenge.replace(matches[0], "");
            matches[2] = matches[2].replace(/^"(.+)"$/, "$1");
            switch (matches[1]) {
            case "realm":
                realm = matches[2];
                break;
            case "nonce":
                nonce = matches[2];
                break;
            case "qop":
                qop = matches[2];
                break;
            case "host":
                host = matches[2];
                break;
            }
        }

        var digest_uri = "xmpp/" + this.domain;
        if (host !== null) {
            digest_uri = digest_uri + "/" + host;
        }

        var A1 = MD5.hash(Strophe.getNodeFromJid(this.jid) +
                          ":" + realm + ":" + this.pass) +
            ":" + nonce + ":" + cnonce;
        var A2 = 'AUTHENTICATE:' + digest_uri;

        var responseText = "";
        responseText += 'username=' +
            this._quote(Strophe.getNodeFromJid(this.jid)) + ',';
        responseText += 'realm=' + this._quote(realm) + ',';
        responseText += 'nonce=' + this._quote(nonce) + ',';
        responseText += 'cnonce=' + this._quote(cnonce) + ',';
        responseText += 'nc="00000001",';
        responseText += 'qop="auth",';
        responseText += 'digest-uri=' + this._quote(digest_uri) + ',';
        responseText += 'response=' + this._quote(
            MD5.hexdigest(MD5.hexdigest(A1) + ":" +
                          nonce + ":00000001:" +
                          cnonce + ":auth:" +
                          MD5.hexdigest(A2))) + ',';
        responseText += 'charset="utf-8"';

        this._sasl_challenge_handler = this._addSysHandler(
            this._sasl_digest_challenge2_cb.bind(this), null,
            "challenge", null, null);
        this._sasl_success_handler = this._addSysHandler(
            this._sasl_success_cb.bind(this), null,
            "success", null, null);
        this._sasl_failure_handler = this._addSysHandler(
            this._sasl_failure_cb.bind(this), null,
            "failure", null, null);

        this.send($build('response', {
            xmlns: Strophe.NS.SASL
        }).t(Base64.encode(responseText)).tree());

        return false;
    },

    /** PrivateFunction: _quote
     *  _Private_ utility function to backslash escape and quote strings.
     *
     *  Parameters:
     *    (String) str - The string to be quoted.
     *
     *  Returns:
     *    quoted string
     */
    _quote: function (str)
    {
        return '"' + str.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
        //" end string workaround for emacs
    },


    /** PrivateFunction: _sasl_digest_challenge2_cb
     *  _Private_ handler for second step of DIGEST-MD5 SASL authentication.
     *
     *  Parameters:
     *    (XMLElement) elem - The challenge stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_digest_challenge2_cb: function (elem)
    {
        // remove unneeded handlers
        this.deleteHandler(this._sasl_success_handler);
        this.deleteHandler(this._sasl_failure_handler);

        this._sasl_success_handler = this._addSysHandler(
            this._sasl_success_cb.bind(this), null,
            "success", null, null);
        this._sasl_failure_handler = this._addSysHandler(
            this._sasl_failure_cb.bind(this), null,
            "failure", null, null);
        this.send($build('response', {xmlns: Strophe.NS.SASL}).tree());
        return false;
    },

    /** PrivateFunction: _sasl_scram_challenge_cb
     *  _Private_ handler for SCRAM-SHA-1 SASL authentication.
     *
     *  Parameters:
     *    (XMLElement) elem - The challenge stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_scram_challenge_cb: function (elem)
    {
        var nonce, salt, iter, Hi, U, U_old;
        var clientKey, serverKey, clientSignature;
        var responseText = "c=biws,";
        var challenge = Base64.decode(Strophe.getText(elem));
        var authMessage = this._sasl_data["client-first-message-bare"] + "," +
            challenge + ",";
        var cnonce = this._sasl_data["cnonce"]
        var attribMatch = /([a-z]+)=([^,]+)(,|$)/;

        // remove unneeded handlers
        this.deleteHandler(this._sasl_failure_handler);

        while (challenge.match(attribMatch)) {
            matches = challenge.match(attribMatch);
            challenge = challenge.replace(matches[0], "");
            switch (matches[1]) {
            case "r":
                nonce = matches[2];
                break;
            case "s":
                salt = matches[2];
                break;
            case "i":
                iter = matches[2];
                break;
            }
        }

        if (!(nonce.substr(0, cnonce.length) === cnonce)) {
            this._sasl_data = [];
            return this._sasl_failure_cb(null);
        }

        responseText += "r=" + nonce;
        authMessage += responseText;

        salt = Base64.decode(salt);
        salt += "\0\0\0\1";

        Hi = U_old = core_hmac_sha1(this.pass, salt);
        for (i = 1; i < iter; i++) {
            U = core_hmac_sha1(this.pass, binb2str(U_old));
            for (k = 0; k < 5; k++) {
                Hi[k] ^= U[k];
            }
            U_old = U;
        }
        Hi = binb2str(Hi);

        clientKey = core_hmac_sha1(Hi, "Client Key");
        serverKey = str_hmac_sha1(Hi, "Server Key");
        clientSignature = core_hmac_sha1(str_sha1(binb2str(clientKey)), authMessage);
        this._sasl_data["server-signature"] = b64_hmac_sha1(serverKey, authMessage);

        for (k = 0; k < 5; k++) {
            clientKey[k] ^= clientSignature[k];
        }

        responseText += ",p=" + Base64.encode(binb2str(clientKey));

        this._sasl_success_handler = this._addSysHandler(
            this._sasl_success_cb.bind(this), null,
            "success", null, null);
        this._sasl_failure_handler = this._addSysHandler(
            this._sasl_failure_cb.bind(this), null,
            "failure", null, null);

        this.send($build('response', {
            xmlns: Strophe.NS.SASL
        }).t(Base64.encode(responseText)).tree());

        return false;
    },

    /** PrivateFunction: _auth1_cb
     *  _Private_ handler for legacy authentication.
     *
     *  This handler is called in response to the initial <iq type='get'/>
     *  for legacy authentication.  It builds an authentication <iq/> and
     *  sends it, creating a handler (calling back to _auth2_cb()) to
     *  handle the result
     *
     *  Parameters:
     *    (XMLElement) elem - The stanza that triggered the callback.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _auth1_cb: function (elem)
    {
        // build plaintext auth iq
        var iq = $iq({type: "set", id: "_auth_2"})
            .c('query', {xmlns: Strophe.NS.AUTH})
            .c('username', {}).t(Strophe.getNodeFromJid(this.jid))
            .up()
            .c('password').t(this.pass);

        if (!Strophe.getResourceFromJid(this.jid)) {
            // since the user has not supplied a resource, we pick
            // a default one here.  unlike other auth methods, the server
            // cannot do this for us.
            this.jid = Strophe.getBareJidFromJid(this.jid) + '/strophe';
        }
        iq.up().c('resource', {}).t(Strophe.getResourceFromJid(this.jid));

        this._addSysHandler(this._auth2_cb.bind(this), null,
                            null, null, "_auth_2");

        this.send(iq.tree());

        return false;
    },

    /** PrivateFunction: _sasl_success_cb
     *  _Private_ handler for succesful SASL authentication.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_success_cb: function (elem)
    {
        if (this._sasl_data["server-signature"]) {
            var serverSignature;
            var success = Base64.decode(Strophe.getText(elem));
            var attribMatch = /([a-z]+)=([^,]+)(,|$)/;
            matches = success.match(attribMatch);
            if (matches[1] == "v") {
                serverSignature = matches[2];
            }
	    if (serverSignature != this._sasl_data["server-signature"]) {
		// remove old handlers
		this.deleteHandler(this._sasl_failure_handler);
		this._sasl_failure_handler = null;
		if (this._sasl_challenge_handler) {
			this.deleteHandler(this._sasl_challenge_handler);
			this._sasl_challenge_handler = null;
		}

		this._sasl_data = [];
		return this._sasl_failure_cb(null);
	    }
	}

	Strophe.info("SASL authentication succeeded.");

        // remove old handlers
        this.deleteHandler(this._sasl_failure_handler);
        this._sasl_failure_handler = null;
        if (this._sasl_challenge_handler) {
            this.deleteHandler(this._sasl_challenge_handler);
            this._sasl_challenge_handler = null;
        }

        this._addSysHandler(this._sasl_auth1_cb.bind(this), null,
                            "stream:features", null, null);

        // we must send an xmpp:restart now
        this._sendRestart();

        return false;
    },

    /** PrivateFunction: _sasl_auth1_cb
     *  _Private_ handler to start stream binding.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_auth1_cb: function (elem)
    {
        // save stream:features for future usage
        this.features = elem;

        var i, child;

        for (i = 0; i < elem.childNodes.length; i++) {
            child = elem.childNodes[i];
            if (child.nodeName == 'bind') {
                this.do_bind = true;
            }

            if (child.nodeName == 'session') {
                this.do_session = true;
            }
        }

        if (!this.do_bind) {
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, null);
            return false;
        } else {
            this._addSysHandler(this._sasl_bind_cb.bind(this), null, null,
                                null, "_bind_auth_2");

            var resource = Strophe.getResourceFromJid(this.jid);
            if (resource) {
                this.send($iq({type: "set", id: "_bind_auth_2"})
                          .c('bind', {xmlns: Strophe.NS.BIND})
                          .c('resource', {}).t(resource).tree());
            } else {
                this.send($iq({type: "set", id: "_bind_auth_2"})
                          .c('bind', {xmlns: Strophe.NS.BIND})
                          .tree());
            }
        }

        return false;
    },

    /** PrivateFunction: _sasl_bind_cb
     *  _Private_ handler for binding result and session start.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_bind_cb: function (elem)
    {
        if (elem.getAttribute("type") == "error") {
            Strophe.info("SASL binding failed.");
			var conflict = elem.getElementsByTagName("conflict"), condition;
			if (conflict.length > 0) {
				condition = 'conflict';
			}
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, condition);
            return false;
        }

        // TODO - need to grab errors
        var bind = elem.getElementsByTagName("bind");
        var jidNode;
        if (bind.length > 0) {
            // Grab jid
            jidNode = bind[0].getElementsByTagName("jid");
            if (jidNode.length > 0) {
                this.jid = Strophe.getText(jidNode[0]);

                if (this.do_session) {
                    this._addSysHandler(this._sasl_session_cb.bind(this),
                                        null, null, null, "_session_auth_2");

                    this.send($iq({type: "set", id: "_session_auth_2"})
                                  .c('session', {xmlns: Strophe.NS.SESSION})
                                  .tree());
                } else {
                    this.authenticated = true;
                    this._changeConnectStatus(Strophe.Status.CONNECTED, null);
                }
            }
        } else {
            Strophe.info("SASL binding failed.");
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, null);
            return false;
        }
    },

    /** PrivateFunction: _sasl_session_cb
     *  _Private_ handler to finish successful SASL connection.
     *
     *  This sets Connection.authenticated to true on success, which
     *  starts the processing of user handlers.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_session_cb: function (elem)
    {
        if (elem.getAttribute("type") == "result") {
            this.authenticated = true;
            this._changeConnectStatus(Strophe.Status.CONNECTED, null);
        } else if (elem.getAttribute("type") == "error") {
            Strophe.info("Session creation failed.");
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, null);
            return false;
        }

        return false;
    },

    /** PrivateFunction: _sasl_failure_cb
     *  _Private_ handler for SASL authentication failure.
     *
     *  Parameters:
     *    (XMLElement) elem - The matching stanza.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _sasl_failure_cb: function (elem)
    {
        // delete unneeded handlers
        if (this._sasl_success_handler) {
            this.deleteHandler(this._sasl_success_handler);
            this._sasl_success_handler = null;
        }
        if (this._sasl_challenge_handler) {
            this.deleteHandler(this._sasl_challenge_handler);
            this._sasl_challenge_handler = null;
        }

        this._changeConnectStatus(Strophe.Status.AUTHFAIL, null);
        return false;
    },

    /** PrivateFunction: _auth2_cb
     *  _Private_ handler to finish legacy authentication.
     *
     *  This handler is called when the result from the jabber:iq:auth
     *  <iq/> stanza is returned.
     *
     *  Parameters:
     *    (XMLElement) elem - The stanza that triggered the callback.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _auth2_cb: function (elem)
    {
        if (elem.getAttribute("type") == "result") {
            this.authenticated = true;
            this._changeConnectStatus(Strophe.Status.CONNECTED, null);
        } else if (elem.getAttribute("type") == "error") {
            this._changeConnectStatus(Strophe.Status.AUTHFAIL, null);
            this.disconnect();
        }

        return false;
    },

    /** PrivateFunction: _addSysTimedHandler
     *  _Private_ function to add a system level timed handler.
     *
     *  This function is used to add a Strophe.TimedHandler for the
     *  library code.  System timed handlers are allowed to run before
     *  authentication is complete.
     *
     *  Parameters:
     *    (Integer) period - The period of the handler.
     *    (Function) handler - The callback function.
     */
    _addSysTimedHandler: function (period, handler)
    {
        var thand = new Strophe.TimedHandler(period, handler);
        thand.user = false;
        this.addTimeds.push(thand);
        return thand;
    },

    /** PrivateFunction: _addSysHandler
     *  _Private_ function to add a system level stanza handler.
     *
     *  This function is used to add a Strophe.Handler for the
     *  library code.  System stanza handlers are allowed to run before
     *  authentication is complete.
     *
     *  Parameters:
     *    (Function) handler - The callback function.
     *    (String) ns - The namespace to match.
     *    (String) name - The stanza name to match.
     *    (String) type - The stanza type attribute to match.
     *    (String) id - The stanza id attribute to match.
     */
    _addSysHandler: function (handler, ns, name, type, id)
    {
        var hand = new Strophe.Handler(handler, ns, name, type, id);
        hand.user = false;
        this.addHandlers.push(hand);
        return hand;
    },

    /** PrivateFunction: _onDisconnectTimeout
     *  _Private_ timeout handler for handling non-graceful disconnection.
     *
     *  If the graceful disconnect process does not complete within the
     *  time allotted, this handler finishes the disconnect anyway.
     *
     *  Returns:
     *    false to remove the handler.
     */
    _onDisconnectTimeout: function ()
    {
        Strophe.info("_onDisconnectTimeout was called");

        // cancel all remaining requests and clear the queue
        var req;
        while (this._requests.length > 0) {
            req = this._requests.pop();
            req.abort = true;
            req.xhr.abort();
            // jslint complains, but this is fine. setting to empty func
            // is necessary for IE6
            req.xhr.onreadystatechange = function () {};
        }

        // actually disconnect
        this._doDisconnect();

        return false;
    },

    /** PrivateFunction: _onIdle
     *  _Private_ handler to process events during idle cycle.
     *
     *  This handler is called every 100ms to fire timed handlers that
     *  are ready and keep poll requests going.
     */
    _onIdle: function ()
    {
        var i, thand, since, newList;

        // add timed handlers scheduled for addition
        // NOTE: we add before remove in the case a timed handler is
        // added and then deleted before the next _onIdle() call.
        while (this.addTimeds.length > 0) {
            this.timedHandlers.push(this.addTimeds.pop());
        }

        // remove timed handlers that have been scheduled for deletion
        while (this.removeTimeds.length > 0) {
            thand = this.removeTimeds.pop();
            i = this.timedHandlers.indexOf(thand);
            if (i >= 0) {
                this.timedHandlers.splice(i, 1);
            }
        }

        // call ready timed handlers
        var now = new Date().getTime();
        newList = [];
        for (i = 0; i < this.timedHandlers.length; i++) {
            thand = this.timedHandlers[i];
            if (this.authenticated || !thand.user) {
                since = thand.lastCalled + thand.period;
                if (since - now <= 0) {
                    if (thand.run()) {
                        newList.push(thand);
                    }
                } else {
                    newList.push(thand);
                }
            }
        }
        this.timedHandlers = newList;

        var body, time_elapsed;

        // if no requests are in progress, poll
        if (this.authenticated && this._requests.length === 0 &&
            this._data.length === 0 && !this.disconnecting) {
            Strophe.info("no requests during idle cycle, sending " +
                         "blank request");
            this._data.push(null);
        }

        if (this._requests.length < 2 && this._data.length > 0 &&
            !this.paused) {
            body = this._buildBody();
            for (i = 0; i < this._data.length; i++) {
                if (this._data[i] !== null) {
                    if (this._data[i] === "restart") {
                        body.attrs({
                            to: this.domain,
                            "xml:lang": "en",
                            "xmpp:restart": "true",
                            "xmlns:xmpp": Strophe.NS.BOSH
                        });
                    } else {
                        body.cnode(this._data[i]).up();
                    }
                }
            }
            delete this._data;
            this._data = [];
            this._requests.push(
                new Strophe.Request(body.tree(),
                                    this._onRequestStateChange.bind(
                                        this, this._dataRecv.bind(this)),
                                    body.tree().getAttribute("rid")));
            this._processRequest(this._requests.length - 1);
        }

        if (this._requests.length > 0) {
            time_elapsed = this._requests[0].age();
            if (this._requests[0].dead !== null) {
                if (this._requests[0].timeDead() >
                    Math.floor(Strophe.SECONDARY_TIMEOUT * this.wait)) {
                    this._throttledRequestHandler();
                }
            }

            if (time_elapsed > Math.floor(Strophe.TIMEOUT * this.wait)) {
                Strophe.warn("Request " +
                             this._requests[0].id +
                             " timed out, over " + Math.floor(Strophe.TIMEOUT * this.wait) +
                             " seconds since last activity");
                this._throttledRequestHandler();
            }
        }

        clearTimeout(this._idleTimeout);

        // reactivate the timer only if connected
        if (this.connected) {
            this._idleTimeout = setTimeout(this._onIdle.bind(this), 100);
        }
    }
};

if (callback) {
    callback(Strophe, $build, $msg, $iq, $pres);
}

})(function () {
    window.Strophe = arguments[0];
    window.$build = arguments[1];
    window.$msg = arguments[2];
    window.$iq = arguments[3];
    window.$pres = arguments[4];
});

});

require.define("/lib/network/transport/strophe.disco.js", function (require, module, exports, __dirname, __filename) {
/*
  Copyright 2010, François de Metz <francois@2metz.fr>
*/

/**
 * Disco Strophe Plugin
 * Implement http://xmpp.org/extensions/xep-0030.html
 * TODO: manage node hierarchies, and node on info request
 */
Strophe.addConnectionPlugin('disco',
{
    _connection: null,
    _identities : [],
    _features : [],
    _items : [],
    /** Function: init
     * Plugin init
     *
     * Parameters:
     *   (Strophe.Connection) conn - Strophe connection
     */
    init: function(conn)
    {
    this._connection = conn;
        this._identities = [];
        this._features   = [];
        this._items      = [];
        // disco info
        conn.addHandler(this._onDiscoInfo.bind(this), Strophe.NS.DISCO_INFO, 'iq', 'get', null, null);
        // disco items
        conn.addHandler(this._onDiscoItems.bind(this), Strophe.NS.DISCO_ITEMS, 'iq', 'get', null, null);
    },
    /** Function: addIdentity
     * See http://xmpp.org/registrar/disco-categories.html
     * Parameters:
     *   (String) category - category of identity (like client, automation, etc ...)
     *   (String) type - type of identity (like pc, web, bot , etc ...)
     *   (String) name - name of identity in natural language
     *   (String) lang - lang of name parameter
     *
     * Returns:
     *   Boolean
     */
    addIdentity: function(category, type, name, lang)
    {
        for (var i=0; i<this._identities.length; i++)
        {
            if (this._identities[i].category == category &&
                this._identities[i].type == type &&
                this._identities[i].name == name &&
                this._identities[i].lang == lang)
            {
                return false;
            }
        }
        this._identities.push({category: category, type: type, name: name, lang: lang});
        return true;
    },
    /** Function: addFeature
     *
     * Parameters:
     *   (String) var_name - feature name (like jabber:iq:version)
     *
     * Returns:
     *   boolean
     */
    addFeature: function(var_name)
    {
        for (var i=0; i<this._features.length; i++)
        {
             if (this._features[i] == var_name)
                 return false;
        }
        this._features.push(var_name);
        return true;
    },
    /** Function: addItem
     *
     * Parameters:
     *   (String) jid
     *   (String) name
     *   (String) node
     *   (Function) call_back
     *
     * Returns:
     *   boolean
     */
    addItem: function(jid, name, node, call_back)
    {
        if (node && !call_back)
            return false;
        this._items.push({jid: jid, name: name, node: node, call_back: call_back});
        return true;
    },
    /** Function: info
     * Info query
     *
     * Parameters:
     *   (Function) call_back
     *   (String) jid
     *   (String) node
     */
    info: function(jid, node, success, error, timeout)
    {
        var attrs = {xmlns: Strophe.NS.DISCO_INFO};
        if (node)
            attrs.node = node;

        var info = $iq({from:this._connection.jid,
                         to:jid, type:'get'}).c('query', attrs);
        this._connection.sendIQ(info, success, error, timeout);
    },
    /** Function: items
     * Items query
     *
     * Parameters:
     *   (Function) call_back
     *   (String) jid
     *   (String) node
     */
    items: function(jid, node, success, error, timeout)
    {
        var attrs = {xmlns: Strophe.NS.DISCO_ITEMS};
        if (node)
            attrs.node = node;

        var items = $iq({from:this._connection.jid,
                         to:jid, type:'get'}).c('query', attrs);
        this._connection.sendIQ(items, success, error, timeout);
    },
    /** PrivateFunction: _onDiscoInfo
     * Called when receive info request
     */
    _onDiscoInfo: function(stanza)
    {
        var id   =  stanza.getAttribute('id');
        var from = stanza.getAttribute('from');
        var node = stanza.getElementsByTagName('query')[0].getAttribute('node');
        var attrs = {xmlns: Strophe.NS.DISCO_INFO};
        if (node)
        {
            attrs.node = node;
        }
        var iqresult = $iq({type: 'result', id: id, to: from}).c('query', attrs);
        for (var i=0; i<this._identities.length; i++)
        {
            var attrs = {category: this._identities[i].category,
                         type    : this._identities[i].type};
            if (this._identities[i].name)
                attrs.name = this._identities[i].name;
            if (this._identities[i].lang)
                attrs['xml:lang'] = this._identities[i].lang;
            iqresult.c('identity', attrs).up();
        }
        for (var i=0; i<this._features.length; i++)
        {
            iqresult.c('feature', {'var':this._features[i]}).up();
        }
        this._connection.send(iqresult.tree());
        return true;
    },
    /** PrivateFunction: _onDiscoItems
     * Called when receive items request
     */
    _onDiscoItems: function(stanza)
    {
        var id   = stanza.getAttribute('id');
        var from = stanza.getAttribute('from');
        var query_attrs = {xmlns: Strophe.NS.DISCO_ITEMS};
        var node = stanza.getElementsByTagName('query')[0].getAttribute('node');
        if (node)
        {
            query_attrs.node = node;
            var items = null;
            for (var i = 0; i < this._items.length; i++)
            {
                if (this._items[i].node == node)
                {
                    items = this._items[i].call_back(stanza);
                    break;
                }
            }
        }
        else
        {
            var items = this._items;
        }
        var iqresult = $iq({type: 'result', id: id, to: from}).c('query', query_attrs);
        for (var i = 0; i < items.length; i++)
        {
            var attrs = {jid:  items[i].jid};
            if (items[i].name)
                attrs.name = items[i].name;
            if (items[i].node)
                attrs.node = items[i].node;
            iqresult.c('item', attrs).up();
        }
        this._connection.send(iqresult.tree());
        return true;
    }
});
});

require.define("/lib/network/transport/strophe.rpc.js", function (require, module, exports, __dirname, __filename) {
/**
 * This program is distributed under the terms of the MIT license.
 * 
 * Copyright 2011 (c) Pierre Guilleminot <pierre.guilleminot@gmail.com>
 */

/**
 * Jabber-RPC plugin (XEP-0009)
 * Allow the management of RPC
 */
Strophe.addConnectionPlugin("rpc", {

  _connection : undefined,

  _whitelistEnabled : false,

  jidWhiteList : [],
  nodeWhiteList : [],
  domainWhiteList : [],

  /**
   * Plugin init
   * 
   * @param  {Strophe.Connection} connection Strophe connection
   */
  init: function(connection) {

    this._connection = connection;

    this._whitelistEnabled = false;

    this.jidWhiteList    = [];
    this.nodeWhiteList   = [];
    this.domainWhiteList = [];

    Strophe.addNamespace("RPC", "jabber:iq:rpc");

    if (!connection.hasOwnProperty("disco")) {
      Strophe.warn("You need the discovery plugin " +
                   "to have Jabber-RPC fully implemented.");
    }
    else {
      this._connection.disco.addIdentity("automation", "rpc");
      this._connection.disco.addFeature(Strophe.NS.RPC);
    }
  },

  /**
   * Add a jid or an array of jids to
   * the whitelist.
   * It's possible to use wildecards for the domain
   * or the node. ie:
   *   *@*
   *   myname@*
   *   *@jabber.org
   * 
   * @param {String|Array} jid
   */
  addJidToWhiteList: function(jids) {
    if (typeof(jids.sort) !== "function") {
      jids = [jids];
    }

    for (var i = 0; i < jids.length; i++) {
      var jid = jids[i];

      if (jid === "*@*") {
        this._whitelistEnabled = false;
        return;
      }

      var node   = Strophe.getNodeFromJid(jid);
      var domain = Strophe.getDomainFromJid(jid);
      if (jid) {
        if (node === "*") {
          this.domainWhiteList.push(domain);
        } else if (domain === "*") {
          this.nodeWhiteList.push(node);
        } else {
          this.jidWhiteList.push(jid);
        }
        this._whitelistEnabled = true;
      }
    }
  },

  /**
   * Helper to filter out Jid outside of the whitelists
   * 
   * @param  {String} jid Jid to test 
   * @return {Boolean}
   */
  _jidInWhitelist: function(jid) {
    if (!this._whitelistEnabled)
      return true;

    if (jid === this._connection.jid)
      return true;
    
    return (
      this.domainWhiteList.indexOf(Strophe.getDomainFromJid(jid)) !== -1  ||
      this.nodeWhiteList.indexOf(Strophe.getNodeFromJid(jid))     !== -1  ||
      this.jidWhiteList.indexOf(jid) !== -1
    );
  },

  /**
   * Send a XMLElement as the request
   * Does not check whether it is properly formed or not
   * 
   * @param  {String}  id      ID of the request or response 
   * @param  {String}  to      JID of the recipient
   * @param  {String}  type    Type of the request ('set' for a request and 'result' for a response)
   * @param  {Element} element The XMLElement to send
   */
  sendXMLElement: function(id, to, type, element) {
    if (typeof element.tree === 'function') {
      element = element.tree();
    }

    var iq = $iq({type: type, id: id, from: this._connection.jid, to: to})
      .c("query", {xmlns: Strophe.NS.RPC})
      .cnode(element);
    
    this._connection.send(iq.tree());
  },

  _sendForbiddenAccess: function(id, to) {
    var iq = $iq({type: "error", id: id, from: this._connection.jid, to: to})
      .c("error", {code: 403, type: "auth"})
      .c("forbidden", {xmlns: Strophe.NS.STANZAS});
    
    this._connection.send(iq.tree());
  },

  /**
   * Add a raw XML handler for every RPC message incoming
   * @param {Function} handler The handler function called every time a rpc is received
   * @param {Object} context Context of the handler
   */
  addXMLHandler: function(handler, context) {
    this._connection.addHandler(this._filteredHandler(handler, context), Strophe.NS.RPC, "iq");
  },

  _filter: function(xml) {
    var from = xml.getAttribute("from");
    if (!this._jidInWhitelist(from)) {
      this._sendForbiddenAccess(xml.getAttribute("id"), from);
      return false;
    }
    return true;
  },

  _filteredHandler: function(handler, context) {
    context = context || this;
    var self = this;
    return function(xml) {
      if (self._filter(xml)) {
        return handler.apply(context, arguments);
      }
      return true;
    };
  }

});
});

require.define("/lib/network/rpc/ping.js", function (require, module, exports, __dirname, __filename) {
RPC   = require('./rpc');

var PingRPC = module.exports = RPC.extend({

  initialize: function(queried_peer) {
    if (arguments.length === 0) {
      this.supr();
    } else {
      this.supr(queried_peer, 'PING');
    }
  },

  normalizeParams: function() {
    return {};
  },

  handleNormalizedParams: function(params) {
    this.params = [];
  },

  normalizeResult: function() {
    return {};
  },

  handleNormalizedResult: function(result) {
    this.resolve();
  }
});
});

require.define("/lib/network/rpc/rpc.js", function (require, module, exports, __dirname, __filename) {
var Deferred  = require('../../util/deferred'),
    Peer      = require('../../dht/peer'),
    globals   = require('../../globals'),

    log       = require('../../logging').ns('Reactor');


var RPC = module.exports = Deferred.extend({

  initialize: function(queried_peer, method, params) {
    this.supr();

    // if no arguments, empty RPC that need to parsed from normalized query
    if (arguments.length === 0) return;

    this._rtt = 0;
    this._isTimeout = false;

    this.method = method;
    this.params = params || []; // params should alwais be an array
    this.setQueried(queried_peer);

    //hack
    if(this.reactor)
      this.setQuerying(this.reactor.getMeAsPeer());

    this.setID(this._generateRandomID());
  },

  // to be defined...
  reactor : undefined,

  //
  // Getters
  //

  getMethod : function() {
    return this.method;
  },

  getParams: function(index) {
    if (typeof index === 'number') {
      return this.params[index];
    }
    return this.params;
  },

  getResult: function() {
    return this.getResolvePassedArgs();
  },

  getError: function() {
    return this.getRejectPassedArgs();
  },

  getRTT: function() {
    return this._rtt;
  },

  isTimeout: function() {
    return this._isTimeout;
  },

  //peers role
  
  setQueried : function(queried_peer) {
    this.queried = queried_peer;
  },

  getQueried: function() {
    return this.queried;
  },

  setQuerying : function(querying_peer) {
    this.querying = querying_peer;
  },

  getQuerying: function() {
    return this.querying;
  },

  /**
   * Send method for this RPC.
   */
  sendQuery : function() {
    this._sendTime = new Date().getTime();
    this._setTimeout();
    this.reactor.sendRPCQuery(this);
    return this;
  },

  sendResponse: function() {
    this.reactor.sendRPCResponse(this);
    return this;
  },
 
  handleNormalizedQuery: function(query, from) {
    this.setQueried(this.reactor.getMeAsPeer());

    this.id     = query.id;
    this.method = query.method;

    var params = query.params[0];
    if (typeof params !== 'object') {
      log.warn('query with no parameters');
      this.reject();
    }
    else if (this._nonValidID(params.id)) {
      log.warn('query with non valid node id');
      this.reject();
    }
    else {
      this.setQuerying(new Peer(from, params.id));
      this.handleNormalizedParams(params);
    }

    return this;
  },

  // @abstract
  handleNormalizedParams: function() {
    return this;
  },

  // @abstract
  normalizeParams: function() {
    return {};
  },

  /**
   * Express the query associated to this RPC wihtin a normalized form.
   * @return the normalized query
   */
  normalizeQuery : function() {
    var params = this.normalizeParams();
    params.id = this.getQuerying().getID();

    return {
      type : 'request',
      id     : this.getID(),
      method : this.method,
      params : [params]
    };
  },

  // @abstract
  normalizeResult: function() {
    return {};
  },

  normalizeResponse: function() {
    var res = {
      type : 'response',
      id     : this.getID(),
      method : this.method
    };

    if (this.isResolved()) {
      res.result    = this.normalizeResult();
      res.result.id = this.getQueried().getID();
    } else if (this.isRejected()) {
      res.error = this.normalizeError();
    } else {
      log.warn('try to normalize a response already completed');
      return null;
    }
    return res;
  },

  normalizeError: function() {
    return this.getError().toString();
  },

  /**
   * Handle the response coming from the node that have executed the RPC. This
   * method should do verifications and reject or resolve the RPC (as deferred).
   *
   * @param  {RPCResponse}  response            ResponseRPC object
   * @param  {Function}     [specific_handler]  Specific handler
   */
  handleNormalizedResponse: function(response, from) {
    this._rtt = new Date().getTime() - this._sendTime;

    if (this.isResolved() || this.isRejected()) {
      log.warn('received response to an already completed query', from, response);
      return this;
    }

    if (from && from !== this.getQueried().getAddress()) {
      log.warn('spoofing attack from ' + from + ' instead of ' + this.getQueried().getAddress());
      return this;
    }

    if (response.hasOwnProperty('result')) {
      var id = response.result.id;
      if (this._nonValidID(id)) {
        log.warn('non valid ID', id, response);
        this.reject();
      }
      // if the ID is outdated (not the same in the response and in the routing table)
      // call the ErrBack with the outdated event
      else if (this._outdatedID(id)) {
        log.info('outdated ID', this.getQueried(), id);
        this.reject('outdated', this.getQueried(), id);
      } else {
        this.handleNormalizedResult(response.result);
      }
    } else if (response.hasOwnProperty('error')) {
      this.handleNormalizedError(response.error);
    } else {
      this.reject();
    }
    return this;
  },

  // @abstract
  handleNormalizedResult: function(result) {
    this.resolve();
  },

  handleNormalizedError: function(error) {
    this.reject(new Error(error));
  },

  /**
   * Clear the timer and resolve.
   * @extends {Deferred#resolve}
   */
  resolve: function() {
    this._clearTimeout();
    this.supr.apply(this,arguments);
  },

  /**
   * Clear the timer and reject.
   * @extends {Deferred#reject}
   */
  reject: function() {
    this._clearTimeout();
    this.supr.apply(this,arguments);
  },

  cancel: function() {
    this._clearTimeout();
    this.supr();
  },

  //
  // Timeout
  //

  _setTimeout: function() {
    this._timeoutID = setTimeout(function(self) {
      if (self.inProgress()) {
        log.info('query timeout');
        self._isTimeout = true;
        self.reject(new Error('timeout'));
      }
    }, this.reactor.timeoutValue, this);
  },

  _clearTimeout: function() {
    if (this._timeoutID) {
      clearTimeout(this._timeoutID);
      this._timeoutID = undefined;
    }
  },

  //
  // ID
  //

  setID : function(id) {
    this.id = id;
  },

  getID : function() {
    return this.id;
  },

  _generateRandomID : function() {
    var dict   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
        length = 2,
        id     = '';
    for (var i = 0; i < length; i++) {
      id += dict.charAt(Math.floor(Math.random() * dict.length));
    }
    return id;
  },

  /**
   * Check if an id is given in the response.
   * @private
   * @param  {String} id ID to validated
   * @return {Boolean} True if and only if the ID is not valid
   */
  _nonValidID: function(id) {
    return (typeof id !== 'string' || !globals.REGEX_NODE_ID.test(id));
  },

  /**
   * Check if the id responded if the same as the local one.
   * @private
   * @param  {String} id ID to check
   * @return {Boolean} True if and only if the ID is outdated
   */
  _outdatedID: function(id) {
    var queried_id = this.getQueried().getID();

    // if the id of the destination
    // peer is a bootstrap (with null id), update queried
    if (queried_id === null) {
      this.getQueried().setID(id);
    }
    else if (id !== queried_id) {
      return true;
    }
    return false;
  }

});
});

require.define("/lib/network/rpc/findnode.js", function (require, module, exports, __dirname, __filename) {
var RPC       = require('./rpc'),
    globals   = require('../../globals'),
    PeerArray = require('../../util/peerarray');

var FindNodeRPC = module.exports = RPC.extend({

  initialize: function(queried_peer, target_id) {
    if (arguments.length === 0) {
      this.supr();
    } else {
      this.supr(queried_peer, 'FIND_NODE', [target_id]);
    }
  },

  getTarget: function() {
    return this.getParams(0);
  },

  normalizeParams: function() {
    return {
      target : this.getTarget()
    };
  },

  handleNormalizedParams: function(params) {
    if (typeof params.target !== 'string' || !globals.REGEX_NODE_ID.test(params.target)) {
      this.reject(new Error('non valid findnode query'));
    } else {
      this.params = [params.target];
    }
    return this;
  },

  normalizeResult: function() {
    return {
      nodes : this.getResult()[0].getTripleArray()
    };
  },

  handleNormalizedResult: function(result) {
    var nodes;
    try {
      nodes = new PeerArray(result.nodes);
    } catch(e) {
      return this.reject(new Error('non valid findnode response'));
    }
    return this.resolve(nodes);
  }

});
});

require.define("/lib/network/rpc/findvalue.js", function (require, module, exports, __dirname, __filename) {
var RPC       = require('./rpc'),
    globals   = require('../../globals'),
    PeerArray = require('../../util/peerarray');


var FindValueRPC = module.exports = RPC.extend({

  initialize: function(queried_peer, target_id) {
    if (arguments.length === 0) {
      this.supr();
    } else {
      this.supr(queried_peer, 'FIND_VALUE', [target_id]);
    }
  },

  getTarget: function() {
    return this.getParams(0);
  },

  normalizeParams: function() {
    return {
      target : this.getTarget()
    };
  },

  handleNormalizedParams: function(params) {
    if (typeof params.target !== 'string' || !globals.REGEX_NODE_ID.test(params.target)) {
      this.reject(new Error('non valid findvalue query'));
    } else {
      this.params = [params.target];
    }
    return this;
  },

  normalizeResult: function() {
    var args   = this.getResult(),
        nodes  = args[0].getTripleArray(),
        result = args[1];
    if (result) {
      return {
        nodes : nodes,
        value : result.value,
        exp   : result.exp || -1
      };
    } else {
      return {
        nodes : nodes
      };
    }
  },

  handleNormalizedResult: function(result) {
    var nodes, value = null;
    try {
      if (result.nodes) {
        nodes = new PeerArray(result.nodes);
        if (result.value) {
          value = {
            value : result.value,
            exp   : result.exp
          };
        }
        this.resolve(nodes, value);
      } else {
        this.reject(new Error('non valid findvalue response'));
      }
    } catch(e) {
      return this.reject(new Error('non valid findvalue response'));
    }
  }

});
});

require.define("/lib/network/rpc/store.js", function (require, module, exports, __dirname, __filename) {
var RPC     = require('./rpc'),
    globals = require('../../globals');


var StoreRPC = module.exports = RPC.extend({

  initialize: function(queried_peer, key, value, exp) {
    if (arguments.length === 0) {
      this.supr();
    } else {
      this.supr(queried_peer, 'STORE', [key, value, exp]);
    }
  },

  getKey: function() {
    return this.getParams(0);
  },

  getValue: function() {
    return this.getParams(1);
  },

  getExpiration: function() {
    return this.getParams(2);
  },

  normalizeParams: function() {
    var exp = this.getExpiration();
    if (!exp || ~exp) exp = -1;
    return {
      key   : this.getKey(),
      value : this.getValue(),
      exp   : exp
    };
  },

  handleNormalizedParams: function(params) {
    if (typeof params.key !== 'string' || !globals.REGEX_NODE_ID.test(params.key)) {
      return this.reject(new Error('non valid store key'));
    } else {
      this.params = [params.key, params.value, params.exp];
    }
  },

  normalizeResult: function() {
    return {};
  },

  handleNormalizedResult: function(result) {
    this.resolve();
  }

});
});

require.define("/lib/data/value-store.js", function (require, module, exports, __dirname, __filename) {
var EventEmitter      = require('../util/eventemitter'),
    globals           = require('../globals'),
    Deferred          = require('../util/deferred'),
    Crypto            = require('../util/crypto'),

    //@browserify-alias[lawnchair] ./storage/lawnchair -r
    //@browserify-alias[basic]     ./storage/basic     -r
    PersistentStorage = require('./storage/lawnchair'),

    log               = require('../logging').ns('ValueStore');

var ValueStore = module.exports = EventEmitter.extend({

  /**
   * Instanciate a new value management.
   *
   * @constructs
   * @param  {Object} name  A unique name of the store
   * @param  {Object} [options] Some configuration options..
   * @param  {Boolean} [options.recover = true] If true, try to recover the last session that
   *                                    coresponds to the address/nodeID. If false, session is
   *                                    destructed and a new one is created.
   */
  initialize: function(name, options) {
    this.supr();
    
    var config = this.config = {
      recover    : true,
      delayedRep : true
    };
    for (var option in options) {
      config[option] = options[option];
    }

    var self = this;
    this._store = new PersistentStorage({
      name   : name,
      record : 'KeyValue'
    }, function() {});

    log.debug('initializing' + ((options && options.recover) ? ' with recover' : ''));
    if (config.recover) {
      this._recover();
    } else {
      this._store.nuke();
    }
    this._RepTimeouts = {};
    this._ExpTimeouts = {};

    this.emit('initialized');
  },

  /**
   * Stop the value management instance.
   *  - clear all timeouts
   * @return {this}
   */
  stop : function() {
    for(var i in this._RepTimeouts) {
      clearTimeout(this._RepTimeouts[i]);
      delete this._RepTimeouts[i];
    }
    for(var j in this._ExpTimeouts) {
      clearTimeout(this._ExpTimeouts[j]);
      delete this._ExpTimeouts[j];
    }
    return this;
  },

  /**
   * Store the given key/value in the storage. Provide an expirimation time.
   * Return ta deferred object representig the state of the store (resolved : OK, rejected : not OK).
   *
   * In the background, timers for republish and expiration are started.
   * For the xpiration time : negative value or not set : no expiration.
   *
   * Key/value are stored as object with properties :
   *   key   - the key
   *   value - the value that coresspond to the key (null if not found)
   *   exp   - expiration date (null or negative if unlimited)
   *   rep   - next republish date
   *
   * @public
   * @see  Deferred
   *
   * @param  {String}   key   the key associated to the value
   * @param  {*}        value the value of the key value
   * @param  {Integer}  [exp = -1]   timestamp for the expiration date (UTC in ms). If negative value or not set : no expiration.
   * @return {Deferred} a deferred object representing the state of the store
   */

  save: function(key, value, exp) {
    var def = new Deferred();

    var KeyValue = {
      key   : key,
      value : value
    };

    var now = new Date().getTime();

    //set republish date
    KeyValue.rep =  now + this._repTime;

    //check expiration time : negative value means infinite.
    KeyValue.exp = exp || -1;

    if( KeyValue.exp > 0 && KeyValue.exp <= now) {
      KeyValue.now = now;
      log.warn('save failed : key-value already expired', KeyValue);
      def.reject('key-value already expired');
      return def;
    }

    //set the timers
    this._setRepTimeout(KeyValue, this._repTime);
    this._setExpTimeout(KeyValue, KeyValue.exp - now);

    //and save
    this._store.save(KeyValue, function(obj) {
      def.resolve(obj);
    });

    //inform the rest of the world
    this.emit('save', KeyValue);

    return def;
  },

  /**
   * Retrieve the value of the key.
   *
   * To catch the result, there is 2 ways :
   *    - provide a callback function that will be called with value and
   *    expiration date as arguments.
   *    - handle the defered object that is returned, by this methods. If
   *    result, value and expiration date are passed to the success calback
   *    and if no result, the errback is called.
   *
   * Are passed as arguments of the callbak functions:
   *   value - the value that coresspond to the key (null if not found)
   *   exp   - expiration date (null or negative if unlimited)
   *
   * @see  Deferred
   * @public
   *
   * @param  {String}   key      the key associated to the value
   * @param  {Function} [callback] callback function
   * @param  {Object}   [scope = this ValueStore obejct] the scope to apply to the callback function (by default : the instance of ValueManagement)
   * @return {Deferred} a deferred object representing the state of the retrieve
   */

  retrieve: function(key, callback, scope) {
    var def = new Deferred();

    scope = scope || this;
    this._store.get(key, function(obj) {
      if(obj === null) {
        if (callback) callback.call(scope, null);
        def.reject();
      }
      else {
        if (callback) callback.call(scope, obj.value, obj.exp);
        def.resolve(obj.value, obj.exp);
      }
    });
    return def;
  },

  /**
   * Recover the last stored session.
   *
   * @private
   */
  _recover: function() {
    var now = new Date().getTime();
    var self = this;

    this._store.each(function(kv){
      try {
        if(kv.exp >= 0 && kv.exp <= now) {
          self._store.remove(kv.key);
          return;
        }
        self._setExpTimeout(kv,kv.exp - now);
        
        if(typeof kv.rep == 'undefined' || kv.exp <= now) {
          self._republish(kv);
          kv.rep =  now + self._repTime;
          self._store.save(kv);
        }
         
        self._setRepTimeout(kv, kv.rep - now);
        
      } catch(e) {
        self._store.remove(kv.key);
      }
    });
  },

  /**
   * Reset a timeout for republish of the given Key/Value
   *
   * @private
   * @param {[type]} kv      Key/Value
   * @param {[type]} timeout the timeout
   */
  _setRepTimeout: function(kv, timeout) {
    if(this._RepTimeouts[kv.key]) {
        clearTimeout(this._RepTimeouts[kv.key]);
        delete this._RepTimeouts[kv.key];
      }

    if(this.config.delayedRep) {
      timeout = Math.floor(timeout*(1+(2*Math.random()-1)*this._repWindow));
    }

    var TOiD = setTimeout(function(kv, self) {
      if(typeof kv == 'undefined') return; //in case of
      
      //check if it has already expired or if the timer is an old one
      var now = new Date().getTime();
      var hasExp = (typeof kv.exp == 'undefined' || kv.exp === null || kv.exp <0) ? false : (kv.exp <= now);
      if(hasExp) return;
      self._republish(kv);
    }, timeout, kv, this);

    this._RepTimeouts[kv.key] = TOiD;
    return this;
  },

  /**
   * Time between 2 republish processes of a stored value.
   * By default, the value is the TIMEOUT_REPUBLISH global constant.
   *
   * @private
   * @type {Integer}
   */
  _repTime : globals.TIMEOUT_REPUBLISH,

  /**
   * Percentage on republish timeout definong the window in whicch the repiublishs will occure.
   * By default, the value is the TIMEOUT_REPUBLISH_WINDOW global constant.
   * 
   * @private
   * @type {Integer}
   */
  _repWindow : globals.TIMEOUT_REPUBLISH_WINDOW,

  /**
   * Make a key/value being republished by calling the `republish` method of node instance.
   *
   * Before it checks if key/value is still existing. Reset a new timer.
   *
   * @param  {Object} kv the key/value object to republish
   * @return {Object} this
   */
  _republish: function(kv) {
    var self = this;
    //check before if the key/value still exists
      this._store.exists(kv.key, function(exists) {
        if(exists) {
          //reset republish date
          var now = new Date().getTime();
          kv.rep = now + self._repTime;

          //reset a timer
          self._setRepTimeout(kv, self._repTime);
          
          //sore it
          self._store.save(kv);

          //call node's republish method
          self.emit('republish', kv.key, kv.value, kv.exp);
        }
      });
    return this;
  },

  /**
   * Reset a timeout for expiration of the given Key/Value.
   * If the Key/Value has a negative expiration date (infinite), nothing is done.
   *
   * @private
   * @param {[type]} kv      Key/Value
   * @param {[type]} timeout the timeout
   * @return this
   */
  _setExpTimeout: function(kv, timeout) {
    if(kv.exp >= 0) {
      if(this._ExpTimeouts[kv.key]) {
        clearTimeout(this._ExpTimeouts[kv.key]);
        delete this._ExpTimeouts[kv.key];
      }

      var TOiD = setTimeout(function(kv, self) {
        if(typeof kv == 'undefined') return; //in case of

        //check if it has already expired (old timer)
        var now = new Date().getTime();
        var hasExp = (typeof kv.exp == 'undefined' || kv.exp === null || kv.exp <0) ? false : (kv.exp <= now);
        if(! hasExp) return;
        
        self._expire(kv);
      }, timeout, kv, this);

      this._ExpTimeouts[kv.key] = TOiD;
    }
    return this;
  },

  /**
   * Make a key/value expire. Before check if stil exists.
   *
   * @private
   * @param  {Object} kv the key/value to make expire
   * @return {Object} this
   */
  _expire: function(kv) {
    var self = this;
    //check before if the key/value still exists
      this._store.exists(kv.key, function(exists) {
        if(exists) {
          self._store.remove(kv.key);
          self.emit('expire', kv);
        }
      });
    return this;
  }
});
});

require.define("/lib/data/storage/lawnchair.js", function (require, module, exports, __dirname, __filename) {
/**
 * Lawnchair!
 * --- 
 * clientside json store 
 *
 */
var Lawnchair = function (options, callback) {
    // ensure Lawnchair was called as a constructor
    if (!(this instanceof Lawnchair)) return new Lawnchair(options, callback);

    // lawnchair requires json 
    if (!JSON) throw 'JSON unavailable! Include http://www.json.org/json2.js to fix.'
    // options are optional; callback is not
    if (arguments.length <= 2 && arguments.length > 0) {
        callback = (typeof arguments[0] === 'function') ? arguments[0] : arguments[1];
        options  = (typeof arguments[0] === 'function') ? {} : arguments[0];
    } else {
        throw 'Incorrect # of ctor args!'
    }
    // TODO perhaps allow for pub/sub instead?
    if (typeof callback !== 'function') throw 'No callback was provided';
    
    // default configuration 
    this.record = options.record || 'record'  // default for records
    this.name   = options.name   || 'records' // default name for underlying store
    
    // mixin first valid  adapter
    var adapter
    // if the adapter is passed in we try to load that only
    if (options.adapter) {
        for (var i = 0, l = Lawnchair.adapters.length; i < l; i++) {
            if (Lawnchair.adapters[i].adapter === options.adapter) {
              adapter = Lawnchair.adapters[i].valid() ? Lawnchair.adapters[i] : undefined;
              break;
            }
        }
    // otherwise find the first valid adapter for this env
    } 
    else {
        for (var i = 0, l = Lawnchair.adapters.length; i < l; i++) {
            adapter = Lawnchair.adapters[i].valid() ? Lawnchair.adapters[i] : undefined
            if (adapter) break 
        }
    } 
    
    // we have failed 
    if (!adapter) throw 'No valid adapter.' 
    
    // yay! mixin the adapter 
    for (var j in adapter)  
        this[j] = adapter[j]
    
    // call init for each mixed in plugin
    for (var i = 0, l = Lawnchair.plugins.length; i < l; i++) 
        Lawnchair.plugins[i].call(this)

    // init the adapter 
    this.init(options, callback)
}

Lawnchair.adapters = [] 

/** 
 * queues an adapter for mixin
 * ===
 * - ensures an adapter conforms to a specific interface
 *
 */
Lawnchair.adapter = function (id, obj) {
    // add the adapter id to the adapter obj
    // ugly here for a  cleaner dsl for implementing adapters
    obj['adapter'] = id
    // methods required to implement a lawnchair adapter 
    var implementing = 'adapter valid init keys save batch get exists all remove nuke'.split(' ')
    ,   indexOf = this.prototype.indexOf
    // mix in the adapter   
    for (var i in obj) {
        if (indexOf(implementing, i) === -1) throw 'Invalid adapter! Nonstandard method: ' + i
    }
    // if we made it this far the adapter interface is valid 
    Lawnchair.adapters.push(obj)
};

Lawnchair.plugins = [];

/**
 * generic shallow extension for plugins
 * ===
 * - if an init method is found it registers it to be called when the lawnchair is inited 
 * - yes we could use hasOwnProp but nobody here is an asshole
 */ 
Lawnchair.plugin = function (obj) {
    for (var i in obj) 
        i === 'init' ? Lawnchair.plugins.push(obj[i]) : this.prototype[i] = obj[i]
};

/**
 * helpers
 *
 */
Lawnchair.prototype = {

    isArray: Array.isArray || function(o) { return Object.prototype.toString.call(o) === '[object Array]' },
    
    /**
     * this code exists for ie8... for more background see:
     * http://www.flickr.com/photos/westcoastlogic/5955365742/in/photostream
     */
    indexOf: function(ary, item, i, l) {
        if (ary.indexOf) return ary.indexOf(item)
        for (i = 0, l = ary.length; i < l; i++) if (ary[i] === item) return i
        return -1
    },

    // awesome shorthand callbacks as strings. this is shameless theft from dojo.
    lambda: function (callback) {
        return this.fn(this.record, callback)
    },

    // first stab at named parameters for terse callbacks; dojo: first != best // ;D
    fn: function (name, callback) {
        return typeof callback == 'string' ? new Function(name, callback) : callback
    },

    // returns a unique identifier (by way of Backbone.localStorage.js)
    // TODO investigate smaller UUIDs to cut on storage cost
    uuid: function () {
        var S4 = function () {
            return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        }
        return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    },

    // a classic iterator
    each: function (callback) {
        var cb = this.lambda(callback)
        // iterate from chain
        if (this.__results) {
            for (var i = 0, l = this.__results.length; i < l; i++) cb.call(this, this.__results[i], i) 
        }  
        // otherwise iterate the entire collection 
        else {
            this.all(function(r) {
                for (var i = 0, l = r.length; i < l; i++) cb.call(this, r[i], i)
            })
        }
        return this
    }
// --
};
/**
 * dom storage adapter 
 * === 
 * - originally authored by Joseph Pecoraro
 *
 */ 
//
// TODO does it make sense to be chainable all over the place?
// chainable: nuke, remove, all, get, save, all    
// not chainable: valid, keys
//
Lawnchair.adapter('dom', (function() {
    var storage = window.localStorage
    // the indexer is an encapsulation of the helpers needed to keep an ordered index of the keys
    var indexer = function(name) {
        return {
            // the key
            key: name + '._index_',
            // returns the index
            all: function() {
                var a = JSON.parse(storage.getItem(this.key))
                if (a === null) storage.setItem(this.key, JSON.stringify([])) // lazy init
                return JSON.parse(storage.getItem(this.key))
            },
            // adds a key to the index
            add: function (key) {
                var a = this.all()
                a.push(key)
                storage.setItem(this.key, JSON.stringify(a))
            },
            // deletes a key from the index
            del: function (key) {
                var a = this.all(), r = []
                // FIXME this is crazy inefficient but I'm in a strata meeting and half concentrating
                for (var i = 0, l = a.length; i < l; i++) {
                    if (a[i] != key) r.push(a[i])
                }
                storage.setItem(this.key, JSON.stringify(r))
            },
            // returns index for a key
            find: function (key) {
                var a = this.all()
                for (var i = 0, l = a.length; i < l; i++) {
                    if (key === a[i]) return i 
                }
                return false
            }
        }
    }
    
    // adapter api 
    return {
    
        // ensure we are in an env with localStorage 
        valid: function () {
            return !!storage 
        },

        init: function (options, callback) {
            this.indexer = indexer(this.name)
            if (callback) this.fn(this.name, callback).call(this, this)  
        },
        
        save: function (obj, callback) {
            var key = obj.key ? this.name + '.' + obj.key : this.name + '.' + this.uuid()
            // if the key is not in the index push it on
            if (this.indexer.find(key) === false) this.indexer.add(key)
            // now we kil the key and use it in the store colleciton    
            delete obj.key;
            storage.setItem(key, JSON.stringify(obj))
            obj.key = key.slice(this.name.length + 1)
            if (callback) {
                this.lambda(callback).call(this, obj)
            }
            return this
        },

        batch: function (ary, callback) {
            var saved = []
            // not particularily efficient but this is more for sqlite situations
            for (var i = 0, l = ary.length; i < l; i++) {
                this.save(ary[i], function(r){
                    saved.push(r)
                })
            }
            if (callback) this.lambda(callback).call(this, saved)
            return this
        },
       
        // accepts [options], callback
        keys: function(callback) {
            if (callback) { 
                var name = this.name
                ,   keys = this.indexer.all().map(function(r){ return r.replace(name + '.', '') })
                this.fn('keys', callback).call(this, keys)
            }
            return this // TODO options for limit/offset, return promise
        },
        
        get: function (key, callback) {
            if (this.isArray(key)) {
                var r = []
                for (var i = 0, l = key.length; i < l; i++) {
                    var k = this.name + '.' + key[i]
                    ,   obj = JSON.parse(storage.getItem(k))
                    if (obj) {
                        obj.key = key[i]
                        r.push(obj)
                    } 
                }
                if (callback) this.lambda(callback).call(this, r)
            } else {
                var k = this.name + '.' + key
                ,   obj = JSON.parse(storage.getItem(k))
                if (obj) obj.key = key
                if (callback) this.lambda(callback).call(this, obj)
            }
            return this
        },

        exists: function (key, cb) {
            var exists = this.indexer.find(this.name+'.'+key) === false ? false : true ;
            this.lambda(cb).call(this, exists);
            return this;
        },
        // NOTE adapters cannot set this.__results but plugins do
        // this probably should be reviewed
        all: function (callback) {
            var idx = this.indexer.all()
            ,   r   = []
            ,   o
            ,   k
            for (var i = 0, l = idx.length; i < l; i++) {
                k     = idx[i] //v
                o     = JSON.parse(storage.getItem(k))
                o.key = k.replace(this.name + '.', '')
                r.push(o)
            }
            if (callback) this.fn(this.name, callback).call(this, r)
            return this
        },
        
        remove: function (keyOrObj, callback) {
            var key = this.name + '.' + ((keyOrObj.key) ? keyOrObj.key : keyOrObj)
            this.indexer.del(key)
            storage.removeItem(key)
            if (callback) this.lambda(callback).call(this)
            return this
        },
        
        nuke: function (callback) {
            this.all(function(r) {
                for (var i = 0, l = r.length; i < l; i++) {
                    this.remove(r[i]);
                }
                if (callback) this.lambda(callback).call(this)
            })
            return this 
        }
}})());
// window.name code courtesy Remy Sharp: http://24ways.org/2009/breaking-out-the-edges-of-the-browser
Lawnchair.adapter('window-name', (function(index, store) {

    var data = window.top.name ? JSON.parse(window.top.name) : {}

    return {

        valid: function () {
            return typeof window.top.name != 'undefined' 
        },

        init: function (options, callback) {
            data[this.name] = {index:[],store:{}}
            index = data[this.name].index
            store = data[this.name].store
            this.fn(this.name, callback).call(this, this)
        },

        keys: function (callback) {
            this.fn('keys', callback).call(this, index)
            return this
        },

        save: function (obj, cb) {
            // data[key] = value + ''; // force to string
            // window.top.name = JSON.stringify(data);
            var key = obj.key || this.uuid()
            if (obj.key) delete obj.key 
            this.exists(key, function(exists) {
                if (!exists) index.push(key)
                store[key] = obj
                window.top.name = JSON.stringify(data) // TODO wow, this is the only diff from the memory adapter
                obj.key = key
                if (cb) {
                    this.lambda(cb).call(this, obj)
                }
            })
            return this
        },

        batch: function (objs, cb) {
            var r = []
            for (var i = 0, l = objs.length; i < l; i++) {
                this.save(objs[i], function(record) {
                    r.push(record)
                })
            }
            if (cb) this.lambda(cb).call(this, r)
            return this
        },
        
        get: function (keyOrArray, cb) {
            var r;
            if (this.isArray(keyOrArray)) {
                r = []
                for (var i = 0, l = keyOrArray.length; i < l; i++) {
                    r.push(store[keyOrArray[i]]) 
                }
            } else {
                r = store[keyOrArray]
                if (r) r.key = keyOrArray
            }
            if (cb) this.lambda(cb).call(this, r)
            return this 
        },
        
        exists: function (key, cb) {
            this.lambda(cb).call(this, !!(store[key]))
            return this
        },

        all: function (cb) {
            var r = []
            for (var i = 0, l = index.length; i < l; i++) {
                var obj = store[index[i]]
                obj.key = index[i]
                r.push(obj)
            }
            this.fn(this.name, cb).call(this, r)
            return this
        },
        
        remove: function (keyOrArray, cb) {
            var del = this.isArray(keyOrArray) ? keyOrArray : [keyOrArray]
            for (var i = 0, l = del.length; i < l; i++) {
                delete store[del[i]]
                index.splice(this.indexOf(index, del[i]), 1)
            }
            window.top.name = JSON.stringify(data)
            if (cb) this.lambda(cb).call(this)
            return this
        },

        nuke: function (cb) {
            storage = {}
            index = []
            window.top.name = JSON.stringify(data)
            if (cb) this.lambda(cb).call(this)
            return this 
        }
    }
/////
})());

if(module)
  module.exports = Lawnchair;
});

require.define("/lib/bootstrap.js", function (require, module, exports, __dirname, __filename) {
var StateEventEmitter = require('./util/state-eventemitter'),
    Crypto            = require('./util/crypto'),
    globals           = require('./globals.js'),

    Peer              = require('./dht/peer'),
    PeerArray         = require('./util/peerarray'),

    PingRPC            = require('./network/rpc/ping'),
    FindNodeRPC        = require('./network/rpc/findnode'),
    FindValueRPC       = require('./network/rpc/findvalue'),
    StoreRPC           = require('./network/rpc/store'),

    Reactor           = require('./network/reactor');
    

var Bootstrap = module.exports = StateEventEmitter.extend({

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

    this._peers = new PeerArray();

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

  //
  // Events
  //

  reactorEvents : {
    // Connection
    connected: function(address) {
      this._me      = new Peer(address, this._id);
      this._address = address;
      this.setState('connected');
    },

    disconnected: function() {
      this.setState('disconnected');
    },

    // RPC
    reached: function(peer) {
      peer.touch();
      console.log('add peers', peer.getAddress());
      this._peers.addPeer(peer);
    },

    queried: function(rpc) {
      this._handleRPCQuery(rpc);
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
      this._reactor.disconnectTransport();
    }
    return this;
  },

  //
  // RPCs
  //

  _handleRPCQuery: function(rpc) {
    if (!rpc.inProgress())
      return;
    var result,
        method = rpc.getMethod();
    result = this[method].call(this, rpc);
  },

  PING: function(rpc) {
    rpc.resolve();
  },

  FIND_NODE: function(rpc) {
    //give random BETA peeers
    var toGive;
    if (this._peers.size() <= globals.BETA) {
      toGive = this._peers.clone();
    } else {
      var indexs = [];
      toGive = new PeerArray();
      while(toGive.size() < globals.BETA) {
        var i = Math.floor(Math.random()*this._peers.size());
        toGive.addPeer(this._peers.getPeer(i));
      }
    }
    toGive.removePeer(rpc.getQuerying());
    rpc.resolve(toGive);
  },

  FIND_VALUE: function(rpc) {
    rpc.reject('I am  a bootstrap !');
  },

  STORE: function(rpc) {
    rpc.reject('I am  a bootstrap !');
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
});

require.define("/lib/dht/iterativefind/iterative-findnode.js", function (require, module, exports, __dirname, __filename) {
var IterativeDeferred   = require('../../util/iterative-deferred');
var XORSortedPeerArray  = require('../../util/xorsorted-peerarray');
var PeerArray           = require('../../util/peerarray');
var Peer                = require('../peer');
var globals             = require('../../globals');
var FindNodeRPC         = require('../../network/rpc/findnode');

var IterativeFindValue = module.exports = IterativeDeferred.extend({
  initialize: function(to_map) {
    this.supr(to_map);

     //hack
    this._targetType = 'NODE';
    this._staled = false;
  },

  target: function(target) {
    this._target = (target instanceof Peer) ? target.getID() : target;
    this.init(new XORSortedPeerArray(this.to_map, this._target));

    //auto-start
    if(this.sendFn)
      this.start();

    return this;
  },

  send: function(sendFn, sendCtxt) {
    this.sendFn = function() {
      sendFn.apply(sendCtxt || null, arguments);
    };

    //auto-start
    if(this._target)
      this.start();

    return this;
  },

  mapFn: function(peer) {
    var rpc = new FindNodeRPC(peer, this._target);
    this.sendFn(rpc);
    return rpc;
  },

  reduceFn: function(peers, newPeers, map) {
    peers.add(newPeers);

    if (peers.newClosestIndex() >= 0 && peers.newClosestIndex() < globals.ALPHA) {
      peers.first(globals.ALPHA, map);
    }

    return peers;
  },

  endFn: function(peers, map, reached) {
    if (this._staled) {
      this.reject(new XORSortedPeerArray(reached, this._target));
      return;
    }

    if (reached.length <= globals.ALPHA && peers.size() > 0) {
      this._staled = true;
      peers.first(globals.K, map);
    } else {
      this.reject(new XORSortedPeerArray(reached, this._target));
    }
  }
});
});

require.define("/lib/dht/iterativefind/iterative-findvalue.js", function (require, module, exports, __dirname, __filename) {
var IterativeDeferred   = require('../../util/iterative-deferred');
var XORSortedPeerArray  = require('../../util/xorsorted-peerarray');
var PeerArray           = require('../../util/peerarray');
var Peer                = require('../peer');
var globals             = require('../../globals');
var FindValueRPC        = require('../../network/rpc/findvalue');

var IterativeFindValue = module.exports = IterativeDeferred.extend({
  initialize: function(to_map) {
    this.supr(to_map);
    //hack
    this._targetType = 'VALUE';

  },

  target: function(target) {
    this._target = (target instanceof Peer) ? target.getID() : target;
    this.init(new XORSortedPeerArray().setRelative(this._target));

    //auto-start
    if(this.sendFn)
      this.start();

    return this;
  },

  send: function(sendFn, sendCtxt) {
    this.sendFn = function() {
      sendFn.apply(sendCtxt || null, arguments);
    };

     //auto-start
    if(this._target)
      this.start();

    return this;
  },

  mapFn: function(peer) {
    var rpc = new FindValueRPC(peer, this._target);
    this.sendFn(rpc);
    return rpc;
  },

  reduceFn: function(peers, result, found, map, queried, reached) {
    if (found) {
      this.resolve(result, new XORSortedPeerArray(reached, this._target));
    } else {
      peers.add(result);

      if(peers.newClosest()) {
        peers.first(globals.ALPHA, map);
      }
    }
    return peers;
  },

  endFn: function(peers, map, reached) {
    this.reject(new XORSortedPeerArray(reached, this._target));
  }
});
});

require.define("/lib/data/storage/basic.js", function (require, module, exports, __dirname, __filename) {
var klass = require('klass');
/*
 * Basic Storage class. Used in Node.js when lawnchair is not defined.
 * Imitate the API of lawnchair but is not persistant.
 */

var BasicPersistentStorage = module.exports = klass({

  initialize: function(config, cb) {
    cb = cb || function(){};
    this.config = config; //could be usefull
    this._index = {};
    cb.call(this, this);
  },

  save: function(kv, cb) {
    cb = cb || function(){};
    this._index[kv.key] = kv;
    cb.call(this, kv);
    return this;
  },

  get: function(key, cb) {
    cb = cb || function(){};
    if(typeof this._index[key] == 'undefined') {
      cb.call(this, null);
      return this;
    }
    cb.call(this, this._index[key]);
    return this;
  },

  exists: function(key, cb) {
    if(typeof this._index[key] == 'undefined') {
      cb.call(this, false);
      return this;
    }
    cb.call(this, true);
    return this;

  },

  remove: function(key, cb) {
    cb = cb || function(){};
    if(typeof this._index[key] == 'undefined') {
      cb.call(this);
      return this;
    }
    delete this._index[key];
    cb.call(this);
    return this;
  },

  nuke: function(cb) {
    cb = cb || function(){};
    this._index = {};
    cb.call(this);
  },

  each: function(cb) {
    for(var obj in this._index) {
      cb.call(this, obj);
    }
  }
});
});

require.define("/lib/index-browserify.js", function (require, module, exports, __dirname, __filename) {
    window.KadOH = {
  Node : require('./node'),
  log  : require('./logging')
};

exports.util = {
  crypto              : require('./util/crypto'),
  EventEmitter        : require('./util/eventemitter'),
  StateEventEmitter   : require('./util/state-eventemitter'),
  Deferred            : require('./util/deferred'),
  PeerArray           : require('./util/peerarray'),
  SortedPeerArray     : require('./util/sorted-peerarray'),
  XORSortedPeerArray  : require('./util/xorsorted-peerarray')
};

exports.globals = require('./globals');

exports.logic = {
  KademliaNode        : require('./node'),
  Bootstrap           : require('./bootstrap')
};

exports.network = {
  Reactor             : require('./network/reactor'),
  rpc : {
    RPC               : require('./network/rpc/rpc'),
    Ping              : require('./network/rpc/ping'),
    FindNode          : require('./network/rpc/findnode'),
    FindValue         : require('./network/rpc/findvalue'),
    Store             : require('./network/rpc/store')
  },
  transport : {
    '':'',
    //@browserify-ignore[xmpp] --comment
    //SimUDP            : require('./network/transport/simudp'),

    //@browserify-ignore[simudp] --comment
    Strophe           : require('./network/transport/strophe')
  }
};

exports.dht = {
  RoutingTable        : require('./dht/routing-table'),
  KBucket             : require('./dht/kbucket'),
  Peer                : require('./dht/peer'),
  BootstrapPeer       : require('./dht/bootstrap-peer'),
  IterativeFindNode   : require('./dht/iterativefind/iterative-findnode'),
  IterativeFindValue  : require('./dht/iterativefind/iterative-findvalue')
};

exports.data = {
  ValueStore          : require('./data/value-store'),
  storage : {
    Basic             : require('./data/storage/basic'),

    //@browserify-ignore[basic] --comment
    Lawnchair         : require('./data/storage/lawnchair')
  }
};
});
require("/lib/index-browserify.js");
