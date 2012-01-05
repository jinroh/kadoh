// Dep: [KadOH]/rpc/object/kadohrpc
// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/peerarray
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/core/deferred

(function(exports) {

  var KadOH     = exports,
      globals   = KadOH.globals,
      Peer      = KadOH.Peer,
      KadOHRPC  = KadOH.rpc.object.KadOHRPC,
      PeerArray = KadOH.PeerArray;

  KadOH.rpc        = KadOH.rpc || {};
  KadOH.rpc.object = KadOH.rpc.object || {};


  KadOH.rpc.object.StoreRPC = KadOHRPC.extend({

    initialize: function(queried_peer, kv) {
      //if no arguments, empty RPC that need to parsed from normalized query
      if(arguments.length === 0) {
        this.supr();
        return this;
      }

      this.supr(queried_peer, 'STORE', kv);
    },

    normalizeParams: function() {
      //TODO
    },

    handleNormalizedParams: function(params) {
      //TODO
    },

    normalizeResult: function() {
      //TODO
    },

    handleNormalizedResult: function(result) {
      //TODO
    }
  }).statics({

    parseQuery: function(query, querying_address) {
      var rpc = KadOH.rpc.object.StoreRPC();
      rpc.handleNormalizedQuery(query, querying_address);
      return rpc;
    }
  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
