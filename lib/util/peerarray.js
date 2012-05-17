var klass   = require('klass'),
    Peer    = require('../dht/peer');

var PeerArray = module.exports = klass({

  initialize: function(peers) {
    this._PEERS = [];
    if (peers) {
      if (peers instanceof PeerArray)
        this._PEERS = peers.getRawArray().slice();
      else
        this.add(peers);
    }
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
      if (index < 0 || index >= this.size())
        throw new RangeError(index + ' out of range');
    }
    return this._PEERS[index];
  },

  size: function() {
    return this._PEERS.length;
  },

// TRANSFORMing methods : these methods applly on the instance

  add: function(peers) {
    peers.forEach(function(peer) {
      this.addPeer(peer);
    }, this);
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
    rm_peers = rm_peers || [];
    this._PEERS = this._PEERS.filter(function(peer) {
      return rm_peers.every(function(rm_peer) {
        return !(rm_peer.equals(peer));
      });
    });
    return this;
  },

  removePeer: function (rm_peer) {
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
      for (i = 0, l = this.size(); i < l; i++)
        if (peer.equals(this._PEERS[i]))
          return i;
    }
    return -1;
  },

  contains: function(sample) {
    if (sample instanceof Peer) {
      return (this.find(sample) !== -1);
    }

    return sample.every(function(sample_peer) {
      return this._PEERS.some(function(peer) {
        return peer.equals(sample_peer);
      });
    }, this);
  },

  equals: function(peers) {
    peers = (peers instanceof PeerArray) ? peers : (new PeerArray(peers));
    return this.contains(peers) && peers.contains(this);
  },

  empty: function() {
    return this._PEERS.length === 0;
  },

//NON-TRANSFORMing methods : these methodes return a new instance of PeerArray

  clone: function() {
    var clone = new this.constructor();
    for (var prop in this) {
      if (this.hasOwnProperty(prop)) {
        clone[prop] = Array.isArray(this[prop]) ? this[prop].slice() : this[prop];
      }
    }
    return clone;
  },

  union: function(peers) {
    return this.clone().add(peers);
  },
  
  filterOut: function(peers) {
    var clone = this.clone();
    if (peers instanceof Peer) {
      clone.removePeer(peers);
    } else {
      clone.remove(peers);
    }
    return clone;
  },

  filterByID: function(id) {
    return this.filter(function(peer) {
      return peer.getID() === id;
    });
  },

  pickOutFirst: function(number) {
    number = Math.max(0, Math.min(number, this.size()));

    var clone = this.clone();
    clone._PEERS = this._PEERS.slice(0, number);
    return clone;
  },

  sendThemFindRPC : function(iter_lookup) {
    iter_lookup.sendFindRPC(this);
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
    if (new_index < 0 || new_index >= this.size())
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