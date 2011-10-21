var RoutingTable = Class.create({
  
  initialize: function(parent_id) {
    this._parent_id = parent_id;
    this._kbuckets = [new KBucket(0, Math.pow(2,160))];
  },
  
  // Public
  
  /**
   * Calculates the XOR distance between two keys
   * These keys are SHA1 hashes as ascii `String`
   *
   * @param {String} key number one
   * @param {String} key number two
   * @return {String} distance between the two keys
   * @api public 
   */
  distance: function(key_one, key_two) {
    // return key_one ^ key_two
  },
  
  /**
   * Add a peer to the routing table
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
      var kbucket_index = this._kbucketIndexFor(peer.id);
    }
    // if the kbucket is full, try to split it in two
    catch(e) {
    }
  },

  // Private
  
  /**
   * Find the appropriate KBucket index for a given key
   *
   * @param {String} key SHA1 hash
   * @return {Integer} index for the `_kbuckets
   * @api private
   */
  _kbucketIndexFor: function(key) {
    for(kbucket in this._kbuckets) {
    }
  }
  
});
