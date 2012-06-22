var El = require('ltx').Element;
var util = require('util');

// Greatly inspired from :
// Some easier XML-RPC methods for Mozilla.
// 12/7/2005, 26/12/2005, 6/1/2006 David Murray.
// http://deepestsender.mozdev.org/
// v0.3
// @see http://code.google.com/p/qpanel/source/browse/trunk/src/client/lib/xmlrpc.js

var _convertToXML = function(obj) {
  var xml = new El('value') ;
  var findtype = new RegExp('function (.*?)\\(\\) \\{.*');
  var value, numtype;
  switch (findtype.exec(obj.constructor.toString())[1]) {
    case 'Number':
      numtype = (Math.floor(obj) !== obj) ? "double" : "i4";
      xml.c(numtype).t(obj.toString());
      break;
    case 'String':
      xml.c("string").t(obj);
      break;
    case 'Boolean':
      xml.c("boolean").t((obj*1).toString());
      break;
    case 'Object':
      var struct = xml.c("struct");
      for (var key in obj) {
        if (obj.hasOwnProperty(key) && typeof(obj[key]) !== "function") {
          var member = struct.c("member");
          member.c("name").t(key);
          member.cnode(_convertToXML(obj[key]));
        }
      }
      break;
    case 'Date':
      var datetext = obj.getFullYear() +
                     this._padNumber(obj.getMonth()+1) +
                     this._padNumber(obj.getDate())    + "T" +
                     this._padNumber(obj.getHours())   + ":" +
                     this._padNumber(obj.getMinutes()) + ":" +
                     this._padNumber(obj.getSeconds());
      xml.c("dateTime.iso8601").t(datetext);
      break;
    case 'Array':
      var data = xml.c("array").c("data");
      for (key in obj) {
        if (obj.hasOwnProperty(key) && typeof(obj[key]) !== "function") {
          data.cnode(_convertToXML(obj[key]));
        }
      }
      break;
    default:
      // Hellishly awful binary encoding shit goes here.
      // GZiped base64
      // @TODO
      break;
  }
  return xml.tree();
};

var _padNumber = function(num) {
  if (num < 10) {
    num = '0' + num;
  }
  return num;
};

// var _removeWhiteSpace = function(node) {
//   var notWhitespace = /\S/;
//   for (var x = 0; x < node.childNodes.length; x++) {
//     var childNode = node.childNodes[x];
//     if ((childNode.nodeType === 3) && (!notWhitespace.test(childNode.textContent))) {
//       // that is, if it's a whitespace text node
//       node.removeChild(node.childNodes[x]);
//       x--;
//     }
//     if (childNode.nodeType === 1) {
//       // elements can have text child nodes of their own
//       _removeWhiteSpace(childNode);
//     }
//   }
// };

var _convertFromXML = function(obj) {
  if (!obj)
    return null;

  var data;
  var tag = obj.getName().toLowerCase();

  try {
    switch (tag) {
      case "value":
        return _convertFromXML(obj.children[0]);
      case "double":
      case "i4":
      case "int":
        var number = obj.getText();
        data = number * 1;
        break;
      case "boolean":
        var bool = obj.getText();
        data = (bool === "1" || bool === "true") ? true : false;
        break;
      case "datetime.iso8601":
        var date = obj.getText();
        data = new Date();
        data.setFullYear(date.substring(0,4), date.substring(4,6) - 1, date.substring(6,8));
        data.setHours(date.substring(9,11), date.substring(12,14), date.substring(15,17));
        break;
      case "array":
        data = [];
        var datatag = obj.children[0];
        for (var k = 0; k < datatag.children.length; k++) {
          var value = datatag.children[k];
          data.push(_convertFromXML(value.children[0]));
        }
        break;
      case "struct":
        data = {};
        for (var j = 0; j < obj.children.length; j++) {
          var membername  = obj.children[j].getChild("name").getText();
          var membervalue = obj.children[j].getChild("value").children[0];
          data[membername] = membervalue ? _convertFromXML(membervalue) : null;
        }
        break;
      case "string":
        data = obj.getText();
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
        rpc.params.push(_convertFromXML(params[i].children[0]));
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
      rpc.result = _convertFromXML(result.children[0].children[0]);
    }
    // Error
    else if (tag === "fault") {
      rpc.type  = 'error';
      rpc.error = _convertFromXML(result.children[0]).message;
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
    xml_params.c('param').cnode(_convertToXML(rpc.params[i]));
  }

  return xml.tree();
};

var _encodeResponse = function(rpc) {
  var xml = new El('methodResponse');
  xml.c('params').c('param').cnode(_convertToXML(rpc.result));

  return xml.tree();
};

var _encodeError = function(rpc) {
  var xml = new El('methodResponse');
  xml.c('fault').cnode(_convertToXML({
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