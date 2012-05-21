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