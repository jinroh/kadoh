// Maximum number of contacts in a k-bucket
global._k = 6;

// Degree of parallelism for network calls
global._alpha = 3;

// Size of the space in bits
global._B = 160;

// sha1 function
global._digest = Crypto.digest.SHA1;

var Node = Class.create({
  
  initialize: function(ip, port, id) {
    if (typeof id === 'undefined') {
      this.id = this._generateId();
    } else {
      this.id = id;
    }
    
    this._routing_table = new RoutingTable(this.id);
  },
  
  _generateId: function() {
    return _digest(this.ip + ':' + this.port);
  }
  
});

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

var KBucket = Class.create({
  
  initialize: function(min, max) {
    this._min = (typeof min === 'undefined') ? 0      : min;
    this._max = (typeof max === 'undefined') ? (_B-1) : max;
    
    this._size = 0;
    this._peers_ids = [];
    this._peers = {};
  },
  
  // Public
  
  addPeer: function(peer) {
    var tuple = this._peerExists(peer);
    // if the peer is already in the kbucket, delete it and append it at the end of the list
    if (tuple != false) {
      delete this._peer_ids[tuple.index];
      
      this._size = this._peer_ids.unshift(peer.getId());
    }
    // if it doesn't and the kbucket is not full, append it at the end of the list
    else if (this._size < _k) {
      this._peers[peer.id] = peer;
      this._size = this._peers_ids.unshift(peer.id);
    }
    else {
      console.error('The kbucket ' + this.toString() + 'is full');
      throw new Error('FULL');
    }
  },
  
  getPeer: function(peer) {
    var tuple = this._peerExists(peer)
    if (tuple === false)
      return false;
    
    return this._peers[tuple.id];
  },
  
  getPeers: function(number) {
    number = Math.max(0, Math.min(number, this._size));
    
  },
  
  removePeer: function(peer) {
    var tuple = this._peerExists(peer)
    if (tuple === false) {
      return false;
    }
    
    delete this._peers_ids[tuple.index];
    delete this._peers[tuple.id];
    return true;
  },

  idInRange: function(id) {
    
  },
  
  distanceInRange: function(distance) {
    return (this._min <= distance) && (distance < this._max);
  },
  
  toString: function() {
    return '<' + this._min + ':' + this._max + '>';
  },
  
  // Private
  
  _peerExists: function(peer) {
    var peer_id, index;
    
    if (typeof peer === 'object') {
      peer_id = peer.getId();
      index = this._peers_ids.indexOf(peer_id);
    } else {
      peer_id = peer;
      index = this._peers_ids.indexOf(peer);
    }
    
    if (index === -1) {
      return false;
    }
    
    return {
        index: index
      , id: peer_id
    };
  }
  
});

var Peer = Class.create({
  
  initialize: function(ip, port, id) {
    this._ip = ip;
    this._port = port;
    this._socket = ip + ':' + port;
    
    if (typeof id === 'undefined') {
      this._id = this._generateId();
    } else {
      this._id = id;
    }
  },
  
  // Public
  getId: function() {
    return this._id;
  },
  
  getSocket: function() {
    return this._socket;
  },
  
  toString: function() {
    return '<' + this._id + '; ' + this._socket + '>';
  },
  
  // Private
  _generateId: function() {
    return _digest(this._socket); 
  }
  
});
