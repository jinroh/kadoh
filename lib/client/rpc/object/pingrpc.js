// Dep: [KadOH]/rpc/object/rpc

(function(exports) {

  var KadOH     = exports,
      RPC       = KadOH.rpc.object.RPC;

  KadOH.rpc        = KadOH.rpc || {};
  KadOH.rpc.object = KadOH.rpc.object || {};

  KadOH.rpc.object.PingRPC = RPC.extend({

    initialize: function(dst_peer) {
      this.supr(dst_peer, 'PING', {});
    },

    _handleResponse: function(response) {
      this.supr(response);
    },

    _getResultFromResolve: function() {
      return this.supr();
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
