var util = require('util');

/**
 * Decode a JSON-RPC-2.0 encoded rpc object or stringified object.
 *
 * @throws {RPCError} If eeor durning decoding rpc
 *
 * @param  {Object|String} raw - rpc encoded to decode
 * @return {Object}   normalized rpc object
 */
exports.decode = function(raw) {
  var obj = {};

  try {
    raw = JSON.parse(raw);
  } catch (e) {
    throw new RPCError(-32700);
  }

  if (typeof raw !== 'object')
    throw new RPCError(-32600);

  // ID
  if (raw.id){
    if (typeof raw.id === 'number') {
      if (raw.id >>> 0 !== raw.id) //is a integer
        throw new RPCError(-32600);
    }
    else if (typeof raw.id !== 'string' && typeof raw.id === 'boolean')
      throw new RPCError(-32600);
    //OK
    obj.id = String(raw.id);
  }
  else {
    obj.id = null;
  }
  
  // jsonrpc version
  if (raw.jsonrpc !== '2.0')
    throw new RPCError(-32600, null, {id : obj.id});
  
  // Request
  if (raw.method) {
    if (raw.error || raw.result || typeof raw.method !== 'string')
      throw new RPCError(-32600, null, {id : obj.id});
    
    var method = raw.method.toUpperCase();
    obj.method = method;
    obj.type = 'request';
    
    if (raw.params && !Array.isArray(raw.params))
      throw new RPCError(-32602, null, {id : obj.id});
    obj.params = raw.params || [];
  }
  
  // Response
  else if (raw.result) {
    if (raw.error)
      throw new RPCError(-32600, null, {id : obj.id});
    obj.result = raw.result;
    obj.type = 'response';

  }
  
  // Errorresponse
  else if (raw.error) {
    obj.type = 'error';
    obj.error = raw.error.message;
  }

  else {
    throw new RPCError(-32600, null, {id : obj.id});
  }

  return obj;
};

/**
 * Encode the given normalized rpc object into a JSON-RPC-2.0
 * encoded rpc object.
 *
 * @param  {Object} rpc - normalyzed rpc object
 * @return {Object} ecoded rpc
 */
exports.encode = function(rpc) {
  var obj = {};
  obj.jsonrpc = '2.0';
  switch(rpc.type) {
    case 'request' :
      obj.method = rpc.method;
      obj.params = rpc.params;
      obj.id = rpc.id;
      break;
    case 'response' :
      obj.result = rpc.result;
      obj.id = rpc.id;
      break;
    case 'error' :
      obj.error = {
        message : rpc.error,
        code : "-32603"
      };
      if (rpc.id)
        obj.id = rpc.id;
      break;
    default:
      throw new Error('No rpc type during encoding');
  }
  return JSON.stringify(obj);
};

/**
 * JSONRPC 2 error code significations.
 */
var JSONRPC_ERROR_STRINGS = {
  "-32700" : "Parse error.",
  "-32600" : "Invalid Request.",
  "-32601" : "Method not found.",
  "-32602" : "Invalid params.",
  "-32603" : "Internal error."
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
  message = message ? message : (JSONRPC_ERROR_STRINGS[code] ? JSONRPC_ERROR_STRINGS[code] : '');

  Error.call(this,'['+code+'] '+ message);
  this.code    = code;
  this.message = message;

  if (data)
    this.data = data;
};

util.inherits(RPCError, Error);
exports.RPCError = RPCError;