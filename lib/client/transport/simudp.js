// Dep: [socket.io-client]/socket.io.js

(function(exports, io) {
  
  var KadOH = exports;  
  KadOH.transport =  KadOH.transport || {};

  if(!io) {
    if('object' == typeof console) 
      console.warn('WARNING : socket.io not defined : no transport');
    return;
  }
  
  // @TODO CLEANUP THIS
  KadOH.transport.socket.on('ip_port', function(ip_port) {
    KadOH.transport.ip_port = ip_port;
  });
  
  KadOH.transport.SimUDP = function(server_name) {
    this.socket = ('undefined' === typeof server) ? io.connect('/SimUDP') : io.connect(server_name+'/SimUDP');
  } 
  
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
    
    socket: function() {
      return this.socket;
    },
    
    getIPPort: function() {
      return KadOH.transport.ip_port;
    }
  };
  
})( 'object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}), 
    'object' === typeof this.io ? this.io        : false                         );
