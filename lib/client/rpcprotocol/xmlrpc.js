// Greatly inspired from :
// Some easier XML-RPC methods for Mozilla.
// 12/7/2005, 26/12/2005, 6/1/2006 David Murray.
// http://deepestsender.mozdev.org/
// v0.3
// @see http://code.google.com/p/qpanel/source/browse/trunk/src/client/lib/xmlrpc.js

// Dep: [KadOH]/globals

(function(exports) {
  
  var KadOH = exports;

  var XMLRPC_ERROR_STRINGS = {
    '-32700' : 'Parse error.',
    '-32600' : 'Invalid Request.',
    '-32601' : 'Method not found.',
    '-32602' : 'Invalid params.',
    '-32603' : 'Internal error.'
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
    var data;
    var tag = obj.tagName;

    if (!obj || 'string' !== typeof tag)
      return null;

    switch (tag) {
      case 'value':
        return _convertFromXML(obj.firstChild);
      case 'double':
      case 'i4':
      case 'int':
        var number = obj.textContent;
        data = number * 1;
        break;
      case 'boolean':
        var bool = obj.textContent;
        if ((bool === 'true') || (bool === '1')) {
          data = true;
        } else {
          data = false;
        }
        break;
      case 'dateTime.iso8601':
        var date = obj.textContent;
        data = new Date();
        data.setFullYear(date.substring(0,4), date.substring(4,6) - 1, date.substring(6,8));
        data.setHours(date.substring(9,11), date.substring(12,14), date.substring(15,17));
        break;
      case 'array':
        data = [];
        var datatag = obj.firstChild;
        for (var k = 0; k < datatag.childNodes.length; k++) {
          var value = datatag.childNodes[k];
          data.push(_convertFromXML(value.firstChild));
        }
        break;
      case 'struct':
        data = {};
        for (var j = 0; j < obj.childNodes.length; j++) {
          var membername = obj.childNodes[j].getElementsByTagName('name')[0].textContent;
          var membervalue = obj.childNodes[j].getElementsByTagName('value')[0].firstChild;
          if (membervalue) {
            data[membername] = _convertFromXML(membervalue);
          } else {
            data[membername] = null;
          }
        }
        break;
      default:
      case 'string':
        data = obj.textContent;
        break;
    }
    return data;
  };

  var parseRPCMessage = function(raw) {
    var type = raw.getAttribute('type');
    var obj  = {};

    obj.id = raw.getAttribute('id') || null;

    if (type === 'set') {
      var method = raw.getElementsByTagName('methodName')[0];
      
      if (!method)
        throw new RPCError(-32600, null, {id : obj.id});
      
      var methodname = method.textContent;
      if (typeof RPCS !== 'undefined' && RPCS.indexOf(methodname) === -1)
        throw new RPCError(-32601, null, {id : obj.id});
      
      //OK
      obj.method = methodname;
      
      //validate params
      var params = raw.getElementsByTagName('params')[0];
      params = params ? params.getElementsByTagName('param') : null;
      if (params && params.length > 0) {
        obj.params = [];
        var param;
        for (var i = 0; i < params.length; i++) {
          param = _convertFromXML(params[i].firstChild);
          if (param)
            obj.params.push(param);
        }
      } else {
        obj.params = [];
      }
      return new RPCMessage(obj);
    }
    else if (type === 'result') {
      var result = raw.getElementsByTagName('methodResponse')[0].firstChild;
      var value  = result.firstChild;
      if (result.tagName === 'params') {
        obj.result = value ? _convertFromXML(value) : null;
      }
      else if (result.tagName === 'fault') {
        var fault = _convertFromXML(result.firstChild);

        if (!fault || !fault.faultCode || !fault.faultString)
          throw new RPCError(-32600, null, {id : obj.id});
        
        obj.error = new RPCError(fault.faultCode, fault.faultString, {id : obj.id});
      }
      return new RPCMessage(obj);
    }
    else {
      throw new RPCError(-32600);
    }
  };

  var buildRequest = function(methodname, params, id) {
    obj = {};
    obj.method = methodname;
    obj.params = params;
    obj.id = id ? String(id) : undefined;
    
    return new RPCMessage(obj);
  };

  var buildResponse = function(result, id) {
    var obj = {};
    obj.result = result;
    obj.id = id ? String(id) : undefined;

    return new RPCMessage(obj);
  };

  var buildErrorResponse = function(error, id) {
    var obj = {};
    obj.error = error;
    if (id) {
      obj.id = String(id);
      if (typeof obj.error.data !== 'undefined')
        delete obj.error.data.id;
    } else {
      if (typeof error.hasRPCID !== 'undefined' && error.hasRPCID())
        obj.id = String(error.getRPCID());
    }
    return new RPCMessage(obj);
  };

  var buildInternalRPCError = function(data) {
    return new RPCError(-32603, undefined, data); 
  };

  /**
   * A RPC message object.
   * 
   * @name RPCMessage
   * @class <i>Namespace</i> : KadOH.protocol.xmlrpc._RPCMessage
   * @param {object} Raw parsed XML RPC message object.
   */  
  var RPCMessage = function(obj) {
    _clone(this, obj);
  };

  RPCMessage.prototype =  {
    /**
     * Setter for the RPC ID.
     * @param {String} id The id to set
     * @return {RPCMessage} Chainable object.
     */
    setRPCID  : function(id) {
      this.id = id ? String(id) : null;
      return this;
    },
    /**
     * Getter for the RPC ID.
     * @public
     * @return {String} RPC ID.
     */
    getRPCID  : function() {  return this.id;                               },
    /**
     * @public
     * @return {Boolean} True if RPCMessage is a response.
     */
    isResponse: function() {  return ('undefined' !== typeof this.result);  },
    /**
     * @public
     * @return {Object|String|Number} The result of the RPC reponse message.
     */
    getResult : function() {  return this.result;                           },
    /**
     * @public
     * @return {Boolean} True if RPC message is a request.
     */
    isRequest : function() {  return ('undefined' !== typeof this.method);  },
    /**
     * @public
     * @return {String} Method invoked by the RPC message.
     */
    getMethod : function() {  return this.method;                           },
    /**
     * @public
     * @return {*} Return the parameters passed in a RPC message.
     */
    getParams : function() {  return this.params;                           },
    /**
     * @public
     * @return {Boolean} True if RPCMessage is an error message.
     */
    isError   : function() {  return ('undefined' !== typeof this.error);   },
    /**
     * @public
     * @return {Object} The error object contained in message.
     */
    getError  : function() {  return this.error;                            },
    /**
     * @public
     * @return {'response'|'request'|'error'} Type of RPCMessage
     */
    getType   : function() {  if (this.isResponse()) return 'response';
                              if (this.isRequest())  return 'request';
                              if (this.isError())    return 'error';         }
  };

  /**
   * RPC error object.
   * In the data arguments object, it can be passed as property the ID of the related RPCMessage.
   * 
   * @name RPCError
   * @class <i>Namespace</i> : KadOH.protocol.xmlrpc._RPCMessage
   * @param {Number} code    XML RPC error code.
   * @param {String} [message] Description of the error.
   * @param {Object} [data]    Optionnal complementary data about error.
   */  
  var RPCError = function(code, message, data) {
    this.code =  code;
    this.message = message ? message : (XMLRPC_ERROR_STRINGS[code] ? XMLRPC_ERROR_STRINGS[code] : '');
    this.data = (data !== undefined && data !== null) ? data : undefined;
  };
  RPCError.prototype = {
    /**
     * @return {Boolean} True if a id is present in the data object.
     */
    hasRPCID : function() {
      return ('undefined' !== typeof this.data) && (('undefined' !== typeof this.data.id));
    },
    /**
     * @return {String} The RPC id in the data object.
     */
    getRPCID : function() {
      if (this.hasRPCID()) return this.data.id;
    }
  };

  KadOH.protocol = KadOH.protocol || {};
  KadOH.protocol.xmlrpc = {
    parseRPCMessage       : parseRPCMessage,
    buildRequest          : buildRequest,
    buildResponse         : buildResponse,
    buildErrorResponse    : buildErrorResponse,
    buildInternalRPCError : buildInternalRPCError, 
    RPCMessage            : RPCMessage,
    RPCError              : RPCError,
    XMLRPC_ERROR_STRINGS  : XMLRPC_ERROR_STRINGS
  };
  
  var _clone = function(clone, obj) {
    if (null === obj || 'object' !== typeof obj)
      return {};
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) clone[attr] = obj[attr];
    }
    return clone;
  };

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
