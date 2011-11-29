// Dep: [KadOH]/core/class
// Dep: [KadOH]/peer
// Dep: [KadOH]/util/crypto

(function(exports) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  var Peer = KadOH.Peer;
  var Crypto = KadOH.util.Crypto;

  var PeerArray = KadOH.PeerArray = Class({

    initialize: function(peers) {
      this._PEERS = [];

      if (peers instanceof this.constructor)
        this._PEERS = peers.getRawArray().slice(0);
      else if (peers)
        this.add(peers);
    },

    getRawArray: function() {
      return this._PEERS;
    },

    getTripleArray: function() {
      return this._PEERS.map(function(peer) {
        return peer.getTriple();
      });
    },

    getPeer: function(index) {
      if (index instanceof Peer) {
        index = this.find(index);
        if (index === -1)
          throw new ReferenceError('this peer does not exist');
      } else {
        if (index < 0 || index >= this.length())
          throw new RangeError(index + ' out of range');
      }
      return this._PEERS[index];
    },

    length: function() {
      return this._PEERS.length;
    },

// TRANSFORMing methods : these methods applly on the instance

    add: function(peers) {
      var self = this;
      peers.forEach(function(peer) {
        self.addPeer(peer);
      });
      return this;
    },

    addPeer: function(peer) {
      peer = (peer instanceof Peer) ? peer : new Peer(peer);

      if (!this.contains(peer)) {
        this._PEERS.push(peer);
      }
      return this;
    },

    remove: function(rm_peers) {
      this._PEERS = this._PEERS.filter(function(peer) {
        return rm_peers.every(function(rm_peer) {
          return !(rm_peer.equals(peer));
        });
      });
      return this;
    },

    removePeer: function (rm_peer) {
      rm_peer = (rm_peer instanceof Peer) ? rm_peer : new Peer(rm_peer);
      
      var index = this.find(rm_peer);
      if (~index)
        this._PEERS.splice(index, 1);
      
      return this;
    },

    find: function(peer) {
      var i = this._PEERS.indexOf(peer);

      if (~i) {
        return i;
      } else {
        for (i = 0, l = this.length(); i < l; i++)
          if (peer.equals(this._PEERS[i]))
            return i;
      }
      return -1;
    },

    contains: function(sample) {
      if (sample instanceof Peer) {
        return (this.find(sample) !== -1);
      }

      var self = this;
      return sample.every(function(sample_peer) {
        return self._PEERS.some(function(peer) {
          return peer.equals(sample_peer);
        });
      });
    },

    equals: function(peers) {
      peers = (peers instanceof PeerArray) ? peers : (new PeerArray(peers));
      return this.contains(peers) && peers.contains(this);
    },

//NON-TRANSFORMing methods : these methodes return a new instance of PeerArray

    clone: function() {
      return new this.constructor(this);
    },

    union: function(peers) {
      return this.clone().add(peers);
    },
    
    filterOut: function(peers) {
      return this.clone().remove(peers);
    },

    pickOutFirst: function(number) {
      number = Math.max(0, Math.min(number, this.length()));

      if (number < this.length()) {
        var clone = this.clone();
        clone._PEERS = this._PEERS.slice(0, number);
        return clone;
      }
      return this;
    },

// Extends Array.prototype

    forEach: function() {
      Array.prototype.forEach.apply(this._PEERS, arguments);
      return this;
    },

    sort: function() {
      Array.prototype.sort.apply(this._PEERS, arguments);
      return this;
    },

    move: function(old_index, new_index) {
      if (new_index < 0 || new_index >= this.length())
        throw new RangeError('new index out of range');
      
      this._PEERS.splice(new_index, 0, this._PEERS.splice(old_index, 1)[0]);
      return this;
    },

    some: function() {
      return Array.prototype.some.apply(this._PEERS, arguments);
    },

    every: function() {
      return Array.prototype.every.apply(this._PEERS, arguments);
    },

    map: function() {
      var clone = this.clone();
      clone._PEERS = Array.prototype.map.apply(clone._PEERS, arguments);
      return clone;
    },

    filter: function() {
      var clone = this.clone();
      clone._PEERS = Array.prototype.filter.apply(clone._PEERS, arguments);
      return clone;
    },

    join: function() {
      return Array.prototype.join.apply(this._PEERS, arguments);
    }

  });
  
  var SortedPeerArray = KadOH.SortedPeerArray = PeerArray.extend({
    
    initialize: function(peers) {
      this._newClosestIndex = -1;
      this.supr(peers);
    },

    add: function(peers) {
      var new_index = -1;
      var self = this;
      peers.forEach(function(peer) {
        new_index = Math.min(self._insertionSort(peer), new_index);
      });
      this._newClosestIndex = new_index;
      return this;
    },

    addPeer: function(peer) {
      this._newClosestIndex = this._insertionSort(peer);
      return this;
    },

    setCompareFunction: function(compare) {
      this._compare = compare;
      return this;
    },

    newClosest: function() {
      return this._newClosestIndex === 0;
    },

    newClosestIndex: function() {
      return this._newClosestIndex;
    },

    sort: function() {
      this.supr(this._compare);
    },

    _insertionSort: function(new_peer) {
      if (!(new_peer instanceof Peer))
        new_peer = new Peer(new_peer);

      var i = -1,
          diff = 0;
      
      do {
        i++;
        diff = this._compare(new_peer, this._PEERS[i]);
        if (diff === 0)
          return -1;
      } while(diff > 0 && i < this.length());

      this._PEERS.splice(i, 0, new_peer);
      return i;
    },

    _compare: function(a, b) {
      return 0;
    }

  });

  var XORSortedPeerArray = KadOH.XORSortedPeerArray = SortedPeerArray.extend({
    
    initialize: function(peers, relative_node_id) {
      this._relativeNodeID = null;

      if (relative_node_id)
        this.setRelativeNodeID(relative_node_id);
      
      if (peers instanceof this.constructor)
        this.setRelativeNodeID(peers._relativeNodeID);
      
      this.supr(peers);
    },

    setRelativeNodeID: function(relative_node_id) {
      this._relativeNodeID = relative_node_id;
      return this;
    },

    isSortedByDistanceTo: function(relative_node_id) {
      return (this._relativeNodeID === relative_node_id);
    },

    sendThemFindRPC : function(iter_lookup) {
      iter_lookup.sendFindRPC(this);
      return this;
    },

    _insertionSort: function(new_peer) {
      if (!this._relativeNodeID)
        throw new Error('no relative node id');
      
      this.supr(new_peer);
    },

    _compare: function(peer_a, peer_b) {
      if (!peer_a && !peer_b)
        return 0;
      if (!peer_a)
        return 1;
      if (!peer_b)
        return -1;
      
      return Crypto.compareBytes(
        peer_a.getXORWith(this._relativeNodeID),
        peer_b.getXORWith(this._relativeNodeID)
      );
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
