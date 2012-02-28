// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/peerarray
// Dep: [KadOH]/rpc/object/kadohrpc

(function(exports) {

  var KadOH     = exports,
      globals   = KadOH.globals,
      Peer      = KadOH.Peer,
      PeerArray = KadOH.PeerArray,
      KadOHRPC  = KadOH.rpc.object.KadOHRPC;

  KadOH.rpc        = KadOH.rpc || {};
  KadOH.rpc.object = KadOH.rpc.object || {};

  KadOH.rpc.object.FindValueRPC = KadOHRPC.extend({

    initialize: function(queried_peer, target_id) {
      if (arguments.length === 0) {
        this.supr();
      } else {
        this.supr(queried_peer, 'FIND_VALUE', target_id);
      }
    },

    getTarget: function() {
      return this.getParams(0);
    },

    normalizeParams: function() {
      return {
        target : this.getTarget()
      };
    },

    handleNormalizedParams: function(params) {
      if (typeof params.target !== 'string' || !globals.REGEX_NODE_ID.test(params.target)) {
        this.reject(new Error('non valid findvalue query'));
      } else {
        this.params = [params.target];
      }
      return this;
    },

    normalizeResult: function() {
      var args   = this.getResult(),
          result = args[0],
          found  = args[1];
      if (found) {
        return {
          value : result.value,
          exp   : result.exp || -1
        };
      } else {
        return {
          nodes : result.getTripleArray()
        };
      }
    },

    handleNormalizedResult: function(result) {
      var resolve,
          found = false;

      if (result.value) {
        found = true;
        resolve = {
          value : result.value,
          exp   : result.exp
        };
      }
      else if (result.nodes) {
        try {
          resolve = new PeerArray(result.nodes);
        } catch(e) {
          return this.reject(new Error('non valid findvalue response'));
        }
      }

      if (resolve) {
        return this.resolve(resolve, found);
      } else {
        return this.reject(new Error('non valid findvalue response'));
      }
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
