// Dep: [KadOH]/globals
(function(exports) {
  
  var KadOH = exports;
  KadOH.protocol = KadOH.protocol || {};
  RPCS = KadOH.globals._rpcs;
  
  var JSONRPC_ERROR_STRINGS = {
    "-32700" : "Parse error.",
    "-32600" : "Invalid Request.",
    "-32601" : "Method not found.",
    "-32602" : "Invalid params.",
    "-32603" : "Internal error."
  };
  
//RPC Message parser and valider
 /**
  * Parse a given rawdata of JSON and return an RPCMessage object. 
  * If Errors occurs, RPCError is throwed.
  * @param {ObjectData} raw datas to parse
  * @return {RPCMessage} The resulted RPCMessage
  * @throws {RPCError}  Information about error occured
  */
  var parseRPCMessage = function(raw) {
    var obj = {};
    try {
      //validate id
      if('undefined' !== typeof raw.id){
        if (typeof raw.id === "number") {
          if (raw.id >>> 0 !== raw.id) //is a integer
            throw new RPCError(-32600);
        }
        else if (typeof raw.id !== "string" && typeof raw.id === "boolean")
          throw new RPCError(-32600);
        //OK  
        obj.id = String(raw.id);
      } else {
        obj.id = null;
      }
      
      //validate jsonrpc version
      if (raw.jsonrpc !== "2.0")
        throw new RPCError(-32600, null, {id : obj.id});
      obj.jsonrpc = raw.jsonrpc;
      
      //validate a Request :
      if('undefined' !== typeof raw.method) {
        if('undefined' !== typeof raw.error || 'undefined' !== typeof raw.result)
          throw new RPCError(-32600, null, {id : obj.id});
        
        if (typeof raw.method !== "string" || raw.method.substring(0,4) === "rpc.")
            throw new RPCError(-32600, null, {id : obj.id});
        
        var method = raw.method.toUpperCase();
        if (RPCS.indexOf(method) === -1)
          throw new RPCError(-32601, null, {id : obj.id});
        
        //OK
        obj.method = method;
        
        //validate params
        if(typeof raw.params !== 'undefined' && raw.params !== null) {
          if(raw.params.constructor.toString().indexOf('Array') == -1) {
                    obj.params = [raw.params];
                  } else {
                    obj.params = raw.params;
                  }
        } else {
          obj.params = [];
        }   
        return new RPCMessage(obj);
      }
      
      //validate a Response
      if('undefined' !== typeof raw.result) {
        if('undefined' !== typeof raw.error || 'undefined' !== typeof raw.method)
          throw new RPCError(-32600, null, {id : obj.id});
          
        //OK  
        obj.result = raw.result;
        return new RPCMessage(obj);
      }
      
      //validate an Errorresponse
      if('undefined' !== typeof raw.error) {
        if('undefined' !== typeof raw.result || 'undefined' !== typeof raw.method)
          throw new RPCError(-32600, null, {id : obj.id});
          
        //OK  
        obj.error = new RPCError(raw.error.code, raw.error.message, raw.error.data? raw.error.data.id = obj.id : {id : obj.id});
        return new RPCMessage(obj);
      }
      
    
    } catch (e) {
      if('undefined' === typeof e.code) //throwed error is not a custom ours
        e = new RPCError(-32603, null, String(e));
        throw e;
    }
  };
  
  
//RPC Message builder
  /**
   *  Build a request.
   * 
   * @param {String} Method name
   * @param {Array} Parameters of the mehod
   * @param {String} [id] RPCid of the request. Can be set later.
   * @return {RPCMessage} The resulted RPCMessage
   */
  var buildRequest = function(methodname, tab_params, id) {
    var obj ={};
    obj.jsonrpc  = '2.0';
    obj.method   = methodname;
    obj.params   = tab_params;
    if(id) obj.id = String(id);
    
    return new RPCMessage(obj);
  };
  
  /**
   *  Build a response.
   * 
   * @param The result of the RPC
   * @param {String} [id] RPCid of the request. Can be set later.
   * @return {RPCMessage} The resulted RPCMessage
   */
  var buildResponse = function(result, id) {
    var obj ={};
    obj.jsonrpc  = '2.0';
    obj.result   = result;
    if(id) obj.id = String(id);
    
    return new RPCMessage(obj);
  };
  
  /**
   *  Build an error response.
   * 
   * @param {Object|RPCError} The error object to transmit
   * @param {String} [id=RPCError.getRPCID()] RPCid of the request. If not, defined try to extract RPCID from error object.
   * @return {RPCMessage} The resulted RPCMessage
   */
  var buildErrorResponse = function(error, id) {
    var obj = {};
    obj.jsonrpc  = '2.0';
    obj.error   = error;
    if(id) {
      obj.id = String(id);
      if(typeof obj.error.data !== 'undefined')
        delete obj.error.data.id;
      } else {
        if(typeof error.hasRPCID !== 'undefined' && error.hasRPCID())
          obj.id = String(error.getRPCID());
      }
    return new RPCMessage(obj);
  };
  
  /**
   *  Build an internal RPC error. Use it when bad things occurs localy when resolving a RPC and you want to notify the caller.
   * 
   * @param {Object} [data] Complement data to trnasmit
   * @return {RPCError} The resulting RPCError
   */
  var buildInternalRPCError = function(data) {
    return new RPCError(-32603, undefined, data);
  };
  
//RPC Message generic constructor
  var RPCMessage = function(obj) { _clone(this, obj);                     };
  RPCMessage.prototype = {
    setRPCID  : function(id) {this.id = String(id); return this;            },
    getRPCID  : function() {  return this.id;                               },
    isResponse: function() {  return ('undefined' !== typeof this.result);  },
    getResult : function() {  return this.result;                           },
    isRequest : function() {  return ('undefined' !== typeof this.method);  },
    getMethod : function() {  return this.method;                           },
    getParams : function() {  return this.params;                           },
    isError   : function() {  return ('undefined' !== typeof this.error);   },
    getError  : function() {  return this.error;                            },
    getType   : function() {  if(this.isResponse()) return 'response';
                              if(this.isRequest()) return 'method';         },
    stringify : function() {  return _clone({}, this);                      }
  };

//RPC Error constructor
  var RPCError = function(code, message, data) {
      this.code =  code;
      this.message = message ? message : (JSONRPC_ERROR_STRINGS[code] ? JSONRPC_ERROR_STRINGS[code] : '');
    if (data !== undefined && data !== null)
      this.data = data;
  };
  RPCError.prototype = {
    hasRPCID : function() {
      return ('undefined' !== typeof this.data)&&(('undefined' !== typeof this.data.id));
    },
    getRPCID : function() {
      if(this.hasRPCID()) return this.data.id;
    },
    stringify : function() {  
      return _clone({}, this);                      
    }
  };

//expose API

  KadOH.protocol.jsonrpc2 = {
    parseRPCMessage      : parseRPCMessage,
    buildErrorResponse   : buildErrorResponse,
    buildResponse        : buildResponse,
    buildRequest         : buildRequest,
    buildInternalRPCError: buildInternalRPCError, 
    _RPCMessage          : RPCMessage,
    _RPCError            : RPCError,
    _JSONRPC_ERROR_STRINGS : JSONRPC_ERROR_STRINGS
  };
  
//util..
  var _clone = function(clone, obj) {
    if (null === obj || "object" !== typeof obj)
      return {};
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) clone[attr] = obj[attr];
    }
    return clone;
  };

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
