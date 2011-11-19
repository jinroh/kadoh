var http = require('http');
var udp = require('dgram');
var sio = require('socket.io');
var bencode = require(__dirname + '/../ext/bencode');
var crypto = require(__dirname + '/../client/util/crypto').util.Crypto;

var NODE_SIZE = 20;
var ADDR_SIZE = 4;
var PORT_SIZE = 2;
var COMPACT_NODE_SIZE = NODE_SIZE + ADDR_SIZE + PORT_SIZE;

exports.listen = function(server, options) {
  var proxy = new Proxy(server, options);

  return proxy.io;
};

var Proxy = exports.Proxy = (function() {

  var _handleClient = function(client) {
    var self = this;

    client.on('whoami', function() {
      client.emit('whoami', self._extractip_port());
    });

    client.on('packet', function(packet) {
      var dst = packet.dst.split(':');
      var rpc = packet.msg;
      if (typeof rpc.method === 'undefined') {
        throw new Error('the rpc should be a request');
      }

      var request = {
        t: rpc.id,
        y: 'q'
      };

      switch (rpc.method) {
        case 'FIND_NODE':
          request.a = {
            id: 'abcdefghij0123456789',
            target: 'abcdefghij0123456789'
            // target: rpc.getParams()[0]
          };
          request.q = 'find_node';
          break;
        case 'PING':
          request.a = {
            id: 'abcdefghij0123456789'
          };
          request.q = 'ping';
          break;
      }

      // console.log('UDPsend: ', request, dst[1], dst[0]);
      request = bencode.encode(request);
      self._mainline.send(request, 0, request.length, dst[1], dst[0]);
    });
  };

  var _handleUDPMessage = function(message, remote) {
    // console.log('UDPrecv: ' + message);

    var response = bencode.decode(message, 'ascii');
    try {
      var nodes = response.r.nodes;
      var transaction = crypto.hexToAscii(crypto.bytesToHex(response.t));
      var result = [];
      
      for(var off = 0;
        off + COMPACT_NODE_SIZE <= nodes.length;
        off += COMPACT_NODE_SIZE) {
        var node = crypto.bytesToHex(nodes.slice(off, off + NODE_SIZE));
        var addr = crypto.bytesToHex(nodes.slice(off + NODE_SIZE, off + NODE_SIZE + ADDR_SIZE));
        var port = crypto.bytesToHex(nodes.slice(off + NODE_SIZE + ADDR_SIZE, off + NODE_SIZE + ADDR_SIZE + PORT_SIZE));

        port = parseInt(port, 16);

        var ip = [];
        for (var i = 0; i < addr.length; i+=2) {
          ip.push(parseInt(addr.substr(i,2), 16));
        }
        ip = ip.join('.');
        result.push([ip, port, node]);
      }

      var packet = {
        src: remote.address,
        dst: this._extractip_port(),
        msg: {
          jsonrpc: '2.0',
          id: transaction,
          result: result
        }
      };
      this._client.emit('packet', packet);
    }
    catch(e) {
      console.error(e, response);
    }

  };

  var _extractip_port = function() {
    return this._client.handshake.address.address + ':' + this._client.handshake.address.port;
  };

  var Proxy = function(server, port) {
    //if server is undefined or a number create one
    if (typeof server === 'undefined') {
      server = 8080;
    }
    
    var mainline = udp.createSocket('udp4');

    if (typeof server === 'number') {
      port = server;
      server = http.createServer();
      server.listen(port);

      mainline.bind(port);
    }
    this._server = server;
    this._mainline = mainline;
    
    //start socket.io for our server
    this.io = sio.listen(this._server);
    this.io.set('log level', 1);
    
    //restricting to 'SimUDP' namespace
    this._io = this.io.of('/SimUDP');
    
    var self = this;
    this._io.on('connection', function(client) {
      self._client = client;
      self._handleClient(client);
    });

    this._mainline.on('message', function(message, remote) {
      self._handleUDPMessage(message, remote);
    });
  };

  Proxy.prototype = {
    version: '0.1',
    constructor: Proxy,

    _handleClient: _handleClient,
    _handleUDPMessage: _handleUDPMessage,
    _extractip_port: _extractip_port
  };

  return Proxy;
})();