var El = require('ltx').Element;
var util = require('util');

var _convertToEmbededJson = function(obj) {
  var xml = new El('value') ;
  xml.t(JSON.stringify(obj));
  return xml.tree();
};

var _convertFromEmbededJson = function(obj) {
  if (!obj)
    return null;

  return JSON.parse(obj.getText());
};

var _decodeRequestMessage = function(iq) {
  var rpc = {};
  rpc.id  = iq.attrs['id'] || null;
  rpc.type = 'request';

  // Method name
  var query = iq.children[0].getChild('methodCall');
  rpc.method = query.getChild('methodName') ? query.getChild('methodName').getText() : null;

  // Parameters
  rpc.params = null;
  try {
    var params = query.getChild("params")
                   .children;
    if (params && params.length > 0) {
      rpc.params = [];
      for (var i = 0; i < params.length; i++) {
        rpc.params.push(_convertFromEmbededJson(params[i].children[0]));
      }
    }
  } catch(e) {
    throw new RPCError(-32600, null, {id : rpc.id});
  }

  return rpc;
};

var _decodeResponseMessage = function(iq) {
  var rpc = {};
  rpc.id  = iq.attrs['id'] || null;

  try {
    var result = iq.children[0].getChild("methodResponse").children[0];

    // Response
    var tag = result.name;
    if (tag === "params") {
      rpc.type   = 'response';
      rpc.result = _convertFromEmbededJson(result.children[0].children[0]);
    }
    // Error
    else if (tag === "fault") {
      rpc.type  = 'error';
      rpc.error = _convertFromEmbededJson(result.children[0]).message;
    }
  } catch(e) {
    throw new RPCError(-32600, null, {id : rpc.id});
  }
  return rpc;
};

/**
 * Decode a XML-RPC encoded rpc.
 *
 * @param  {ltx element} iq
 * @return {Object}   normalized rpc object
 */

exports.decode = function(iq) {
  var type = iq.attrs['type'];
  if (type === 'set') {
    return _decodeRequestMessage(iq);
  } else if (type === 'result') {
    return _decodeResponseMessage(iq);
  } else {
    throw new RPCError(-32600, null, {id : iq.attrs['id']});
  }
};

/**
 * Encode the given normalized rpc object into an XML-rpc
 * encoded rpc object.
 *
 * @param  {Object} rpc - normalized rpc object
 * @return {ltx Element}   encoded rpc
 */

exports.encode = function(rpc) {
  switch(rpc.type) {
    case 'request' :
      var encode = _encodeRequest(rpc);
      return encode;
    case 'response' :
      return _encodeResponse(rpc);
    case 'error' :
      return _encodeError(rpc);
    default:
      throw new Error('No rpc type during encoding');
  }

};

var _encodeRequest = function(rpc) {
  var xml = new El('methodCall');
  xml.c('methodName').t(rpc.method);
  var xml_params = xml.c('params');

  for(var i=0; i<rpc.params.length; i++) {
    xml_params.c('param').cnode(_convertToEmbededJson(rpc.params[i]));
  }

  return xml.tree();
};

var _encodeResponse = function(rpc) {
  var xml = new El('methodResponse');
  xml.c('params').c('param').cnode(_convertToEmbededJson(rpc.result));

  return xml.tree();
};

var _encodeError = function(rpc) {
  var xml = new El('methodResponse');
  xml.c('fault').cnode(_convertToEmbededJson({
                       faultCode: '-32603',
                       faultString: rpc.error
                     }));
  return xml.tree();
};

var XMLRPC_ERROR_STRINGS = {
  '-32700' : 'Parse error.',
  '-32600' : 'Invalid Request.',
  '-32601' : 'Method not found.',
  '-32602' : 'Invalid params.',
  '-32603' : 'Internal error.'
};

/**
 * RPC error object.
 * In the data arguments object, it can be passed as property the ID of the related RPCMessage.
 * @extends {Error}
 *
 * @param {Number} code    JSON RPC error code.
 * @param {String} [message] Description of the error.
 * @param {Object} [data]    Optionnal complementary data about error.
 */
var RPCError = function(code, message, data) {
  message = message ? message : (XMLRPC_ERROR_STRINGS[code] ? XMLRPC_ERROR_STRINGS[code] : '');

  Error.call(this,'['+code+'] '+ message);
  this.code    = code;
  this.message = message;

  if (data)
    this.data = data;
};

util.inherits(RPCError, Error);
exports.RPCError = RPCError;