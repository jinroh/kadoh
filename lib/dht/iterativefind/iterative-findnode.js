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
    this._staled = false;
  },

  target: function(target) {
    this._target = (target instanceof Peer) ? target.getID() : target;
    this.init(new XORSortedPeerArray(this.to_map, this._target));

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

  reduceFn: function(peers, newPeers, map) {
    peers.add(newPeers);

    if (peers.newClosestIndex() >= 0 && peers.newClosestIndex() < globals.ALPHA) {
      peers.first(globals.ALPHA, map);
    }

    return peers;
  },

  endFn: function(peers, map, reached) {
    if (this._staled) {
      this.reject(new XORSortedPeerArray(reached, this._target));
      return;
    }

    if (reached.length <= globals.ALPHA && peers.size() > 0) {
      this._staled = true;
      peers.first(globals.K, map);
    } else {
      this.reject(new XORSortedPeerArray(reached, this._target));
    }
  }
});