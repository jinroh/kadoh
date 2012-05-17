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

    this.init({
      reached : new XORSortedPeerArray().setRelativeNodeID(this._target),
      heardOf : new XORSortedPeerArray().setRelativeNodeID(this._target)
    });
  },

  mapFn: function(peer) {
    var rpc = new FindValueRPC(peer, this._target);
    this.sendFn(rpc);
    return rpc;
  },

  reduceFn: function(queried, result, found, peers, map) {
    peers.reached.addPeer(queried);

    if(found)
      this.resolve(result, peers.reached);
    else {
      var new_peers = result;
      peers.heardOf.add(new_peers);

      if(peers.heardOf.newClosest())
        peers.heardOf.pickOutFirst(globals.ALPHA).forEach(map);
    }
    return peers;
  },

  finalyFn: function() {
    this.reject('not found');
  }
});