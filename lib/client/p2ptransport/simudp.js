// Dep: [socket.io-client]/socket.io.js
// Dep: [KadOH]/core/eventemitter

(function(exports, io) {
  
  if (!io) {
    if ('object' == typeof console) 
      KadOH.log.warn('WARNING : socket.io not defined : no transport');
    return;
  }

  var KadOH        = exports,
      EventEmitter = KadOH.core.EventEmitter;
  
  KadOH.transport = KadOH.transport || {};
  KadOH.transport.SimUDP = EventEmitter.extend({

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
        self.setStateAndEmit('connected', self.iam);
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
