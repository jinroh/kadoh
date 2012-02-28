/**
 * Implementation of the JSON RPC v2.0 protocol.
 * 
 * @namespace <i>Namespace </i> : KadOH.protocol.jsonrpc2
 * @name jsonrpc2
 */

// Dep: [KadOH]/globals
(function(exports) {
  
  var KadOH = exports,
      RPCS;
  
  try {
    RPCS = KadOH.globals.RPCS;
  } catch(e) {}
  
  KadOH.rpc = KadOH.rpc || {};
  KadOH.rpc.protocol = KadOH.rpc.protocol || {};
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
  * Parse a given rawdata of JSON (as Object) and return an RPCMessage object. 
  * If Errors occurs, RPCError is throwed.
  * @memberOf jsonrpc2
  * @param {Object} raw data to parse
  * @return {RPCMessage} The resulted RPCMessage
  * @throws {RPCError}  Information about error occured
  */
  var parseRPCMessage = function(raw) {
    var obj = {};

    if (typeof raw === 'string') {
      raw = JSON.parse(raw);
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
    obj.jsonrpc = raw.jsonrpc;
    
    // Request
    if (raw.method) {
      if (raw.error || raw.result || typeof raw.method !== 'string')
        throw new RPCError(-32600, null, {id : obj.id});
      
      var method = raw.method.toUpperCase();
      if (RPCS && RPCS.indexOf(method) === -1)
        throw new RPCError(-32601, null, {id : obj.id});
      obj.method = method;
      
      if (raw.params && !Array.isArray(raw.params))
        throw new RPCError(-32602, null, {id : obj.id});
      obj.params = raw.params || [];
    }
    
    // Response
    else if (raw.result) {
      if (raw.error)
        throw new RPCError(-32600, null, {id : obj.id});
      obj.result = raw.result;
    }
    
    // Errorresponse
    else if (raw.error) {
      obj.error = new RPCError(
        raw.error.code,
        raw.error.message,
        raw.error.data ? (raw.error.data.id = obj.id) : {id : obj.id}
      );
    }

    else {
      throw new RPCError(-32600, null, {id : obj.id});
    }

    return new RPCMessage(obj);
  };
  
  //
  // RPC Message builder
  //
  /**
   *  Build a request.
   *  
   * @memberOf jsonrpc2
   * @param {String} Method name
   * @param {Array || Object} Parameters of the mehod
   * @param {String} [id] RPCid of the request. Can be set later.
   * @return {RPCMessage} The resulted RPCMessage
   */
  var buildRequest = function(methodname, params, id) {
    var obj ={};
    obj.jsonrpc = '2.0';
    obj.method  = methodname;
    obj.params  = params;
    if (id) obj.id = String(id);
    
    return new RPCMessage(obj);
  };
  
  /**
   * Build a response.
   * 
   * @memberOf jsonrpc2
   * @param The result of the RPC
   * @param {String} [id] RPCid of the request. Can be set later.
   * @return {RPCMessage} The resulted RPCMessage
   */
  var buildResponse = function(result, id) {
    var obj ={};
    obj.jsonrpc  = '2.0';
    obj.result   = result;
    if (id) obj.id = String(id);
    
    return new RPCMessage(obj);
  };
  
  /**
   *  Build an error response.
   *  
   * @memberOf jsonrpc2
   * @param {Object|RPCError} The error object to transmit
   * @param {String} [id=RPCError.getRPCID()] RPCid of the request. If not, defined try to extract RPCID from error object.
   * @return {RPCMessage} The resulted RPCMessage
   */
  var buildErrorResponse = function(error, id) {
    var obj = {};
    obj.jsonrpc  = '2.0';
    obj.error   = error;
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
  
  /**
   * Build an internal RPC error. Use it when bad things occurs localy when resolving a RPC and you want to notify the caller.
   * 
   * @memberOf jsonrpc2
   * @param {Object} [data] Complement data to trnasmit
   * @return {RPCError} The resulting RPCError
   */
  var buildInternalRPCError = function(data) {
    return new RPCError(-32603, undefined, data); 
  };

  /**
   * A RPC message object.
   * 
   * @name RPCMessage
   * @class <i>Namespace</i> : KadOH.protocol.jsonrpc2._RPCMessage
   * @param {object} Raw parsed JSON RPC message object.
   */  
  var RPCMessage = function(obj) { _clone(this, obj);                       };

  RPCMessage.prototype =  {
    /**
     * Setter for the RPC ID.
     * @param {String} id The id to set
     * @return {RPCMessage} Chainable object.
     */
    setRPCID  : function(id) {
      this.id = String(id);
      return this;
    },
    /**
     * Getter for the RPC ID.
     * @public
     * @return {String} RPC ID.
     */
    getRPCID  : function() {  return this.id;       },
    /**
     * @public
     * @return {Boolean} True if RPCMessage is a response.
     */
    isResponse: function() {  return !!this.result; },
    /**
     * @public
     * @return {Object|String|Number} The result of the RPC reponse message.
     */
    getResult : function() {  return this.result;   },
    /**
     * @public
     * @return {Boolean} True if RPC message is a request.
     */
    isRequest : function() {  return !!this.method; },
    /**
     * @public
     * @return {String} Method invoked by the RPC message.
     */
    getMethod : function() {  return this.method;   },
    /**
     * @public
     * @return {*} Return the parameters passed in a RPC message.
     */
    getParams : function(i) {
      if (typeof i === 'number') {
        return this.params[i];
      }
      return this.params;
    },
    /**
     * @public
     * @return {Boolean} True if RPCMessage is an error message.
     */
    isError   : function() {  return !!this.error;  },
    /**
     * @public
     * @return {Object} The error object contained in message.
     */
    getError  : function() {  return this.error;    },
    /**
     * @public
     * @return {'response'|'request'|'error'} Type of RPCMessage
     */
    getType   : function() {  if (this.isResponse()) return 'response';
                              if (this.isRequest())  return 'request';
                              if (this.isError())    return 'error';         },
    /**
     * @public
     * @return {Object} Raw rpc message object.
     */
    stringify : function() {  return _clone({}, this);                      }
  };

  /**
   * RPC error object.
   * In the data arguments object, it can be passed as property the ID of the related RPCMessage.
   * 
   * @name RPCError
   * @class <i>Namespace</i> : KadOH.protocol.jsonrpc2._RPCMessage
   * @param {Number} code    JSON RPC error code.
   * @param {String} [message] Description of the error.
   * @param {Object} [data]    Optionnal complementary data about error.
   */
  var RPCError = function(code, message, data) {
    this.code    = code;
    this.message = message ? message :
                           (JSONRPC_ERROR_STRINGS[code] ? JSONRPC_ERROR_STRINGS[code] : '');
    if (data)
      this.data = data;
  };

  RPCError.prototype = {
    /**
     * @return {Boolean} True if a id is present in the data object.
     */
    hasRPCID : function() {
      return (this.data && this.data.id);
    },
    /**
     * @return {String} The RPC id in the data object.
     */
    getRPCID : function() {
      if (this.hasRPCID()) return this.data.id;
    },
    /**
     * @return {Object} Raw error message object.
     */
    stringify : function() {
      return _clone({}, this);
    }
  };

  //
  // API
  //
  KadOH.rpc.protocol.jsonrpc2 = {
    parseRPCMessage        : parseRPCMessage,
    buildErrorResponse     : buildErrorResponse,
    buildResponse          : buildResponse,
    buildRequest           : buildRequest,
    buildInternalRPCError  : buildInternalRPCError,
    RPCMessage             : RPCMessage,
    RPCError               : RPCError,
    JSONRPC_ERROR_STRINGS  : JSONRPC_ERROR_STRINGS
  };

  //
  // Util
  //
  var _clone = function(clone, obj) {
    if (null === obj || 'object' !== typeof obj)
      return {};
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) clone[attr] = obj[attr];
    }
    return clone;
  };

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
