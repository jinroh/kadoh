var SimUDP = require(__dirname+'/../lib/client/p2ptransport/simudp.js').transport.SimUDP;
var ajax = require(__dirname+'/../lib/client/util/ajax.js').util.ajax;

exports.Bot = function(name) {
  this.name = name ? name : 'bot';
};

exports.Bot.prototype.run = function(server) {
  server = server ? server : 'http://0.0.0.0:8080';
  this.socket = new SimUDP(server,{'force new connection': true});

  var self = this;

  this.socket.listen(function(message) {
    var src = message.src;
    var msg = message.msg;
    self.socket.send(src, 'RE:'+msg);
  });

  return this;
};

exports.Bot.prototype.register = function(type, server) {
  var self = this;
  this.socket.ready(function() {
    server = server || 'http://localhost:3000';
    self.socket._whoami(function(ip_port) {
      //console.log({type : type, ip_port : ip_port});
      var req = ajax.post(server+'/bot/',{type : type, ip_port : ip_port});
      req.done(function(data) {
        console.log('Bot registered as '+data.type+'('+data.id+')');
      });
      req.fail(function(data, foo) {
        console.log('Registration failed');
      });
    });
  });
};