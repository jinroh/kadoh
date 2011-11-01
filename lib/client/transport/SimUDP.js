(function(exports, io) {
  
  var KadOH = exports;
  KadOH.transport =  KadOH.transport || {};
  var io = io;

  if(!io) {
    if('object' == typeof console) 
      console.log('WARNING : socket.io not defined : no transport');
    return;
  }
  
  KadOH.transport.SimUDP = function(host, details) {
      this.socket = io.connect(host, details);
      socket.on('connect', function() {
        socket.emit('register');
      });
    };
    
  KadOH.transport.SimUDP.prototype = {
    send : function(dst, msg) {
      msg.dst = dst;
      this.socket.emit('message', message);
    },
    
    listen : function(fn) {
      var f = fn;
      this.socket.on('message', function(msg) {
        f(msg);
      });
    }
  };
  
})( 'object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}), 
    'object' == typeof this.io ? this.io        : false                         );
