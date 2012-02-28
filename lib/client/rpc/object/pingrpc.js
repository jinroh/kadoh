// Dep: [KadOH]/rpc/object/kadohrpc

(function(exports) {

  var KadOH     = exports,
      KadOHRPC  = KadOH.rpc.object.KadOHRPC;

  KadOH.rpc        = KadOH.rpc || {};
  KadOH.rpc.object = KadOH.rpc.object || {};

  KadOH.rpc.object.PingRPC = KadOHRPC.extend({

    initialize: function(queried_peer) {
      if (arguments.length === 0) {
        this.supr();
      } else {
        this.supr(queried_peer, 'PING');
      }
    },

    normalizeParams: function() {
      return {};
    },

    handleNormalizedParams: function(params) {
      this.params = [];
    },

    normalizeResult: function() {
      return {};
    },

    handleNormalizedResult: function(result) {
      this.resolve();
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
