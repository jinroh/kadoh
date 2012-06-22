var util = require('util');

// Greatly inspired from :
// Some easier XML-RPC methods for Mozilla.
// 12/7/2005, 26/12/2005, 6/1/2006 David Murray.
// http://deepestsender.mozdev.org/
// v0.3
// @see http://code.google.com/p/qpanel/source/browse/trunk/src/client/lib/xmlrpc.js

var _convertToXML = function(obj) {
  var xml = document.implementation.createDocument('', 'value', null);
  var findtype = new RegExp('function (.*?)\\(\\) \\{.*');
  var value, numtype;
  switch (findtype.exec(obj.constructor.toString())[1]) {
    case 'Number':
      // Numbers can only be sent as integers or doubles.
      if (Math.floor(obj) !== obj) {
        numtype = xml.createElement('double');
      } else {
        numtype = xml.createElement('i4');
      }
      var number = xml.documentElement.appendChild(numtype);
      number.appendChild(xml.createTextNode(obj));
      break;
    case 'String':
      var string = xml.documentElement.appendChild(xml.createElement('string'));
      string.appendChild(xml.createTextNode(obj));
      break;
    case 'Boolean':
      var bool = xml.documentElement.appendChild(xml.createElement('boolean'));
      bool.appendChild(xml.createTextNode(obj * 1));
      break;
    case 'Object':
      var struct = xml.documentElement.appendChild(xml.createElement('struct'));
      for (var w in obj) {
        if(obj[y] && typeof obj[y] === 'function')
          continue;
        var member = struct.appendChild(xml.createElement('member'));
        member.appendChild(xml.createElement('name'))
              .appendChild(xml.createTextNode(w));
        member.appendChild(_convertToXML(obj[w]));
      }
      break;
    case 'Date':
      var datetext = obj.getFullYear() + _padNumber(obj.getMonth() + 1) + _padNumber(obj.getDate()) + 'T' + _padNumber(obj.getHours()) + ':' + _padNumber(obj.getMinutes()) + ':' + _padNumber(obj.getSeconds());
      xml.documentElement.appendChild(xml.createElement('dateTime.iso8601'))
         .appendChild(xml.createTextNode(datetext));
      break;
    case 'Array':
      var array = xml.documentElement.appendChild(xml.createElement('array'));
      var data = array.appendChild(xml.createElement('data'));
      for (var y in obj) {
        if(typeof obj[y] === 'function')
          continue;
        value = data.appendChild(xml.createElement('value'));
        value.appendChild(_convertToXML(obj[y]));
      }
      break;
    default:
      // Hellishly awful binary encoding shit goes here.
      // GZiped base64
      // @TODO
      break;
  }
  return xml.documentElement;
};

var _padNumber = function(num) {
  if (num < 10) {
    num = '0' + num;
  }
  return num;
};

var _removeWhiteSpace = function(node) {
  var notWhitespace = /\S/;
  for (var x = 0; x < node.childNodes.length; x++) {
    var childNode = node.childNodes[x];
    if ((childNode.nodeType === 3) && (!notWhitespace.test(childNode.textContent))) {
      // that is, if it's a whitespace text node
      node.removeChild(node.childNodes[x]);
      x--;
    }
    if (childNode.nodeType === 1) {
      // elements can have text child nodes of their own
      _removeWhiteSpace(childNode);
    }
  }
};

var _convertFromXML = function(obj) {
  if (!obj)
    return null;

  var data;
  var tag = obj.tagName.toLowerCase();

  try {
    switch (tag) {
      case "value":
        return _convertFromXML(obj.firstChild);
      case "double":
      case "i4":
      case "int":
        var number = obj.textContent;
        data = number * 1;
        break;
      case "boolean":
        var bool = obj.textContent;
        data = (bool === "1" || bool === "true") ? true : false;
        break;
      case "datetime.iso8601":
        var date = obj.textContent;
        data = new Date();
        data.setFullYear(date.substring(0,4), date.substring(4,6) - 1, date.substring(6,8));
        data.setHours(date.substring(9,11), date.substring(12,14), date.substring(15,17));
        break;
      case "array":
        data = [];
        var datatag = obj.firstChild;
        for (var k = 0; k < datatag.childNodes.length; k++) {
          var value = datatag.childNodes[k];
          data.push(_convertFromXML(value.firstChild));
        }
        break;
      case "struct":
        data = {};
        for (var j = 0; j < obj.childNodes.length; j++) {
          var membername  = obj.childNodes[j].getElementsByTagName("name")[0].textContent;
          var membervalue = obj.childNodes[j].getElementsByTagName("value")[0].firstChild;
          data[membername] = membervalue ? _convertFromXML(membervalue) : null;
        }
        break;
      case "string":
        data = obj.textContent;
        break;
      default:
        data = null;
        break;
    }
  } catch(e) {
    data = null;
  }
  return data;
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
        rpc.params.push(_convertFromXML(params[i].firstChild));
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
      rpc.result = _convertFromXML(result.firstChild.firstChild);
    }
    // Error
    else if (tag === "fault") {
      rpc.type = 'error';
      rpc.error = _convertFromXML(result.firstChild).message;
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
             .appendChild(_convertToXML(rpc.params[i]));
  }
  
  return xml.documentElement;
};

var _encodeResponse = function(rpc) {
  var xml = document.implementation.createDocument('', 'methodResponse', null);
  xml.documentElement.appendChild(xml.createElement('params'))
                     .appendChild(xml.createElement('param'))
                     .appendChild(_convertToXML(rpc.result));

  return xml.documentElement;
};

var _encodeError = function(rpc) {
  var xml = document.implementation.createDocument('', 'methodResponse', null);
  xml.documentElement.appendChild(xml.createElement('fault'))
                     .appendChild(_convertToXML({
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