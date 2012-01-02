// Dep: [KadOH]/rpc/object/rpc

(function(exports) {

  var KadOH     = exports,
      RPC       = KadOH.rpc.object.RPC;

  KadOH.rpc        = KadOH.rpc || {};
  KadOH.rpc.object = KadOH.rpc.object || {};

  KadOH.rpc.object.PingRPC = RPC.extend({

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

  }).statics({

    parseQuery: function(query, quering_address) {
      var rpc = KadOH.rpc.object.PingRPC();
      rpc.handleNormalizedQuery(query, quering_address);
      return rpc;
    }
  });
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
