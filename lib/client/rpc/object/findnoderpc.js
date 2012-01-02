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
        return this;
      }

      this.supr(queried_peer, 'FIND_NODE', target_id);
    },

    normalizeParams: function() {
      var params = {};
      params.target = this.getParams();
      return params;
    },

    handleNormalizedParams: function(params) {
      if(typeof params.target !== 'string' || !globals.REGEX_NODE_ID.test(params.target))
        this.reject('handle normalized query : target not valid');
      else
        this.params = {target : params.target};
      return this;
    },

    normalizeResult: function() {
      var result = {};
      result.nodes = this.getResult().map(function(peer){
        return [peer.getAddress(), peer.getID()];
      });
      return result;
    },

    handleNormalizedResult: function(result) {
      if(typeof result.nodes !== 'object' && !Array.isArray(result.nodes))
        return this.reject('Handle normalized response : no nodes provided in response');
      
      var test_ids = result.node.every(function(peer) {
        return (typeof peer[0] === 'string' && globals.REGEX_NODE_ID.test(peer[1]));
      });

      if(!test_ids)
        return this.reject('Handle normalized response : provided nodes broken');
      
      var peers = result.nodes.map(function(peer) {
        return new Peer(peer[0], peer[1]);
      });
      var res = new PeerArray(peers);
      this.resolve(res);
    }
  }).statics({

    parseQuery: function(query, quering_address) {
      var rpc = KadOH.rpc.object.PingRPC();
      rpc.handleNormalizedQuery(query, quering_address);
      return rpc;
    }
  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
