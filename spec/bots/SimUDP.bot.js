var SimUDP = require(__dirname+'/../../lib/client/transport/simudp.js').transport.SimUDP;

exports.Bot = function(name) {
  this.name = name ? name : 'bot';
};

exports.Bot.prototype.run = function() {
  this.socket = new SimUDP('http://0.0.0.0:8080', {'force new connection': true});

  var self = this;

  this.socket.listen(function(message){
    var src = message.src;
    var msg = message.msg;
    self.socket.send(src, 'RE:'+msg);
    });
};

exports.Bot.prototype.ready = function(fn) {
  
  
};