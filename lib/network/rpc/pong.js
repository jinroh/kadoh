var RPC = require('./rpc');

var PongRPC = module.exports = RPC.extend({

  initialize: function(queried_peer) {
    if (arguments.length === 0) {
      this.supr();
    } else {
      this.supr(queried_peer, 'PONG');
    }
  },

  // Request goes out:
  // encode params to be put into
  // the `params` field of JSON-RPC Request object
  // (see JSON-RPC 2.0 Specification)
  normalizeParams: function() {
    return {};
  },

  // Request comes in:
  // decode `params` field of JSON-RPC Request object
  // (see JSON-RPC 2.0 Specification)
  handleNormalizedParams: function(params) {
    this.params = [];
  },

  // Response goes out:
  // encode `result` field of JSON-RPC Response Object
  // (see JSON-RPC 2.0 specs)
  normalizeResult: function() {
    return {};
  },

  // Response comes in:
  // decode `result` field of JSON-RPC Response Object
  // then do rejec or resolve the RPC (see deferred)
  // (see JSON-RPC 2.0 specs)
  handleNormalizedResult: function(result) {
    this.resolve();
  }
});