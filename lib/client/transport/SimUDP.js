// Dep: [socket.io-client]/socket.io.js

(function(exports, io) {
  
  var KadOH = exports;
  KadOH.transport =  KadOH.transport || {};
  var io = io;

  KadOH.transport.SimUDP = function(host, details) {
      this.socket = io.connect(host, details);
      socket.on('connect', function() {
        socket.emit('register');
      });
    };
    
  KadoH.transport.SimUDP.prototype = {
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
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}), this.io);