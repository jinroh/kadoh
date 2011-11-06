// Dep: [socket.io-client]/socket.io.js

(function(exports, io) {
  
  var KadOH = exports;  
  KadOH.transport =  KadOH.transport || {};

  if(!io) {
    if('object' == typeof console) 
      console.warn('WARNING : socket.io not defined : no transport');
    return;
  }
  
  KadOH.transport.SimUDP = function(server_name) {
    this.socket = ('undefined' === typeof server_name) ? io.connect('/SimUDP') : io.connect(server_name+'/SimUDP');
    
    this._whoami(
      function(resp) {
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
      
      this.socket.emit('message', message);
    },
    
    listen : function(fn) {
      this.socket.on('message', fn);
    },
    
    _whoami : function(fn, options) {
      options = options || {};
      this.socket.emit('whoami');
      this.socket.once('whoami', function(resp) {
        if(options.context){
          fn.apply(options.context, [resp]);
        } else {
          fn(resp);
        }
      });
    }
  };
  
})( 'object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}), 
    'object' === typeof this.io ? this.io        : (require ? require('socket.io-client') : false));
