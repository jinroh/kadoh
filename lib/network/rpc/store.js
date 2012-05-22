var RPC     = require('./rpc'),
    globals = require('../../globals');


var StoreRPC = module.exports = RPC.extend({

  initialize: function(queried_peer, key, value, exp) {
    if (arguments.length === 0) {
      this.supr();
    } else {
      this.supr(queried_peer, 'STORE', [key, value, exp]);
    }
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
    var exp = this.getExpiration();
    if (!exp || ~exp) exp = -1;
    return {
      key   : this.getKey(),
      value : this.getValue(),
      exp   : exp
    };
  },

  handleNormalizedParams: function(params) {
    if (typeof params.key !== 'string' || !globals.REGEX_NODE_ID.test(params.key)) {
      return this.reject(new Error('non valid store key'));
    } else {
      this.params = [params.key, params.value, params.exp];
    }
  },

  normalizeResult: function() {
    return {};
  },

  handleNormalizedResult: function(result) {
    this.resolve();
  }

});