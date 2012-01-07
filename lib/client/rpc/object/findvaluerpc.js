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


  KadOH.rpc.object.FindValueRPC = KadOHRPC.extend({

    initialize: function(queried_peer, target_id) {
      //if no arguments, empty RPC that need to parsed from normalized query
      if(arguments.length === 0) {
        this.supr();
        return this;
      }

      this.supr(queried_peer, 'FIND_VALUE', target_id);
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
      if(typeof params.target !== 'string' || !globals.REGEX_NODE_ID.test(params.target))
        this.reject('handle normalized query : target not valid');
      else
        this.params = [params.target];
      return this;
    },

    normalizeResult: function() {
      // found     : resolve({value : "ff" , exp : 13}, true);
      // not found : resolve(nodes, false);
      var args   = this.getResult(),
          result = args[0],
          found  = args[1];
      if (found) {
        return {
          value      : JSON.stringify(result.value),
          expiration : result.exp || -1
        };
      } else {
        return {
          nodes : result.getTripleArray()
        };
      }
    },

    handleNormalizedResult: function(result) {
      var res, found;
      if (result.nodes) {
        var validations = Array.isArray(result.nodes) &&
        result.nodes.every(function(peer) {
          return (
            typeof peer[0] === 'string' &&
            globals.REGEX_NODE_ID.test(peer[1])
          );
        });

        if(!validations)
          return this.reject('error', 'non valid findvalue response');
      
        found = false;
        res   = new PeerArray(
          result.nodes.map(function(peer) {
            return new Peer(peer);
          })
        );
      } else {
        if (typeof result.value !== 'string')
          return this.reject('error', 'non valid findvalue response');

        found = true;
        res   = {};
        try {
          res.value = JSON.parse(result.value);
        } catch(e) {
          return this.reject('error', 'non valid findnode value');
        }

        if (result.expiration)
          res.exp = result.expiration;
      }
      return this.resolve(res, found);
    }
  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
