Buffer = Buffer || require('buffer').Buffer;
var util = require('util');
var bencode = require('bncode');

var NODE_SIZE = 20;
var ADDR_SIZE = 4;
var PORT_SIZE = 2;
var COMPACT_NODE_SIZE = NODE_SIZE + ADDR_SIZE + PORT_SIZE;


exports.decode = function(buffer) {
  var rpc = {};
  var message = bencode.decode(buffer);

  rpc.id = message.t.toString();

  switch(message.y.toString()) {

    case 'q':
      rpc.type = 'request';
      var param = {};

      param.id = message.a.id.toString('hex');

      switch(message.q.toString()) {
        case 'find_node':
          rpc.method = 'FIND_NODE';
          param.target = message.a.target.toString('hex');
          break;

        case 'ping':
          rpc.method = 'PING';
          break;

        default:
          throw new Error('Decoding mainline : method not supported.');
        }

      rpc.params = [param];
      break;

    case 'r':
      rpc.type = 'response';
      rpc.result = {};

      rpc.result.id = message.r.id.toString('hex');

      var i, addr, port, ip;

      if(message.r.nodes) {
        //extract the nodes in answer
        var nodes = message.r.nodes;
        var result = [];
        for(var off = 0;
                off + COMPACT_NODE_SIZE <= nodes.length;
                off += COMPACT_NODE_SIZE) {
          var node = nodes.slice(off, off + NODE_SIZE).toString('hex');
          addr = nodes.slice(off + NODE_SIZE, off + NODE_SIZE + ADDR_SIZE).toString('hex');
          port = nodes.slice(off + NODE_SIZE + ADDR_SIZE, off + NODE_SIZE + ADDR_SIZE + PORT_SIZE).toString('hex');

          port = parseInt(port, 16);

          ip = [];
          for (i = 0; i < addr.length; i+=2) {
            ip.push(parseInt(addr.substr(i,2), 16));
          }
          ip = ip.join('.');
          result.push([ip+':'+port, node]);

          rpc.result.nodes = result;
        }
      }
      if(message.r.values && message.r.token) {
        var values = message.r.values;
        for (i = 0; i < values.length; i++) {
          var value = values[i];
          addr = value.slice(0, ADDR_SIZE).toString('hex');
          port = value.slice(ADDR_SIZE, ADDR_SIZE + PORT_SIZE).toString('hex');

          port = parseInt(port, 16);

          ip = [];
          for (var j = 0; j < addr.length; j+=2) {
            ip.push(parseInt(addr.substr(j,2), 16));
          }
          addr = ip.join('.');

          values[i] = addr + ':' + port;
        }
        rpc.result.value = JSON.stringify(values);
      }
      break;

    case 'e':
      rpc.type = 'error';
      rpc.error = {};
      rpc.error.code = message.e[0];
      rpc.error.message = message.e[1];
      break;

    default:
      throw new Error('Decoding mainline: unknown RPC type');
  }

  return rpc;
};

exports.encode = function(rpc) {
  var encoded = {};
  
  encoded.t = rpc.id;

  switch(rpc.type) {

    case 'request' :
    encoded.y = 'q';
    encoded.a = {};
    encoded.a.id = new Buffer(rpc.params[0].id, 'hex');

    switch(rpc.method) {
      case 'FIND_NODE':
        encoded.q = 'find_node';
        encoded.a.target = new Buffer(rpc.params[0].target, 'hex');
        break;

      case 'FIND_VALUE':
        encoded.q = 'get_peers';
        encoded.a.info_hash = new Buffer(rpc.params[0].target, 'hex');
        break;

      case 'PING':
        encoded.q = 'ping';
        break;
    }
    break;

    case 'response' :
    encoded.y = 'r';
    encoded.r = {};
    encoded.r.id = new Buffer(rpc.result.id, 'hex');

    if(rpc.result.nodes) {

      var buffers = rpc.result.nodes.map(function(node) {
        var ip = node[0].split(':')[0]
                  .split('.')
                  .map(function(integer) {return parseInt(integer, 10);});
        var ip_buf = new Buffer(ip);

        var port = parseInt(node[0].split(':')[1],10);
        var port_buf = new Buffer([port>>8, port]);

        var id = node[1];
        var id_buf = new Buffer(id, 'hex');
        
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
      encoded.r.nodes = nodes_buffer;
    }
    break;

    case 'error':
    encoded.e = [paeseInt(rpc.error.code, 10), rpc.error.message];
    break;

    default:
      throw new Error('Mainline encoding: not rpc type');
  }

  return bencode.encode(encoded);
};