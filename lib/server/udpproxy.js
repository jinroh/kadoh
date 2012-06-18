var http = require('http');
var udp = require('dgram');
var sio = require('socket.io');

var SERVER_EXT_ADDR = "127.0.0.1";
var PORT_AVAIBILITY = {
  5000 : true,
  5001 : true,
  5002 : true,
  5003 : true,
  5004 : true
};
var FIND_PORT = function() {
  for(var i in PORT_AVAIBILITY) {
    if(PORT_AVAIBILITY[i]) return Number(i);
  }
  return null;
};

exports.listen = function(server) {
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
    var UDPport = FIND_PORT();
    if (UDPport === null) {
      client.disconnect();
      return null;
    }
    var udpsocket = udp.createSocket('udp4');

    client.on('disconnect', function() {
      udpsocket.close();

      console.log('Free port : ' + UDPport);
      PORT_AVAIBILITY[UDPport] = true;
    });

    udpsocket.on('error', function() {
      client.disconnect();

      console.log('Free port : ' + UDPport);
      PORT_AVAIBILITY[UDPport] = true;
    });

    console.log('Use port : ' + UDPport);
    PORT_AVAIBILITY[UDPport] = false;
    udpsocket.bind(UDPport);
    var proxy = new Proxy(client, udpsocket, UDPport);
  });
  return io;
};

var Proxy = exports.Proxy = function(websocket, udpsocket, udpport) {
  var self = this;

  this.udpsocket = udpsocket;
  this.websocket = websocket;
  this.udpport   = udpport;
  this.iam       = SERVER_EXT_ADDR + ":" + udpport;
  
  //connection
  this.udpsocket.on('message', function(message, remote) {
    self._handleUDPMessage(message, remote);
  });

  this.websocket.on('whoami', function() {
    websocket.emit('whoami', self.iam);
  });
  
  this.websocket.on('packet', function(packet) {
    self._handleWebSocketMessage(packet);
  });
};

Proxy.prototype._handleWebSocketMessage = function(packet) {
  var dst = packet.dst.split(':');
  var buf = new Buffer(packet.msg);
  this.udpsocket.send(buf, 0, buf.length, dst[1], dst[0]);
};

Proxy.prototype._handleUDPMessage = function(message, remote) {
  this.websocket.emit('packet', {
    dst : this.iam,
    src : remote.address + ':' + remote.port,
    msg : message.toString()
  });
};