var klass = require('klass');
var SimUDP = require(__dirname+'/../lib/client/p2ptransport/simudp.js').transport.SimUDP;
var ajax = require(__dirname+'/../lib/client/util/ajax.js').util.ajax;

var Bot = module.exports = klass({
  initialize: function(type, name, server) {
    this._type = type || 'bot';
    this._name = name || '';
    this._server = server || 'http://localhost:3000';

    this.connect();
  },

  connect: function() {
    var self = this;

    this.socket = new SimUDP(
      this._server,
      {'force new connection': true}
    );

    self.socket._whoami(function(iam) {
      self._iam = iam;
      self.register();
    })
  },

  run: function() {
  },

  register: function() {
    var self = this;

    var req = ajax.post(
      this._server + '/bot/',
      {type: this._type, ip_port: this._iam}
    );

    req.done(function(data) {
      self._id = data.id;
      self.log('registered');
    }).fail(function(error) {
      console.error('Impossible to register ' + self);
      console.error(error);
    });
  },

  log: function(string) {
    console.log(this + ' ' + string);
  },

  toString: function() {
    return '[' + this._type + ' (' + this._name + ')]';
  }
});
