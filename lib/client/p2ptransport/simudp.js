// Dep: [socket.io-client]/socket.io.js
// Dep: [KadOH]/core/eventemitter

(function(exports, io) {
  
  var KadOH             = exports,
      StateEventEmitter = KadOH.core.StateEventEmitter;
  
  if (!io) {
    KadOH.log.warn('socket.io not defined : no transport');
    return;
  }

  KadOH.transport = KadOH.transport || {};
  KadOH.transport.SimUDP = StateEventEmitter.extend({

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
        self.setState('connected', false, self.iam);
      });

      this.socket.emit('whoami');
    },

    send : function(dst, message) {
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

      this.socket.emit('packet', message);
    },

    listen : function(fn, context) {
      if (this.stateIsNot('connected')) {
        throw new Error('SimUDP transport layer not connected.');
      }

      context = context || this;
      this.socket.on('packet', function() {
        fn.apply(context, arguments);
      });
    }

  });
  
})( 'object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}), 
    'object' === typeof this.io ? this.io       : (require ? require('socket.io-client') : false));
