// Dep: [KadOH]/globals
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/kbucket
// Dep: [KadOH]/peerarray
// Dep: [KadOH]/peer
// Dep: [KadOH]/core/eventemitter

(function(exports) {
  
  var KadOH        = exports,
      Crypto       = KadOH.util.Crypto,
      KBucket      = KadOH.KBucket,
      Peer         = KadOH.Peer,
      PeerArray    = KadOH.PeerArray,
      globals      = KadOH.globals,
      EventEmitter = KadOH.core.EventEmitter;
  
  /**
   * Represents the routing table of a {@link Node}.
   * @name RoutingTable
   * @augments EventEmitter
   * @class
   */
  KadOH.RoutingTable = EventEmitter.extend(
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
     * Stop the routing table engine :
     *   - stop all refreshTimout for  KBuckets
     * @public
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
      } catch(e) {
        // if the kbucket is full
        if (e === 'full') {
          // if the kbucket is splittable split it and try again
          if (kbucket.isSplittable()) {
            this._kbuckets.push(kbucket.split());
            this.addPeer(peer);
          } else {
            this.emit('update', kbucket, peer);
          }
        } else if (e === 'updating') {
          // if the kbucket is updating
          // do nothing
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
        number = globals.ALPHA;
      }
      
      // get the default kbucket for this id
      var index         = this._kbucketIndexFor(id),
          kbuckets_left = this.howManyKBuckets() - 1,
          peers         = new PeerArray();

      peers.add(this._kbuckets[index].getPeers(number, exclude));

      // if we don't have enough peers in the default kbucket
      // try to find other ones in the closest kbuckets
      if (peers.length() < number && kbuckets_left > 0) {
        var indexes_path = [],
            i;

        // build an array which values are the kbuckets index
        // sorted by their distance with the default kbucket
        for (i = 0; i < this.howManyKBuckets(); i++) {
          indexes_path[i] = i;
        }
        indexes_path.splice(index, 1);

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
        while (peers.length() < number && (index = indexes_path[i++])) {
          peers.add(this._kbuckets[index].getPeers(number - peers.length(), exclude));
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
        return sum + kbucket.length();
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
    }

  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
