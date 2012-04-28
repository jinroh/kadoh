var SortedPeerArray = require('./SortedPeerArray'),
    Crypto          = require('../util/Crypto');

var XORSortedPeerArray = module.exports = SortedPeerArray.extend({
  
  initialize: function(peers, relative_node_id) {
    if (relative_node_id) {
      this.setRelativeNodeID(relative_node_id);
    } else {
      this._relativeNodeID = null;
    }
    this.supr(peers);
  },

  setRelativeNodeID: function(relative_node_id) {
    this._relativeNodeID = relative_node_id;
    return this;
  },

  isSortedByDistanceTo: function(relative_node_id) {
    return (this._relativeNodeID === relative_node_id);
  },

  _insertionSort: function(new_peer) {
    if (!this._relativeNodeID) throw new Error('no relative node id');
    return this.supr(new_peer);
  },

  _compare: function(peer_a, peer_b) {
    if (!peer_a && !peer_b) return 0;
    if (!peer_a) return 1;
    if (!peer_b) return -1;
    return Crypto.compareHex(peer_a.getID(), peer_b.getID(), this._relativeNodeID);
  }

});