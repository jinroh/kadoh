var PeerArray = require('./PeerArray'),
    Peer      = require('./Peer');

var SortedPeerArray = module.exports = PeerArray.extend({
  
  initialize: function(peers) {
    this._newClosestIndex = -1;
    this.supr(peers);
  },

  add: function(peers) {
    var new_index = Infinity;
    peers.forEach(function(peer) {
      new_index = Math.min(this._insertionSort(peer), new_index);
    }, this);
    this._newClosestIndex = isFinite(new_index) ? new_index : -1;
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

  _insertionSort: function(peer) {
    if (!(peer instanceof Peer)) {
      peer = new Peer(peer);
    }
    var i    = -1,
        diff = 0;
    do {
      diff = this._compare(peer, this._PEERS[++i]);
      if (diff === 0) return -1;
    } while(diff > 0 && i < this.size());

    this._PEERS.splice(i, 0, peer);
    return i;
  },

  // abstract
  _compare: function(a, b) {
    return 0;
  }

});