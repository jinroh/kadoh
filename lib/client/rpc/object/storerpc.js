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

    initialize: function(queried_peer, key, value, expiration) {
      //if no arguments, empty RPC that need to parsed from normalized query
      if(arguments.length === 0) {
        this.supr();
        return this;
      }

      this.supr(queried_peer, 'STORE', key, value, expiration);
    },

    getKey: function() {
      return this.getParams(0);
    },
    getValue: function() {
      return this.getParams(1);
    },
    getExpiration: function() {
      return this.getParams(2);
    },

    normalizeParams: function() {
      return {
        key : this.getKey(),
        value : JSON.stringify(this.getValue()),
        expiration : (this.getExpiration() || this.getExpiration() >0) ?
                      this.getExpiration()
                      : -1
      };
    },

    handleNormalizedParams: function(params) {
      if(typeof params.key !== 'string' || !globals.REGEX_NODE_ID.test(params.key))
        return this.reject('handle normalized query : key not valid');

      this.params = [params.key];

      try {
        var value = JSON.parse(params.value);
        this.params.push(value);
      } catch(e) {
        return this.reject('handle normalized query : value not valid');
      }

      if(params.expiration == 'number')
        this.params.push(params.expiration);
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
