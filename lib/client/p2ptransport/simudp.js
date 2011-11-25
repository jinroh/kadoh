// Dep: [socket.io-client]/socket.io.js
// Dep: [KadOH]/core/eventemitter

(function(exports, io) {
  
  var KadOH       = exports;  
  KadOH.transport = KadOH.transport || {};

  var EventEmitter = KadOH.core.EventEmitter;

  if (!io) {
    if ('object' == typeof console) 
      console.warn('WARNING : socket.io not defined : no transport');
    return;
  }
  
  KadOH.transport.SimUDP = EventEmitter.extend({

    initialize : function(server_name, options) {
      this.supr();
      
      this.server_name = (server_name || '') + '/SimUDP';
      this.io_options = options; 
      this.state = 'disconnected';
    },

    connect : function() {
      this.socket = io.connect(this.server_name, this.io_options);
      var self = this;


      this.socket.once('whoami', function(resp) {
        self.iam = resp;
        self.state = 'connected';
        self.emit('connect', self.iam);
      });

      this.socket.emit('whoami');
    },

    send : function(dst, message) {
      if(this.state !== 'connected') {
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

    listen : function(fn) {
      if(this.state !== 'connected') {
        throw new Error('SimUDP transport layer not connected.');
      }

      this.socket.on('packet', fn);
    }
  });
  
})( 'object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}), 
    'object' === typeof this.io ? this.io       : (require ? require('socket.io-client') : false));
