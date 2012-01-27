var http = require('http');
var udp = require('dgram');
var sio = require('socket.io');
// var ifconfig = require('ifconfig.me');

var SERVER_EXT_ADDR = "0.0.0.0";
var UDP_PORT        = 5000;

exports.listen = function(server) {
  // ifconfig.getIP(function(ip) {
  //   console.log('Ext IP : ' + ip);
  //   SERVER_EXT_ADDR = ip;
  // });

  //HTTP server part
  if (typeof server === 'undefined') {
    server = 8080;
  }
  
  if (typeof server === 'number') {
    port = server;
    server = http.createServer();
    server.listen(port);
  }

  //Socket IO
  var io = sio.listen(server);
  io.set('log level', 1);
  
  io.of('/SimUDP').on('connection', function(client) {
    var udpsocket = udp.createSocket('udp4');

    client.on('disconnect', function() {
      udpsocket.close();
    });

    udpsocket.on('error', function() {
      client.disconnect();
    });

    udpsocket.bind(UDP_PORT);
    var proxy = new Proxy(client, udpsocket, UDP_PORT);
  });
  return io;
};

var Proxy = exports.Proxy = function(websocket, udpsocket, udpport) {
  var self = this;

  this.udpsocket = udpsocket;
  this.websocket = websocket;
  this.udpport   = udpport;
  
  //connection
  this.udpsocket.on('message', function(message, remote) {
    self._handleUDPMessage(message, remote);
  });

  this.websocket.on('whoami', function() {
    websocket.emit('whoami', SERVER_EXT_ADDR + ":" + self.udpport);
  });
  
  this.websocket.on('packet', function(packet) {
    self._handleWebSocketMessage(packet);
  });
};

Proxy.prototype._handleWebSocketMessage = function(message) {
  try {
    var dst = message.dst.split(':');
    message.src = SERVER_EXT_ADDR + ':' + this.udpport;
    message = new Buffer(JSON.stringify(message));
    this.udpsocket.send(message, 0, message.length, dst[1], dst[0]);
  }
  catch(error) {}
};

Proxy.prototype._handleUDPMessage = function(message, remote) {
  try {
    packet = JSON.parse(message);
    this.websocket.emit('packet', packet);
  }
  catch(error) {}
};