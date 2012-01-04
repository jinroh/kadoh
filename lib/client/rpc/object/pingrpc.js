// Dep: [KadOH]/rpc/object/kadohrpc

(function(exports) {

  var KadOH     = exports,
      KadOHRPC  = KadOH.rpc.object.KadOHRPC;

  KadOH.rpc        = KadOH.rpc || {};
  KadOH.rpc.object = KadOH.rpc.object || {};

  KadOH.rpc.object.PingRPC = KadOHRPC.extend({

    initialize: function(queried_peer) {
      //if no arguments, empty RPC that need to parsed from normalized query
      if(arguments.length === 0) {
        this.supr();
        return this;
      }

      this.supr(queried_peer, 'PING', {});
    },

    normalizeParams: function() {
      //nothing to do
      return {};
    },

    handleNormalizedParams: function(params) {
      //nothing to do
      this.params = null;
    },

    normalizeResult: function() {
      //nothing to do
      return {};
    },

    handleNormalizedResult: function(result) {
      //nothing to do
      this.resolve();
    }
  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
