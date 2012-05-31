var http = require('http');
var udp = require('dgram');
var sio = require('socket.io');
var jsonrpc = require(__dirname+'/../network/protocol/jsonrpc2');
var mainline = require(__dirname+'/../network/protocol/mainline');
var ifconfig = require('ifconfig.me');

//UDP port avaibility :

var PORT_AVAIBILITY = {
  3000 : true,
  3001 : true,
  3002 : true,
  3003 : true,
  3004 : true
};

var FIND_PORT = function() {
  for(var i in PORT_AVAIBILITY) {
    if(PORT_AVAIBILITY[i]) return Number(i);
  }
  return null;
};


//****


exports.listen = function(server) {
  // get myIP
  ifconfig.getIP(function(ip) {
    console.log('Ext IP : '+ip);
    SERVER_EXT_ADDR = ip;
  });

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
    var UDPport = FIND_PORT();
    if(UDPport === null) {
      client.disconnect();
      return null;
    }
    var udpsocket = udp.createSocket('udp4');

    client.on('disconnect', function() {
      udpsocket.close();

      console.log('Free port : '+UDPport);
      PORT_AVAIBILITY[UDPport] = true;
    });

    udpsocket.on('error', function() {
      client.disconnect();

      console.log('Free port : '+UDPport);
      PORT_AVAIBILITY[UDPport] = true;
    });

    console.log('Use port : '+UDPport);
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
  
  //connection
  this.udpsocket.on('message', function(message, remote) {
    self._handleUDPMessage(message, remote);
  });

  this.websocket.on('whoami', function() {
    websocket.emit('whoami', SERVER_EXT_ADDR+":"+self.udpport);
  });
  
  this.websocket.on('packet', function(packet) {
    self._handlePacket(packet);
  });


};

var _handlePacket = function(packet) {
  try {
    var dst = packet.dst.split(':');
    var rpc = jsonrpc.decode(packet.msg);

    var encoded = mainline.encode(rpc);
    this.udpsocket.send(encoded, 0, encoded.length, dst[1], dst[0]);

  } catch(e) {
    console.error(e);
  }
};

var _handleUDPMessage = function(message, remote) {
  //console.log('UDPrecv: ' + message);
  try {
    var rpc = jsonrpc.encode(mainline.decode(message));

    var packet = {
      src: remote.address + ':' + remote.port,
      dst: SERVER_EXT_ADDR+ ':' + this.udpport,
      msg: rpc
    };

    this.websocket.emit('packet', packet);
  } catch(e) {
    console.error(e);
  }
};

Proxy.prototype = {
  version: '0.1',
  constructor: Proxy,

  _handlePacket     : _handlePacket,
  _handleUDPMessage : _handleUDPMessage
};