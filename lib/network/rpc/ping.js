RPC   = require('./rpc');

var PingRPC = module.exports = RPC.extend({

  initialize: function(queried_peer) {
    if (arguments.length === 0) {
      this.supr();
    } else {
      this.supr(queried_peer, 'PING');
    }
  },

  normalizeParams: function() {
    return {};
  },

  handleNormalizedParams: function(params) {
    this.params = [];
  },

  normalizeResult: function() {
    return {};
  },

  handleNormalizedResult: function(result) {
    this.resolve();
  }
});