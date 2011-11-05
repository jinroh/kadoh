// Dep: [KadOH]/core/class
// Dep: [KadOH]/globals
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/peer

(function(exports) {
  
  var KadOH = exports;

  var Class = KadOH.core.Class;
  var Crypto = KadOH.util.Crypto;
  var Peer = KadOH.Peer;
  
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

    /**
     * Add then given Peer to the KBucket
     * If the Peer is already in the KBucket, it will be updated
     *
     * @param {Peer} the peer to add or update
     * @return {KBucket} self
     */
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

    /**
     * Get a Peer given an ID or a Peer object
     * If the given Peer does not exists, `false` is returned  
     * 
     * @param {Peer,String} the Peer or its ID
     * @return {Peer} the Peer or false if it isn't in the KBucket
     */
    getPeer: function(peer) {
      var tuple = this._peerExists(peer);
      if (tuple === false)
        return undefined;

      return this._peers[tuple.id];
    },
    
    /**
     * Get the latest seen Peer
     *
     * @return {Peer}
     */
    getNewestPeer: function() {
      return this._peers[this._peers_ids[0]];
    },
    
    /**
     * Get the least recent Peer
     *
     * @return {Peer}
     */
    getOldestPeer: function() {
      return this._peers[this._peers_ids[this._peers_ids.length-1]];
    },
    
    /**
     * Get the closest peer in the KBucket to the given id
     *
     * @return {Peer}
     */
    getClosestPeer: function(id) {
      return this.getPeers()[0];
    },
    
    /**
     * Get all the peers from the KBucket sorted by XOR distance
     *
     * @param {Integer} number fixes the number of peers to get
     * @param {Array} the id or peers to exclude
     * @return {Array}
     */
    getPeers: function(number, exclude) {
      var peers = [];
      var i;
      
      if (typeof number === 'undefined')
        number = this._size;
      
      number = Math.max(0, Math.min(number, this._size));
      
      if (typeof exclude === 'undefined')
        exclude = [];
      
      if (number > 0) {
        // fill the exclude array with peer's id if it's not
        for (i=0; i < exclude.length; i++) {
          if (exclude[i] instanceof Peer)
            exclude[i] = exclude[i].getId();
        }
        
        // append all peers to the array
        // except for the excluded ones
        for (i=0; i < this._size; i++) {
          if (exclude.indexOf(this._peers_ids[i]) === -1)
            peers.push(this._peers[this._peers_ids[i]]);
        }
        
        // sort the table by distance with the parent_id
        var parent_id  = this._parent_id;
        var comparable = Crypto.comparableXOR;
        peers.sort(function(a, b) {
          a = Crypto.XOR(a.getId(), parent_id);
          b = Crypto.XOR(b.getId(), parent_id);
          return comparable(a, b);
        });
        
        // crop it
        peers.splice(number, this._size - number);
      }
      
      return peers;
    },
    
    /**
     * Remove a given peer from the KBucket given the Peer objet or its ID
     *
     * @param {Peer,String}
     */
    removePeer: function(peer) {
      var tuple = this._peerExists(peer);
      if (tuple === false) {
        throw new Error(peer + ' does not exists');
      } else {
        this._deletePeer(tuple);
      }

      return this;
    },

    /**
     * Check wether or not the given ID is in range of the KBucket
     *
     * @return {Boolean}
     */
    idInRange: function(id) {
      return this.distanceInRange(Crypto.distance(id, this._parent_id));
    },
    
    /**
     * Check wether or not a given distance is in range of the KBucket
     *
     * @return {Boolean}
     */
    distanceInRange: function(distance) {
      return (this._min <= distance) && (distance <= this._max);
    },

    /**
     * Get the number of peers in the KBucket
     *
     * @return {Integer}
     */
    getSize: function() {
      return this._size;
    },

    /**
     * Get an `Object` with the `min` and `max` values of the KBucket's range
     *
     * @return {Object}
     */
    getRange: function() {
      return {
          min: this._min
        , max: this._max
      };
    },

    /**
     * Set the range of the KBucket
     *
     * @param {Object}
     * @return {KBucket} self
     */
    setRange: function(range) {
      this._min = range.min;
      this._max = range.max;
      return this;
    },

    /**
     * Set the range min of the KBucket
     *
     * @param {Integer}
     * @return {KBucket} self
     */
    setRangeMin: function(min) {
      this._min = min;
      return this;
    },
    
    /**
     * Set the range max of the KBucket
     *
     * @param {Integer}
     * @return {KBucket} self
     */
    setRangeMax: function(max) {
      this._max = max;
      return this;
    },

    /**
     * Split the KBucket range in half (higher range) and return a new KBucket with the lower range
     *
     * @return {KBucket}
     */
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

    /**
     * Check wether or not the KBucket is splittable
     *
     * @return {Boolean}
     */
    isSplittable: function() {
      return (this._min === 1);
    },

    /**
     * Check wether or not the KBucket is full
     *
     * @return {Boolean}
     */
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
