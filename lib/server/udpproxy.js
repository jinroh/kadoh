var http = require('http');
var udp = require('dgram');
var sio = require('socket.io');
var bencode = require(__dirname + '/../ext/bencode');
var crypto = require(__dirname + '/../client/util/crypto').util.Crypto;
var jsonrpc = require(__dirname+'/../client/rpc/protocol/jsonrpc2').rpc.protocol.jsonrpc2;
var ifconfig = require('ifconfig.me');

var NODE_SIZE = 20;
var ADDR_SIZE = 4;
var PORT_SIZE = 2;
var COMPACT_NODE_SIZE = NODE_SIZE + ADDR_SIZE + PORT_SIZE;

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
    var rpc = jsonrpc.parseRPCMessage(packet.msg);

    var encoded = JSONrpc2ToBencode(rpc);

    this.udpsocket.send(encoded, 0, encoded.length, dst[1], dst[0]);

  } catch(e) {
    if(! e instanceof jsonrpc.RPCError) {
      e = new jsonrpc.RPCError(-32600, 'Proxy : '+e.toString());
    }

    var message = jsonrpc.buildErrorResponse(e);

    var resp = {
      src: 'mainline_proxy',
      dst: this._extractip_port(),
      msg: message
    };

    this.websocket.emit('packet', resp);
  }
};

var _handleUDPMessage = function(message, remote) {
   //console.log('UDPrecv: ' + message);
  try {
    var rpc = bencodeToJSONrpc2(message);

    var packet = {
      src: remote.address + ':' + remote.port,
      dst: SERVER_EXT_ADDR+':'+this.udpport,
      msg: rpc
    };
        
    this.websocket.emit('packet', packet);

  } catch(e) {
    console.log(e);
  }
};

// var _extractip_port = function() {
//   return this.websocket.handshake.address.address + ':' + this.websocket.handshake.address.port;
// };

Proxy.prototype = {
  version: '0.1',
  constructor: Proxy,

  _handlePacket     : _handlePacket,
  _handleUDPMessage : _handleUDPMessage
  //_extractip_port   : _extractip_port
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

      if(message.r.values && message.r.token) {
        var values = message.r.values;
        for (var i = 0; i < values.length; i++) {
          var value = values[i];
          var addr = crypto.bytesToHex(value.slice(0, ADDR_SIZE));
          var port = crypto.bytesToHex(value.slice(ADDR_SIZE, ADDR_SIZE + PORT_SIZE));

          port = parseInt(port, 16);

          var ip = [];
          for (var j = 0; j < addr.length; j+=2) {
            ip.push(parseInt(addr.substr(j,2), 16));
          }
          addr = ip.join('.');

          values[i] = addr + ':' + port;
        }
        RPC_result.value = values.join('-');
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
      RPC = jsonrpc.buildRequest(RPC_method, [RPC_param], RPC_id);
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
      request.a.id =  new Buffer(crypto.hexToAscii(rpc.getParams(0).id), 'ascii');

      switch(rpc.getMethod()) {
        case 'FIND_NODE':
          request.q = 'find_node';
          request.a.target = new Buffer(crypto.hexToAscii(rpc.getParams(0).target), 'ascii');
          break;

        case 'FIND_VALUE':
          request.q = 'get_peers';
          request.a.info_hash = new Buffer(crypto.hexToAscii(rpc.getParams(0).value), 'ascii');
          break;

        case 'PING':
          request.q = 'ping';
          break;
      }

      encoded = bencode.encode(request, 'ascii');
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