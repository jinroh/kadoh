// Dep: [KadOH]/core/stateeventemitter
// Dep: [KadOH]/globals

(function(exports) {

  var KadOH             = exports,
      StateEventEmitter = KadOH.core.StateEventEmitter,
      globals           = KadOH.globals;

  if (!module && typeof require !== 'function') {
    KadOH.log.warn('not in node : no transport');
    return;
  } else {
    var dgram  = require('dgram');
    var Buffer = require('buffer');
  }

  KadOH.transport = KadOH.transport || {};
  KadOH.transport.UDP = StateEventEmitter.extend({

    initialize : function(server_name, options) {
      this.supr();
      this._socket = dgram.createSocket('udp4');
      this._port   = options.port || 8000;
    },

    connect: function() {
      var self = this;
      this._socket.bind(this._port);
      this._socket.once('listening', function() {
        self.iam = this._socket.address().join(':');
        self.setState('connected', self.iam);
      });
    },

    disconnect: function() {
      this._socket.removeAllListeners();
      this._socket.close();
      this.setState('disconnected');
    },

    send: function(dst, message) {
      if (this.stateIsNot('connected')) {
        throw new Error('SimUDP transport layer not connected.');
      }

      if ('function' === typeof message.stringify) {
        message = message.stringify();
      }

      message = {
        dst: dst,
        msg: message
      };
      var buffer = new Buffer(),
          len    = buffer.write(JSON.stringify(message)),
          addr   = dst.split(':');
      this._socket.send(buffer, 0, len, addr[1], addr[0]);
    },

    listen: function(fn, context) {
      if (this.stateIsNot('connected')) {
        throw new Error('SimUDP transport layer not connected.');
      }

      context = context || this;
      this._socket.on('message', function() {
        fn.apply(context, arguments);
      });
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));