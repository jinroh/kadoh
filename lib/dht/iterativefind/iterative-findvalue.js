var IterativeDeferred   = require('../../util/iterative-deferred');
var XORSortedPeerArray  = require('../../util/xorsorted-peerarray');
var PeerArray           = require('../../util/peerarray');
var Peer                = require('../peer');
var globals             = require('../../globals');
var FindValueRPC        = require('../../network/rpc/findvalue');

var IterativeFindValue = module.exports = IterativeDeferred.extend({
  initialize: function(to_map) {
    this.supr(to_map);
    //hack
    this._targetType = 'VALUE';

  },

  target: function(target) {
    this._target = (target instanceof Peer) ? target.getID() : target;
    this.init(new XORSortedPeerArray().setRelative(this._target));

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
    var rpc = new FindValueRPC(peer, this._target);
    this.sendFn(rpc);
    return rpc;
  },

  reduceFn: function(peers, result, found, map, queried, reached) {
    if (found) {
      this.resolve(result, new XORSortedPeerArray(reached, this._target));
    } else {
      peers.add(result);

      if(peers.newClosest()) {
        peers.first(globals.ALPHA, map);
      }
    }
    return peers;
  },

  endFn: function(peers, map, reached) {
    this.reject(new XORSortedPeerArray(reached, this._target));
  }
});