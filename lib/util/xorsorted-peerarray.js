var SortedPeerArray = require('./sorted-peerarray'),
    Crypto          = require('./crypto');
    Peer            = require('../dht/peer')

var XORSortedPeerArray = module.exports = SortedPeerArray.extend({
  
  initialize: function(peers, relative) {
    if (relative) {
      this.setRelative(relative);
    }
    this.supr(peers);
  },

  setRelative: function(relative) {
    this._relative = (relative instanceof Peer) ? relative.getID() : relative;
    return this;
  },

  _insertionSort: function(newPeer) {
    if (!this._relative) throw new Error('no relative node id');
    return this.supr(newPeer);
  },

  compareFn: function(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return Crypto.compareHex(a.getID(), b.getID(), this._relative);
  }

});