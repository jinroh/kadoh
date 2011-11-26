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

      if(!this.contains(peer)) {
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
      if (index !== -1)
        this._PEERS.splice(index, 1);
      
      return this;
    },

    find: function(peer) {
      var i = this._PEERS.indexOf(peer);

      if (i !== -1) {
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
        var clone = new this.clone();
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
      this._newClosest = false;
      this.supr(peers);
    },

    add: function(peers) {
      var new_closest = false;
      var self = this;
      peers.forEach(function(peer) {
        self.addPeer(peer);
        new_closest = new_closest || self._newClosest;
      });
      this._newClosest = new_closest;
      return this;
    },

    addPeer: function(peer) {
      if (!(peer instanceof Peer))
        peer = new Peer(peer);
      
      this._insertionSort(peer);
      return this;
    },

    setCompareFunction: function(compare) {
      this._compare = compare;
      return this;
    },

    sortMadeNewClosestTo: function() {
      return this._newClosest;
    },

    sort: function() {
      this.supr(this._compare);
    },

    _insertionSort: function(new_peer) {
      this._newClosest = false;

      var i = -1,
          diff = 0;
      
      do {
        i++;
        diff = this._compare(new_peer, this._PEERS[i]);
        if (diff === 0)
          return;
      } while(diff > 0 && i < this.length());

      if (i === 0)
        this._newClosest = true;
      
      this._PEERS.splice(i, 0, new_peer);
    },

    _compare: function(a, b) {
      return 0;
    }

  });

  var XORSortedPeerArray = KadOH.XORSortedPeerArray = SortedPeerArray.extend({
    
    initialize: function(peers, relative_node_id) {
      this._relativeNodeId = null;

      if (relative_node_id)
        this.setRelativeNodeId(relative_node_id);
      
      if (peers instanceof this.constructor)
        this.setRelativeNodeId(peers._relativeNodeId);
      
      this.supr(peers);
    },

    setRelativeNodeId: function(relative_node_id) {
      this._relativeNodeId = relative_node_id;
      return this;
    },

    isSortedByDistanceTo: function(relative_node_id) {
      return (this._relativeNodeId === relative_node_id);
    },

    sortByDistanceTo: function() {
      return this;
    },

    sortMadeNewClosestTo: function(relative_node_id) {
      relative_node_id = relative_node_id || this._relativeNodeId;

      if(!this.isSortedByDistanceTo(relative_node_id))
        throw new Error('PeerArray not sorted by distance to ' + relative_node_id);

      return this._newClosest;
    },

    sendThemFindRPC : function(iter_lookup) {
      iter_lookup.sendFindRPC(this);
      return this;
    },

    _insertionSort: function(new_peer) {
      if (!this._relativeNodeId)
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
        peer_a.getXORWith(this._relativeNodeId),
        peer_b.getXORWith(this._relativeNodeId)
      );
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
