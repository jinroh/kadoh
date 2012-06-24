var util = require('util');

// Greatly inspired from :
// Some easier XML-RPC methods for Mozilla.
// 12/7/2005, 26/12/2005, 6/1/2006 David Murray.
// http://deepestsender.mozdev.org/
// v0.3
// @see http://code.google.com/p/qpanel/source/browse/trunk/src/client/lib/xmlrpc.js

var _convertToEmbededJson = function(obj) {
  var xml = document.implementation.createDocument('', 'value', null);
  var string = xml.documentElement.appendChild(xml.createElement('string'));
  
  string.appendChild(xml.createTextNode(JSON.stringify(obj)));
  return xml.documentElement;
};

var _convertFromEmbededJson = function(obj) {
  if (!obj)
    return null;

  return JSON.parse(obj.textContent);
};

 var _decodeRequestMessage = function(iq) {
  var rpc = {};
  rpc.id  = iq.getAttribute("id") || null;

  // Method name
  var method = iq.getElementsByTagName("methodName")[0];
  rpc.method = method ? method.textContent : null;
  rpc.type = 'request';

  // Parameters
  rpc.params = null;
  try {
    var params = iq.getElementsByTagName("params")[0]
                   .childNodes;
    if (params && params.length > 0) {
      rpc.params = [];
      for (var i = 0; i < params.length; i++) {
        rpc.params.push(_convertFromEmbededJson(params[i].firstChild));
      }
    }
  } catch(e) {
    throw new RPCError(-32600, null, {id : rpc.id});
  }
  return rpc;
};

var _decodeResponseMessage = function(iq) {
  var rpc = {};
  rpc.id  = iq.getAttribute("id") || null;

  try {
    var result = iq.getElementsByTagName("methodResponse")[0].firstChild;

    // Response
    var tag = result.tagName;
    if (tag === "params") {
      rpc.type = 'response';
      rpc.result = _convertFromEmbededJson(result.firstChild.firstChild);
    }
    // Error
    else if (tag === "fault") {
      rpc.type = 'error';
      rpc.error = _convertFromEmbededJson(result.firstChild).message;
    }
  } catch(e) {
    throw new RPCError(-32600, null, {id : rpc.id});
  }
  return rpc;
};

/**
 * Decode a XML-RPC encoded rpc.
 *
 * @param  {DomElement|String} iq
 * @return {Object}   normalized rpc object
 */
exports.decode = function(iq) {
  if (typeof iq === 'string') {
    try {
      var parser = new DOMParser();
      var doc    = parser.parseFromString(iq, 'text/xml');
      _removeWhiteSpace(doc);
      iq = doc.documentElement;
      if (iq.tagName == "parsererror") {
        throw new RPCError(-32600, null, {});
      }
    } catch(e) {
      throw new RPCError(-32600, null, {});
    }
  }
  var type = iq.getAttribute('type');
  if (type === 'set') {
    return _decodeRequestMessage(iq);
  } else if (type === 'result') {
    return _decodeResponseMessage(iq);
  } else {
    throw new RPCError(-32600, null, {id : iq.getAttribute('id')});
  }
};

/**
 * Encode the given normalized rpc object into an XML-rpc
 * encoded rpc object.
 *
 * @param  {Object} rpc - normalized rpc object
 * @return {DomElement}   encoded rpc
 */
exports.encode = function(rpc) {
  switch(rpc.type) {
    case 'request' :
      return _encodeRequest(rpc);
    case 'response' :
      return _encodeResponse(rpc);
    case 'error' :
      return _encodeError(rpc);
    default:
      throw new Error('No rpc type during encoding');
  }
};

var _encodeRequest = function(rpc) {
  var xml = document.implementation.createDocument('', 'methodCall', null);
  xml.documentElement.appendChild(xml.createElement('methodName'))
                     .appendChild(xml.createTextNode(rpc.method));
  
  var xmlparams = xml.documentElement.appendChild(xml.createElement('params'));
  for (var i = 0; i < rpc.params.length; i++) {
    xmlparams.appendChild(xml.createElement('param'))
             .appendChild(_convertToEmbededJson(rpc.params[i]));
  }
  
  return xml.documentElement;
};

var _encodeResponse = function(rpc) {
  var xml = document.implementation.createDocument('', 'methodResponse', null);
  xml.documentElement.appendChild(xml.createElement('params'))
                     .appendChild(xml.createElement('param'))
                     .appendChild(_convertToEmbededJson(rpc.result));

  return xml.documentElement;
};

var _encodeError = function(rpc) {
  var xml = document.implementation.createDocument('', 'methodResponse', null);
  xml.documentElement.appendChild(xml.createElement('fault'))
                     .appendChild(_convertToEmbededJson({
                       faultCode: "-32603",
                       faultString: rpc.error
                     }));

  return  xml.documentElement;
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