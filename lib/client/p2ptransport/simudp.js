// Dep: [socket.io-client]/socket.io.js

(function(exports, io) {
  
  var KadOH       = exports;  
  KadOH.transport = KadOH.transport || {};

  if (!io) {
    if ('object' == typeof console) 
      console.warn('WARNING : socket.io not defined : no transport');
    return;
  }
  
  KadOH.transport.SimUDP = function(server_name, options) {
    server_name = (server_name || '') + '/SimUDP';
    this.socket = io.connect(server_name, options);
    
    this._whoami( function(resp) {
        this.iam = resp;
      },
      { context : this }
    );
  };
  
  KadOH.transport.SimUDP.prototype = {
    send : function(dst, message) {
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
      this.socket.on('packet', fn);
    },

    ready : function(fn) {
      this.socket.once('connect', fn);
    },
    
    _whoami : function(fn, options) {
      options = options || {};
      this.socket.once('whoami', function(resp) {
        if (options.context) {
          fn.apply(options.context, [resp]);
        } else {
          fn(resp);
        }
      });
      this.socket.emit('whoami');
    }
  };
  
})( 'object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}), 
    'object' === typeof this.io ? this.io       : (require ? require('socket.io-client') : false));
