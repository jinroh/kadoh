var StateEventEmitter = require('../../util/state-eventemitter'),
    io                = require('socket.io-client');

var SimUDPTransport = module.exports = StateEventEmitter.extend({

  initialize : function(server_name, options) {
    this.supr();
    
    this.server_name = (server_name || '') + '/SimUDP';
    this.io_options = options;
    this.setState('disconnected');
  },

  connect : function() {
    this.socket = io.connect(this.server_name, this.io_options);
    var self = this;

    this.socket.once('whoami', function(resp) {
      self.iam = resp;
      self.setState('connected', self.iam);
    });

    this.socket.emit('whoami');
  },

  disconnect: function() {
    this.socket.disconnectSync();
    this.setState('disconnected');
  },

  send: function(dst, message) {
    if (this.stateIsNot('connected')) {
      throw new Error('SimUDP transport layer not connected.');
    }
    
    message = {
      dst: dst,
      msg: message
    };

    this.emit('data-out', JSON.stringify(message));
    this.socket.emit('packet', message);
  },

  listen : function(fn, context) {
    if (this.stateIsNot('connected')) {
      throw new Error('SimUDP transport layer not connected.');
    }

    context = context || this;
    var self = this;
    this.socket.on('packet', function(message) {
      self.emit('data-in', message);
      fn.call(context, message);
    });
  }

});