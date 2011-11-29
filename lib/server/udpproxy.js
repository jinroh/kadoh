var http = require('http');
var udp = require('dgram');
var sio = require('socket.io');
var bencode = require(__dirname + '/../ext/bencode');
var crypto = require(__dirname + '/../client/util/crypto').util.Crypto;
var jsonrpc = require(__dirname+'/../client/rpcprotocol/jsonrpc2').protocol.jsonrpc2;

var NODE_SIZE = 20;
var ADDR_SIZE = 4;
var PORT_SIZE = 2;
var COMPACT_NODE_SIZE = NODE_SIZE + ADDR_SIZE + PORT_SIZE;

var UDP_PORT = 3000;

exports.listen = function(server, options) {
  var proxy = new Proxy(server, options);

  return proxy.io;
};

var Proxy = exports.Proxy = function(server, port) {
  //HTTP part
  if (typeof server === 'undefined') {
    server = 8080;
  }
  
  if (typeof server === 'number') {
    port = server;
    server = http.createServer();
    server.listen(port);

  }
  this._server = server;

  //UDP part
  var mainline = udp.createSocket('udp4');
  mainline.bind(UDP_PORT);
  this._mainline = mainline;
  
  this._mainline.on('message', function(message, remote) {
    self._handleUDPMessage(message, remote);
  });

  //SOCKET.IO part 
  this.io = sio.listen(this._server);
  this.io.set('log level', 1);
  
  this._io = this.io.of('/SimUDP');
  
  var self = this;
  this._io.on('connection', function(client) {

    client.on('whoami', function() {
      //TODO : handle more than 1 client
      self._client = client;

      client.emit('whoami', "85.68.250.132:"+UDP_PORT);
    });
    
    client.on('packet', function(packet) {
      self._handlePacket(packet);
    });
  });

};

var _handlePacket = function(packet) {
  var self = this;
    console.log(packet);

  try {
    var dst = packet.dst.split(':');
    var rpc = jsonrpc.parseRPCMessage(packet.msg);

    var encoded = JSONrpc2ToBencode(rpc);

    self._mainline.send(encoded, 0, encoded.length, dst[1], dst[0]);

  } catch(e) {
    if(! e instanceof jsonrpc.RPCError) {
      e = new jsonrpc.RPCError(-32600, 'Proxy : '+e.toString());
    }
    console.log(e);

    var message = jsonrpc.buildErrorResponse(e);

    var resp = {
      src: 'mainline_proxy',
      dst: this._extractip_port(),
      msg: message
    };

    this._client.emit('packet', resp);
  }
};

var _handleUDPMessage = function(message, remote) {
   //console.log('UDPrecv: ' + message);
  try {
    var rpc = bencodeToJSONrpc2(message);
    
    var packet = {
      src: remote.address,
      dst: this._extractip_port(),
      msg: rpc
    };
    console.log(packet);
    this._client.emit('packet', packet);

  } catch(e) {
    console.log(e);
  }
};

var _extractip_port = function() {
  return this._client.handshake.address.address + ':' + this._client.handshake.address.port;
};

Proxy.prototype = {
  version: '0.1',
  constructor: Proxy,

  _handlePacket     : _handlePacket,
  _handleUDPMessage : _handleUDPMessage,
  _extractip_port   : _extractip_port
};

var bencodeToJSONrpc2 = exports.bencodeToJSONrpc2 = function(raw) {

  var message = bencode.decode(raw, 'ascii');

  var RPC; //to return at end
  var RPC_id = crypto.hexToAscii(crypto.bytesToHex(message.t));

  switch(message.y.toString()) {

    case 'r' :
      //RPC Type : RESPONSE
      var RPC_result = {};

      //extarct source id of the message
      RPC_result.id = crypto.bytesToHex(message.r.id);

      if(message.r.nodes) {
        //extract the nodes in answer
        var nodes = message.r.nodes;
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
          result.push([ip+':'+port, node]);

          RPC_result.nodes = result;
        }
      }

      //build the JSON-rpc message
      RPC = jsonrpc.buildResponse(RPC_result, RPC_id);
      break;

    case 'q':
    //RPC type : REQUEST
      var RPC_method;
      var RPC_param  = {};

      RPC_param.id = crypto.bytesToHex(message.a.id);

      switch(message.q.toString()) {
        case 'find_node':
          RPC_method = 'FIND_NODE';
          RPC_param.target = crypto.bytesToHex(message.a.target);
          break;

        case 'ping':
          RPC_method = 'PING';
          break;

        default:
          throw new Error('Method not supported.');
      }
        //build the JSON-rpc message
      RPC = jsonrpc.buildRequest(RPC_method, RPC_param, RPC_id);
      break;

    case 'e':
      var error = jsonrpc.buildInternalRPCError({id : RPC_id});
      RPC = jsonrpc.buildErrorResponse(error);
      break;

    default :
      throw new Error('Unknown RPC type');
  }

  return RPC;
};

var JSONrpc2ToBencode = exports.JSONrpc2ToBencode = function(rpc) {
  var encoded, request = {};

  request.t = rpc.getRPCID();
  
  switch(rpc.getType()) {
    case 'request' :
      request.y = 'q';
      request.a = {};
      request.a.id =  new Buffer(crypto.hexToAscii(rpc.getParams().id), 'ascii');

      switch(rpc.getMethod()) {
        case 'FIND_NODE':
          request.q = 'find_node';
          request.a.target = new Buffer(crypto.hexToAscii(rpc.getParams().target), 'ascii');

          encoded = bencode.encode(request, 'ascii');
          break;

        case 'PING':
          request.q = 'ping';

          encoded = bencode.encode(request, 'ascii');
          break;
      }
      break;
    case 'response' :
      request.y = 'r';
      request.r = {};
      request.r.id = new Buffer(crypto.hexToAscii(rpc.getResult().id), 'ascii');

      if(rpc.getResult().nodes) {

        var buffers = rpc.getResult().nodes.map(function(node) {
          var ip = node[0].split(':')[0]
                    .split('.')
                    .map(function(integer) {return parseInt(integer, 10);});
          var ip_buf = new Buffer(ip);

          var port = parseInt(node[0].split(':')[1],10);
          var port_buf = new Buffer([port>>8, port]);

          var id = node[1];
          var id_buf = new Buffer(crypto.hexToAscii(id), 'ascii');
          
          var node_buffer =  new Buffer(COMPACT_NODE_SIZE);

          id_buf.copy(node_buffer, 0);
          ip_buf.copy(node_buffer, NODE_SIZE);
          port_buf.copy(node_buffer, NODE_SIZE+ADDR_SIZE);

          return node_buffer;
        });
        
        var nodes_buffer = new Buffer(buffers.length*COMPACT_NODE_SIZE);

        for(var i =0; i < buffers.length; i++) {
          buffers[i].copy(nodes_buffer, i*COMPACT_NODE_SIZE);
        }
        request.r.nodes = nodes_buffer;
      }

      encoded = bencode.encode(request, 'ascii');
      break;

    case 'error' : 
      throw new Error('Not implemented : handle JSON-rpc error message');
      //return;
      
    default :
      throw new Error('Bad JSON RPC after parse.');
  }

  return encoded;
};