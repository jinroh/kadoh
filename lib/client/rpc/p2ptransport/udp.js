// Dep: [KadOH]/core/stateeventemitter
// Dep: [KadOH]/globals

(function(exports) {

  var KadOH             = exports,
      StateEventEmitter = KadOH.core.StateEventEmitter,
      globals           = KadOH.globals;

  if (typeof module !== 'object' && typeof require !== 'function') {
    KadOH.log.warn('not in node : no udp transport');
    return;
  } else {
    var dgram  = require('dgram');
  }

  KadOH.transport = KadOH.transport || {};
  KadOH.transport.UDP = StateEventEmitter.extend({

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
        throw new Error('SimUDP transport layer not connected.');
      }

      if ('function' === typeof message.stringify) {
        message = message.stringify();
      }

      var buffer = new Buffer(JSON.stringify(message));
      var addr   = dst.split(':');
      this._socket.send(buffer, 0, buffer.length, addr[1], addr[0]);
    },

    listen: function(fn, context) {
      if (this.stateIsNot('connected')) {
        throw new Error('SimUDP transport layer not connected.');
      }

      var self = this;
      context  = context || this;
      this._socket.on('message', function(message, remote) {
        try {
          fn.call(context, {
            dst : self.iam,
            src : remote.address + ':' + remote.port,
            msg : JSON.parse(message)
          });
        } catch(e) {}
      });
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));