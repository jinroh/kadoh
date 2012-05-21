var PeerArray = require('./peerarray'),
    Peer      = require('../dht/peer');

var SortedPeerArray = module.exports = PeerArray.extend({
  
  initialize: function(peers) {
    this._newClosestIndex = -1;
    this.supr(peers);
  },

  add: function(peers) {
    var newIndex = Infinity;
    peers.forEach(function(peer) {
      var index = this._insertionSort(peer);
      if (index !== -1) {
        newIndex = Math.min(newIndex, index);
      }
    }, this);
    this._newClosestIndex = isFinite(newIndex) ? newIndex : -1;
    return this;
  },

  addPeer: function(peer) {
    this._newClosestIndex = this._insertionSort(peer);
    return this;
  },

  sort: function() {
    this.supr(this.compareFn);
  },

  compare: function(compare) {
    this.compareFn = compare;
    return this;
  },

  newClosest: function() {
    return this._newClosestIndex === 0;
  },

  newClosestIndex: function() {
    return this._newClosestIndex;
  },

  _insertionSort: function(peer) {
    if (!(peer instanceof Peer)) {
      peer = new Peer(peer);
    }
    var i = -1, diff = 0, l = this.size();
    do {
      diff = this.compareFn(peer, this.array[++i]);
      if (diff === 0) return -1;
    } while (diff > 0 && i < l);

    this.array.splice(i, 0, peer);
    return i;
  },

  compareFn: function(a, b) {
    return a - b;
  }

});