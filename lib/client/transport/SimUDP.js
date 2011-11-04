// Dep: [KadOH]/core/class
// Dep: [KadOH]/util/bind

(function(exports, io) {
  
  var KadOH = exports;
  var bind = KadOH.util.bind;
  
  KadOH.transport =  KadOH.transport || {};

  if(!io) {
    if('object' == typeof console) 
      console.warn('WARNING : socket.io not defined : no transport');
    return;
  }
  
  KadOH.transport.socket = io.connect();
  
  KadOH.transport.SimUDP = {
    send : function(dst, message) {
      if ('function' === typeof message.stringify) {
        message = message.stringify();
      }
      
      message = {
        dst: dst,
        msg: message
      };
      
      KadOH.transport.socket.emit('message', message);
    },
    
    listen : function(fn, context) {
      KadOH.transport.socket.on('message', bind(fn, context));
    },
    
    socket: function() {
      return KadOH.transport.socket;
    }
  };
  
})( 'object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}), 
    'object' === typeof this.io ? this.io        : false                         );
