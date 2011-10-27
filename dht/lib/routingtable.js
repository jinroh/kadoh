(function(exports) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  
  KadOH.RoutingTable = Class({

    initialize: function(parent_id) {
      this._parent_id = parent_id;
      this._kbuckets = [new KadOH.KBucket(0, KadOH.globals._B, parent_id)];
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
      return KadOH.util.Crypto.util.distance(this._parent_id, id);
    },

    /**
     * Add a peer to the routing table or update it if its already in
     * 
     * @param {Peer} peer object to add
     * @return {Void}
     * @api public 
     */
    addPeer: function(peer) {
      if (peer.getId() == this._parent_id) {
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
        if(kbucket.isSplittable(this.distance(peer.getId()))) {
          var new_kbucket = kbucket.split();
          
          // console.log('SPLITTING ROUTING TABLE : ' + kbucket + ' ' + new_kbucket);
          this._kbuckets.splice(kbucket_index + 1, 0, new_kbucket);
          
          this.addPeer(peer);
        }
        // if the kbucket is not splittable, remove the least recently seen peer and add the new
        // @TODO optimisations
        else {
        }
      }
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
      dist = this.distance(id);

      for(var kbucket=0; kbucket < this._kbuckets.length; kbucket++) {
        if (this._kbuckets[kbucket].distanceInRange(dist)) {
          return kbucket;
        }
      }
      return -1;
    },

    _kbucketFor: function(id) {
      var index = this._kbucketIndexFor(id);
      if (index != -1)
        return this._kbuckets[index];
      return false;
    }

  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
