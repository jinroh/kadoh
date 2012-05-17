var Peer = require('./peer');

var BootstrapPeer = module.exports = Peer.extend({

  initialize: function() {
    var args  = arguments;

    if (Array.isArray(args[0])) {
      args  = args[0];
    }

    this.touch();
    this._distance = null;
    this._address  = args[0];
    this._id       = null;
  }

});