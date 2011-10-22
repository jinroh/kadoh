var KBucket = Class.create({
  
  initialize: function(min, max, parent_id) {
    this._min = (typeof min === 'undefined') ? 0      : min;
    this._max = (typeof max === 'undefined') ? (_B-1) : max;
    
    this._parent_id = parent_id;
    this._size = 0;
    this._distances = [];
    this._peers_ids = [];
    this._peers = {};
  },
  
  // Public
  
  addPeer: function(peer) {
    var exists = this._peerExists(peer);
    // if the peer is already in the kbucket, delete it and append it at the end of the list
    if (exists != false) {
      this._updatePeer(peer.getId());
    }
    // if it doesn't and the kbucket is not full, append it at the end of the list
    else if (this._size < _k) {
      this._appendPeer(peer);
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
    if (typeof number === 'undefined') {
      return this._peers;
    }
    
    number = Math.max(0, Math.min(number, this._size));
    
    var peers = []
      , peer_id = 0
      , i = 0;
    for (peer_id=0; peer_id < this._size; peer_id++) {
      if (i >= number)
        break;
        
      peers.push(this._peers[peer_id]);
      i++;
    }
    return peers;
  },
  
  removePeer: function(peer) {
    var tuple = this._peerExists(peer)
    if (tuple === false) {
      return false;
    }
    
    delete this._peers_ids[tuple.index];
    delete this._peers[tuple.id];
    
    this._size = this._peers_ids.length;
    return true;
  },

  idInRange: function(id, parent_id) {
    return this.distanceInRange(Crypto.util.distance(id, parent_id));
  },
  
  distanceInRange: function(distance) {
    return (this._min <= distance) && (distance < this._max);
  },
  
  getRange: function() {
    return {
        min: this._min
      , max: this._max
    }
  },
  
  setRange: function(range) {
    this._min = range.min;
    this._max = range.max;
  },
  
  setRangeMin: function(min) {
    this._min = min;
  },
  
  setRangeMax: function(max) {
    this._max = max;
  },
  
  split: function() {
    var split_value = ( this._min + this._max ) / 2;
    
    var new_kbucket = new KBucket(split_value, this._max, this._parent_id);
    this.setRangeMax(split_value);
    
    var i;
    for (var i=0; i < this._size; i++) {
      var peer_id = this._peers_ids[i];
      var peer = this._peers[peer_id];
      var distance = this._distances[peer_id];
      
      if (new_kbucket.distanceInRange(distance)) {
        new_kbucket.addPeer(peer);
        this.removePeer(peer);
      }
    }
    
    return new_kbucket;
  },
  
  isSplittable: function() {
    return this.idInRange(this._parent_id);
  },
  
  toString: function() {
    return '<' + this._min + ':' + this._max + '><#' + this._size + '>';
  },
  
  // Private
  
  _updatePeer: function(peer_id) {
    delete this._peer_ids[tuple.index];
    this._size = this._peer_ids.unshift(peer.getId());
  },
  
  _appendPeer: function(peer) {
    var id = peer.getId();
    this._peers[id] = peer;
    this._size = this._peers_ids.unshift(id);
    this._distances[id] = Crypto.util.distance(id, this._parent_id);
  },
  
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
