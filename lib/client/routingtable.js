// Dep: [KadOH]/core/class
// Dep: [KadOH]/globals
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/kbucket
// Dep: [KadOH]/core/eventemitter

(function(exports) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  var globals = KadOH.globals;
  
  KadOH.RoutingTable = Class({

    initialize: function(node) {
      if (node instanceof KadOH.Node) {
        this._node = node;
        this._parent_id = node.getId();
      } else {
        this._parent_id = node;
      }
      this._kbuckets = [new KadOH.KBucket(this._parent_id)];
    },

    // Public

    /**
     * Calculates the distance from 0 to B-1 between the parent id and the given key
     * These keys are SHA1 hashes as hexadecimal `String`
     *
     * @param {String} key
     * @return {String} distance between the two keys
     * @api public 
     */
    distance: function(id) {
      return KadOH.util.Crypto.distance(this._parent_id, id);
    },

    /**
     * Add a peer to the routing table or update it if its already in
     * 
     * @param {Peer} peer object to add
     * @return {Void}
     * @api public 
     */
    addPeer: function(peer) {
      if (peer.getId() === this._parent_id) {
        return;
      }

      var kbucket_index = this._kbucketIndexFor(peer.getId());
      var kbucket = this._kbuckets[kbucket_index];

      // find the kbucket for the peer
      try {
        kbucket.addPeer(peer);
      }
      // if the kbucket is full, try to split it in two
      catch(e) {
        // if the kbucket is splittable split it and try again
        if (kbucket.isSplittable(this.distance(peer.getId()))) {
          var new_kbucket = kbucket.split();
          
          // console.log('SPLITTING ROUTING TABLE : ' + kbucket + ' ' + new_kbucket);
          this._kbuckets.splice(kbucket_index + 1, 0, new_kbucket);
          
          this.addPeer(peer);
        }
        // if the kbucket is full and not splittable
        else {
          if (typeof this._node !== 'undefined') {
            // ping the least recently seen peer
            var oldest = kbucket.getOldestPeer();
            var ping = this._node.reactor().PING(oldest);

            ping.then(
              // if it responds do nothing
              function() {},
              // if it fails to respond, drop
              // it and append the contact
              function() {
                kbucket.removePeer(oldest);
                kbucket.addPeer(peer);
              }
            );
          }
        }
      }
    },

    /**
     * Get the `number` closest peers from a given `id`
     * except for the specified ones
     * 
     * @param {String} id
     * @param {Number} number The number of peers you want
     * @param {Array} exclude The list of ids or peers to exclude
     */
    getClosePeers: function(id, number, exclude) {
      if (typeof number !== 'number') {
        number = globals._alpha;
      }
      
      // get the default kbucket for this id
      var kbucket_index = this._kbucketIndexFor(id),
          kbuckets_left = this.howManyKBuckets() - 1,
          
          peers = this._kbuckets[kbucket_index].getPeers(number, exclude);
      
      // if we don't have enough peers in the default kbucket
      // try to find other ones in the closest kbuckets
      if (peers.length < number && kbuckets_left > 0) {
        var indexes_path = [],
            i;

        // build an array which values are the kbuckets index
        // sorted by their distance with the default kbucket
        for (i=0; i < this.howManyKBuckets(); i++) {
          indexes_path[i] = i;
        }
        indexes_path.splice(kbucket_index, 1);
        indexes_path.sort(function(a, b) {
          var diff = Math.abs(a - kbucket_index) - Math.abs(b - kbucket_index);
          if (diff < 0)
            return -1;
          else if (diff > 0)
            return 1;
          return 0;
        });

        // read through the sorted kbuckets and retrieve the closest peers
        // until we get the good amount
        i = 0;
        while (peers.length < number && i < indexes_path.length) {
          peers = peers.concat(this._kbuckets[i].getPeers(number - peers.length, exclude));
          i++;
        }
      }
      
      return peers;
    },

    getPeer: function(id) {
      var peer = this._kbucketFor(id).getPeer(id);
      if (peer) {
        return peer;
      }
      return false;
    },

    removePeer: function(peer) {
      if (typeof peer === 'object') {
        peer = peer.getId();
      }
      return this._kbucketFor(peer).removePeer(peer);
    },

    getKBuckets: function() {
      return this._kbuckets;
    },

    howManyKBuckets: function() {
      return this._kbuckets.length;
    },

    getParentId: function() {
      return this._parent_id;
    },

    // Private

    /**
     * Find the appropriate KBucket index for a given key
     *
     * @param {String} key SHA1 hash
     * @return {Integer} index for the `_kbuckets`
     * @api private
     */
    _kbucketIndexFor: function(id) {
      var dist = this.distance(id);
      
      // if an error occured when calculating the distance
      if (dist === -1) {
        throw new Error('Error while calculating a distance');
      }
      
      // if the id is our id, return the splittable kbucket
      if (dist === 0) {
        return this._kbuckets.length - 1;
      }
      
      // find the kbucket with the distance in range
      for (var kbucket=0; kbucket < this._kbuckets.length; kbucket++) {
        if (this._kbuckets[kbucket].distanceInRange(dist)) {
          return kbucket;
        }
      }
      return -1;
    },

    _kbucketFor: function(id) {
      var index = this._kbucketIndexFor(id);
      
      if (index !== -1)
        return this._kbuckets[index];
      
      return false;
    }

  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
