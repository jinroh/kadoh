(function(global) {

  global.SimUDP = function(host, details) {

    var socket = window.io.connect(host, details);
    socket.on('connect', function() {
      socket.emit('register');
    });

    this.socket = socket;
  };

  global.SimUDP.prototype = {
    constructor : window.SimUDP

    , version : "0.2"

    , send : function(message) {
      this.socket.emit('message', message);
    }

    , listen : function(fn) {
      var f = fn;
      this.socket.on('message', function(msg) {
        f(msg);
      });
    }

  };


  }(this));
