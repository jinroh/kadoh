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


  KadOH.rpc.object.FindNodeRPC = KadOHRPC.extend({

    initialize: function(queried_peer, target_id) {
      //if no arguments, empty RPC that need to parsed from normalized query
      if(arguments.length === 0) {
        this.supr();
        return;
      }
      this.supr(queried_peer, 'FIND_NODE', target_id);
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
      if(!globals.REGEX_NODE_ID.test(params.target)) {
        return this.reject('error', 'non valid findnode query');
      }
      this.params = [params.target];
      return this;
    },

    normalizeResult: function() {
      return {
        nodes : this.getResult()[0].getTripleArray()
      };
    },

    handleNormalizedResult: function(result) {
      var validations = Array.isArray(result.nodes) &&
        result.nodes.every(function(peer) {
          return (
            typeof peer[0] === 'string' &&
            globals.REGEX_NODE_ID.test(peer[1])
          );
        });

      if(!validations)
        return this.reject('error', 'non valid findnode response');
      
      var res = new PeerArray(
        result.nodes.map(function(peer) {
          return new Peer(peer);
        })
      );
      return this.resolve(res);
    }
  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
