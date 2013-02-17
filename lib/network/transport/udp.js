var StateEventEmitter = require('../../util/state-eventemitter'),
    dgram             = require('dgram');


var UDPTransport = module.exports = StateEventEmitter.extend({

  initialize: function(server_name, options) {
    this.supr();
    this._socket = dgram.createSocket('udp4');
    this._port   = parseInt(options.port, 10) || 8000;
  },

  connect: function() {
    var self = this;
    this._socket.once('listening', function() {
      var addr = self._socket.address();
      self.iam = addr.address + ':' + addr.port;
      self.setState('connected', self.iam);
    });
    this._socket.once('close', function() {
      this.setState('disconnected');
    });
    this._socket.bind(this._port);
  },

  disconnect: function() {
    this._socket.removeAllListeners();
    this._socket.close();
  },

  send: function(dst, message) {
    if (this.stateIsNot('connected')) {
      throw new Error('UDP transport layer not connected.');
    }
    if (!(message instanceof Buffer)) {
      message = new Buffer(message);
    }
    var addr = dst.split(':');
    this._socket.send(message, 0, message.length, addr[1], addr[0]);
  },

  listen: function(fn, context) {
    if (this.stateIsNot('connected')) {
      throw new Error('UDP transport layer not connected.');
    }

    var self = this;
    context  = context || this;
    this._socket.on('message', function(message, remote) {
      fn.call(context, {
        dst : self.iam,
        src : remote.address + ':' + remote.port,
        msg : message
      });
    });
  }

});