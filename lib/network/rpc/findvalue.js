var RPC       = require('./rpc'),
    globals   = require('../../globals'),
    PeerArray = require('../../util/peerarray');


var FindValueRPC = module.exports = RPC.extend({

  initialize: function(queried_peer, target_id) {
    if (arguments.length === 0) {
      this.supr();
    } else {
      this.supr(queried_peer, 'FIND_VALUE', [target_id]);
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
        nodes  = args[0].getTripleArray(),
        result = args[1];
    if (result) {
      return {
        nodes : nodes,
        value : result.value,
        exp   : result.exp || -1
      };
    } else {
      return {
        nodes : nodes
      };
    }
  },

  handleNormalizedResult: function(result) {
    var nodes, value = null;
   
    if (result.nodes) {
      try {
      nodes = new PeerArray(result.nodes);
      } catch(e) {
        return this.reject(new Error('non valid findvalue response'));
      }

      if (result.value) {
        value = {
          value : result.value,
          exp   : result.exp
        };
      }
      
      this.resolve(nodes, value);
    } else {
      this.reject(new Error('non valid findvalue response'));
    }
  }

});