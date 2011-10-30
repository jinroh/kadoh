// Dep: [KadOH]/core/class
// Dep: [KadOH]/globals
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/peer

(function(exports) {
  
  var KadOH = exports;

  var Class = KadOH.core.Class;
  var Crypto = KadOH.util.Crypto;
  
  KadOH.KBucket = Class({

    initialize: function(min, max, parent_id) {
      this._min = (typeof min === 'undefined') ? 1 : min;
      this._max = (typeof max === 'undefined') ? KadOH.globals._B : max;

      this._parent_id = parent_id;
      this._size = 0;
      this._distances = {};
      this._peers_ids = [];
      this._peers = {};
    },

    // Public

    addPeer: function(peer) {
      var exists = this._peerExists(peer);
      // if the peer is already in the kbucket, delete it and append it at the beginning of the list
      if (exists !== false) {
        this._updatePeer(exists);
      }
      // if it isn't
      else {
        //  and the kbucket is not full, add it at the beginning of the list
        if (!this.isFull()) {
          this._appendPeer(peer);
        }
        // and the kbucket is full throw an error
        else {
          // console.log('The kbucket ' + this.toString() + 'is full');
          throw new Error('FULL');
        }
      }
      
      return this;
    },

    getPeer: function(peer) {
      var tuple = this._peerExists(peer);
      if (tuple === false)
        return false;

      return this._peers[tuple.id];
    },
    
    getNewestPeer: function() {
      return this._peers[this._peers_ids[0]];
    },
    
    getOldestPeer: function() {
      return this._peers[this._peers_ids[this._peers_ids.length-1]];
    },

    getPeers: function(number) {
      var peers = [];
      number = Math.max(0, Math.min(number, this._size));
      
      for (var i=0; i < this._size; i++) {
        peers.push(this._peers[this._peers_ids[i]]);
      }
      
      return peers;
    },

    removePeer: function(peer) {
      var tuple = this._peerExists(peer);
      if (tuple === false) {
        throw new Error(peer + ' does not exists');
      } else {
        this._deletePeer(tuple);
      }

      return this;
    },

    idInRange: function(id, parent_id) {
      return this.distanceInRange(Crypto.distance(id, parent_id));
    },

    distanceInRange: function(distance) {
      return (this._min <= distance) && (distance <= this._max);
    },

    getSize: function() {
      return this._size;
    },

    getRange: function() {
      return {
          min: this._min
        , max: this._max
      };
    },

    setRange: function(range) {
      this._min = range.min;
      this._max = range.max;
      return this;
    },

    setRangeMin: function(min) {
      this._min = min;
      return this;
    },

    setRangeMax: function(max) {
      this._max = max;
      return this;
    },

    split: function() {
      var split_value = ( this._min + this._max + 1 ) / 2;

      var new_kbucket = new KadOH.KBucket(this._min, split_value - 1, this._parent_id);
      this.setRangeMin(split_value);

      var i;
      var destroy_ids = [];

      for (i=0; i < this._size; i++) {
        var peer_id = this._peers_ids[i];
        var peer = this._peers[peer_id];
        var distance = this._distances[peer_id];

        if (new_kbucket.distanceInRange(distance)) {
          new_kbucket.addPeer(peer);
          destroy_ids.push(peer_id);
        }
      }

      for (i=0; i < destroy_ids.length; i++) {
        this.removePeer(destroy_ids[i]);
      }

      return new_kbucket;
    },

    isSplittable: function() {
      return (this._min === 1);
    },

    isFull: function() {
      return (this._size == KadOH.globals._k);
    },

    toString: function() {
      return '<' + this._min + ':' + this._max + '><#' + this._peers_ids.length + '>';
    },

    // Private

    _updatePeer: function(tuple) {
      this._peers_ids.splice(tuple.index, 1);
      this._peers_ids.unshift(tuple.id);
    },
    
    _deletePeer: function(tuple) {
      this._peers_ids.splice(tuple.index, 1);
      delete this._distances[tuple.id];
      delete this._peers[tuple.id];

      this._size--;
    },

    _appendPeer: function(peer) {
      var id = peer.getId();
      this._peers[id] = peer;
      this._peers_ids.unshift(id);
      this._distances[id] = Crypto.distance(id, this._parent_id);
      
      this._size++;
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
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
