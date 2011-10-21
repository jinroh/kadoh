var RoutingTable = Class.create({
  
  initialize: function(parent_id) {
    this._parent_id = parent_id;
    this._kbuckets = [new KBucket(0, _B-1)];
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
    return Crypto.util.distance(this._parent_id, id);
  },
  
  /**
   * Add a peer to the routing table or update it if its already in
   * 
   * @param {Peer} peer object to add
   * @return {Void}
   * @api public 
   */
  addPeer: function(peer) {
    if (peer.id == this._parent_id) {
      return;
    }
    
    // find the kbucket for the peer
    try {
      var kbucket = this._kbucketFor(peer.id);
      
    }
    // if the kbucket is full, try to split it in two
    catch(e) {
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
    
    for(kbucket in this._kbuckets) {
      if (this._kbuckets[kbucket].distanceInRange(dist)) {
        return kbucket;
      }
    }
    return false;
  },
  
  _kbucketFor: function(id) {
    var index = this._keybucketIndexFor(id);
    if (index)
      return this._kbuckets[index];
    return false;
  }
  
});
