var RPC       = require('./rpc'),
    globals   = require('../../globals'),
    PeerArray = require('../../util/peerarray');

var FindNodeRPC = module.exports = RPC.extend({

  initialize: function(queried_peer, target_id) {
    if (arguments.length === 0) {
      this.supr();
    } else {
      this.supr(queried_peer, 'FIND_NODE', [target_id]);
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
      this.reject(new Error('non valid findnode query'));
    } else {
      this.params = [params.target];
    }
    return this;
  },

  normalizeResult: function() {
    return {
      nodes : this.getResult()[0].getTripleArray()
    };
  },

  handleNormalizedResult: function(result) {
    var nodes;
    try {
      nodes = new PeerArray(result.nodes);
    } catch(e) {
      return this.reject(new Error('non valid findnode response'));
    }
    return this.resolve(nodes);
  }

});