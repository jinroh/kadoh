// Dep: [KadOH]/core/class
// Dep: [KadOH]/globals
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/peer
// Dep: [KadOH]/peerarray

(function(exports) {
  
  var KadOH = exports;

  var Class     = KadOH.core.Class,
      globals   = KadOH.globals,
      Crypto    = KadOH.util.Crypto,
      Peer      = KadOH.Peer,
      PeerArray = KadOH.PeerArray;

  var XORSortedPeerArray = KadOH.XORSortedPeerArray;
  
  KadOH.KBucket = PeerArray.extend(
    /** @lends KBucket# */
    {
    /**
     * 
     * @class Namespace : KadOH.KBucket </br> Represents a KBucket.
     * @constructs
     * @param  {Node|String} node - Node instance or parent node ID
     * @param  {Number} [min=0] - Min limit of this KBucket (expressed as bit position)
     * @param  {Number} [max=globals.B] - Max limit of this KBucket (expressed as bit position)
     */
    initialize: function(rt, min, max) {
      this.supr();
      if (arguments.length > 0) {
        this._routingTable = rt;
        this._parentID     = (typeof rt.getParentID === 'function') ? rt.getParentID() : rt;
        this._min          = min || 0;
        this._max          = max || globals.B;
        this._timeoutID    = undefined;
        this._updating     = false;
        this.touch();
      }
    },

    // Public

    /**
     * Add then given Peer to the KBucket
     * If the Peer is already in the KBucket, it will be updated
     *
     * @param {Peer} peer - The peer to add or update
     * @return {KBucket} self to allow chaining
     */
    addPeer: function(peer) {
      if (!this.isFull()) {
        this.touch();

        var index = this.find(peer);
        if (~index) {
          this.getPeer(index).touch();
          this.move(index, 0);
        }
        else {
          peer.cacheDistance(this._parentID);
          if (!this.peerInRange(peer))
            throw new Error(peer + ' is not in range for ' + this);
          
          this._PEERS.unshift(peer);
        }
      }
      else {
        // and if the kbucket is full throw an error
        if (this._updating) {
          throw 'updating';
        } else {
          throw 'full';
        }
      }
      return this;
    },

    /**
     * Update the KBucket with a new peer
     * only if the least recently seen peer doesn't ping back
     * 
     * @param  {Peer} peer The peer to update with
     * @param  {Function} ping Function which returns a ping deferred
     * @return {KBucket} self to allow chaining
     */
    update: function(peer, ping) {
      if (!this._updating) {
        this._udpating = true;

        var oldest  = this.getOldestPeer();
        var success = function() {
          this._udpating = false;
        };
        var failure = function() {
          this.removePeer(oldest);
          this.addPeer(peer);
          this._udpating = false;
        };

        ping(oldest).then(success, failure, this);
      }
      return this;
    },

    /**
     * Get the latest seen Peer.
     *
     * @return {Peer}
     */
    getNewestPeer: function() {
      return this.getPeer(0);
    },
    
    /**
     * Get the least recent Peer.
     *
     * @return {Peer}
     */
    getOldestPeer: function() {
      return this.getPeer(this.length() - 1);
    },
    
    /**
     * Get all the peers from the KBucket
     *
     * @param {Integer} number - fix the number of peers to get
     * @param {String[]|Peer[]} [exclude] - the NodeIDs or {@link Peer}s to exclude
     * @return {Array}
     */
    getPeers: function(number, exclude) {
      exclude = exclude || [];
      return new PeerArray(this)
                 .filterOut(exclude)
                 .pickOutFirst(number);
    },

    peerInRange: function(peer) {
      return this.distanceInRange(peer.getDistance());
    },
    
    /**
     * Check wether or not the given NodeID
     * is in range of the KBucket
     * 
     * @param {String} id - NodeID to check
     * @return {Boolean} true if it is in range.
     */
    idInRange: function(id) {
      return this.distanceInRange(Crypto.distance(id, this._parentID));
    },
    
    /**
     * Check wether or not a given distance is in range of the 
     * 
     * @param {String} distance - distance to check
     * @return {Boolean}
     */
    distanceInRange: function(distance) {
      return (this._min < distance) && (distance <= this._max);
    },

    /**
     * Get an `Object` with the `min` and `max` values
     * of the KBucket's range (expressed as bit position).
     *
     * @return {Object} range - range object
     * @return {Integer} range.min - minimum bit position
     * @return {Integer} renage.max - maximum bit position
     */
    getRange: function() {
      return {
        min: this._min,
        max: this._max
      };
    },

    /**
     * Set the range of the KBucket (expressed as bit position)
     *
     * @param {Object} range - range object
     * @param {Integer} range.min - minimum bit position
     * @param {Integer} range.max - maximum bit position
     * @return {KBucket} self to allow chaining
     */
    setRange: function(range) {
      this._min = range.min;
      this._max = range.max;
      return this;
    },

    /**
     * Set the range min of the KBucket (expressed as bit position)
     *
     * @param {Integer} min - minimum bit position
     * @return {KBucket} self to allow chaining
     */
    setRangeMin: function(min) {
      this._min = min;
      return this;
    },
    
    /**
     * Set the range max of the KBucket (expressed as bit position)
     *
     * @param {Integer} max - max bit position
     * @return {KBucket} self to allow chaining
     */
    setRangeMax: function(max) {
      this._max = max;
      return this;
    },

    /**
     * Split the KBucket range in half (higher range)
     * and return a new KBucket with the lower range
     *
     * @return {KBucket} The created KBucket
     */
    split: function() {
      var split_value = this._max - 1;

      var new_kbucket = new this.constructor(this._routingTable, this.min, split_value);
      this.setRangeMin(split_value);

      var i = this.length() - 1;
      if (i > 0) {
        var trash = [];
        for (; i >= 0; i--) {
          var peer = this._PEERS[i];
          if (new_kbucket.peerInRange(peer)) {
            trash.push(peer);
            new_kbucket.addPeer(peer);
          }
        }
        this.remove(trash);
      }
      return new_kbucket;
    },

    /**
     * Check wether or not the KBucket is splittable
     *
     * @return {Boolean} true if splittable
     */
    isSplittable: function() {
      return (this._min === 0);
    },

    /**
     * Check wether or not the KBucket is full
     *
     * @return {Boolean} true if full
     */
    isFull: function() {
      return (this.length() == globals.K);
    },

    /**
     * Initiates the refresh process
     */
    setRefreshTimeout: function() {
      this._timeoutID   = setTimeout(function(self) {
        self._routingTable.emit('refresh', self);
        self.touch();
      }, this._refreshTime - new Date().getTime(), this);
      return this;
    },

    /**
     * Stop refresh timeout
     */
    stopRefreshTimeout : function() {
      if (this._timeoutID) {
        clearTimeout(this._timeoutID);
        this._timeoutID = undefined;
      }
      return this;
    },

    /**
     * To be called whenever the KBucket is updated
     * This function re-initiate de refresh process
     */
    touch: function(time) {
      var now = new Date().getTime();
      // if the refreshTime is in the past (the app wasn't running)
      if (this._refreshTime && (this._refreshTime - now) < 0) {
        this._routingTable.emit('refresh', this);
      }
      this._refreshTime = time || new Date().getTime() + globals.TIMEOUT_REFRESH;
      return this.stopRefreshTimeout()
                 .setRefreshTimeout();
    },

    /**
     * Represent the KBucket as a String
     * 
     * @return {String} representation of the KBucket
     */
    toString: function() {
      return '<' + this._min + ':' + this._max + '><#' + this.length() + '>';
    },

    //
    // Export
    //

    exports: function(options) {
      var peers =[];

      if(options && (options.include_lastseen || options.include_distance))
        this.forEach(function(peer) {
          var ar = peer.getTriple();
          if(options.include_lastseen) ar.push(peer.getLastSeen().getTime());
          if(options.include_distance) ar.push(peer.getDistance());
          peers.push(ar);
        });
        
      else
        peers = this.getTripleArray();

      return {
        range   : this.getRange(),
        peers   : peers,
        refresh : this._refreshTime
      };
    },

    imports: function(kbucket) {
      try {
        this.setRange(kbucket.range);
        this.add(kbucket.peers);
        this.touch(kbucket.refresh);
        return true;
      } catch(e) {
        return false;
      }
    }

  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
