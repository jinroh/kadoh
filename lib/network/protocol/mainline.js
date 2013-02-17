Buffer = Buffer || require('buffer').Buffer;
var bencode = require('bncode');

var NODE_SIZE = 20;
var ADDR_SIZE = 4;
var PORT_SIZE = 2;
var COMPACT_NODE_SIZE = NODE_SIZE + ADDR_SIZE + PORT_SIZE;

function mapObject(obj, method) {
  var clone = {};
  for (var param in obj) {
    if (obj.hasOwnProperty(param)) {
      clone[param] = method(param, obj[param]);
    }
  }
  return clone;
}

function uncompactParam(name, value) {
  switch (name) {
    case 'nodes':
      return uncompacts(value);
    case 'values':
      return value.map(uncompactAddr);
    default:
      if (value instanceof Buffer) {
        return value.toString('hex');
      } else {
        return value;
      }
  }
}

function compactParam(name, value) {
  switch (name) {
    case 'nodes':
      return compacts(value);
    case 'values':
      return value.map(compactAddr);
    default:
      return new Buffer(value || '', 'hex');
  }
}

function compacts(nodes) {
  var target = new Buffer(nodes.length * COMPACT_NODE_SIZE);
  var offset = 0;
  nodes.map(function(node, index) {
    compact(node).copy(target, offset);
    offset += COMPACT_NODE_SIZE;
  });
  return target;
}

function compact(node) {
  var buf = new Buffer(COMPACT_NODE_SIZE);
  buf.write(node[1], 0, NODE_SIZE, 'hex');
  compactAddr(node[0]).copy(buf, NODE_SIZE);
  return buf;
}

function compactAddr(addr) {
  addr = addr.split(':');
  var buf = new Buffer(ADDR_SIZE + PORT_SIZE);
  var ip = addr[0].split('.');
  for (var i = 0, l = ip.length; i < l; i++) {
    buf.writeUInt8(parseInt(ip[i], 10), i);
  }
  buf.writeUInt16BE(parseInt(addr[1], 10), i);
  return buf;
}

function uncompacts(buf) {
  var results = [];
  var l = buf.length;
  for(var off = 0;
          off + COMPACT_NODE_SIZE <= l;
          off += COMPACT_NODE_SIZE) {
    results.push(uncompact(buf.slice(off, off + COMPACT_NODE_SIZE)));
  }
  return results;
}

function uncompact(buf) {
  var id = buf.toString('hex', 0, NODE_SIZE);
  var ip = uncompactAddr(buf.slice(NODE_SIZE, COMPACT_NODE_SIZE));
  return [ip, id];
}

function uncompactAddr(buf) {
  var ip = [];
  var port = buf.readUInt16BE(ADDR_SIZE);
  for (var i = 0; i < ADDR_SIZE; i++) {
    ip.push(buf.readUInt8(i));
  }
  return ip.join('.') + ':' + port;
}

exports.decode = function(buffer) {
  var rpc = {};
  var message = bencode.decode(buffer);
  rpc.id = message.t.toString();
  switch (message.y.toString()) {
    case 'q':
      rpc.type = 'request';
      rpc.method = message.q.toString().toUpperCase();
      rpc.params = [mapObject(message.a, uncompactParam)];
      break;
    case 'r':
      rpc.type = 'response';
      rpc.result = mapObject(message.r, uncompactParam);
      break;
    case 'e':
      rpc.type = 'error';
      rpc.error = {};
      rpc.error = message.e[1];
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
      encoded.q = rpc.method.toLowerCase();
      encoded.a = mapObject(rpc.params[0], compactParam);
      break;
    case 'response' :
      encoded.y = 'r';
      encoded.r = mapObject(rpc.result, compactParam);
      break;
    case 'error':
      encoded.e = [201, rpc.error];
      break;
    default:
      throw new Error('Mainline encoding: not rpc type');
  }
  return bencode.encode(encoded);
};