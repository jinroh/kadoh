var IterativeDeferred   = require('../../util/iterative-deferred');
var XORSortedPeerArray  = require('../../util/xorsorted-peerarray');
var PeerArray           = require('../../util/peerarray');
var Peer                = require('../peer');
var globals             = require('../../globals');
var FindNodeRPC         = require('../../network/rpc/findnode');

var IterativeFindValue = module.exports = IterativeDeferred.extend({
  initialize: function(to_map) {
    this.supr(to_map);

     //hack
    this._targetType = 'NODE';
  },

  target: function(target) {
    this._target = (target instanceof Peer) ? target.getID() : target;
    this.init(new XORSortedPeerArray().setRelativeNodeID(this._target));

    //auto-start
    if(this.sendFn)
      this.start();

    return this;
  },

  send: function(sendFn, sendCtxt) {
    this.sendFn = function() {
      sendFn.apply(sendCtxt || null, arguments);
    };

     //auto-start
    if(this._target)
      this.start();

    return this;
  },

  mapFn: function(peer) {
    var rpc = new FindNodeRPC(peer, this._target);
    this.sendFn(rpc);
    return rpc;
  },

  reduceFn: function(peers, newPeers, map, queried, reached) {
    peers.add(newPeers);

    //did we found a peer with same ID ?
    if(queried.getID() === this._target)
      return this.resolve(queried, new XORSortedPeerArray(reached, this._target));

    if(peers.newClosest())
      peers.pickOutFirst(globals.ALPHA).forEach(map);

    return peers;
  },

  endFn: function(reduced, map, reached) {
    this.reject(new XORSortedPeerArray(reached, this._target));
  }
});