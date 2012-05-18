var IterativeDeferred   = require('../../util/iterative-deferred');
var XORSortedPeerArray  = require('../../util/xorsorted-peerarray');
var PeerArray           = require('../../util/peerarray');
var Peer                = require('../peer');
var globals             = require('../../globals');
var FindValueRPC        = require('../../network/rpc/findvalue');

var IterativeFindValue = module.exports = IterativeDeferred.extend({
  initialize: function(target, sendFn, sendCtxt) {
    this.supr();
    this._target = (target instanceof Peer) ? target.getID() : target;
    //hack
    this._targetType = 'VALUE';
    
    this.sendFn = function() {
      sendFn.apply(sendCtxt, arguments);
    };

    this.init(new XORSortedPeerArray().setRelativeNodeID(this._target));
  },

  mapFn: function(peer) {
    var rpc = new FindValueRPC(peer, this._target);
    this.sendFn(rpc);
    return rpc;
  },

  reduceFn: function(result, found, peers, map, queried, reached) {

    if(found)
      this.resolve(result, new XORSortedPeerArray(reached, this._target));
    else {
      var new_peers = result;
      peers.add(new_peers);

      if(peers.newClosest())
        peers.pickOutFirst(globals.ALPHA).forEach(map);
    }
    return peers;
  },

  finallyFn: function() {
    this.reject('not found');
  }
});