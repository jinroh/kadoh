// Dep: [KadOH]/globals
(function(exports) {
  
  var KadOH = exports;
  KadOH.protocol = KadOH.protocol || {};
  RPCS = KadOH.globals._rpcs;


  var jsonrpc2 = KadOH.protocol.jsonrpc2 = {
    
    JSONRPC_ERROR_STRINGS : {
      "-32700" : "Parse error.",
      "-32600" : "Invalid Request.",
      "-32601" : "Method not found.",
      "-32602" : "Invalid params.",
      "-32603" : "Internal error."
    },
    
    buildError : function(error, id) {
      if (id === undefined)
          return null;

       return new rpcMessage({
         "jsonrpc" : "2.0",
          "error" : error,
          "id" : id
      });
    },
    
    buildRequest : function(rpc_name, params) {
      if(RPCS.indexOf(rpc_name) == -1)
        return null;
      
      params = params || null;
      
      return new rpcMessage({
          "jsonrpc" : "2.0",
          "method"  : rpc_name,
          "params"  : params
      });
    },
    
    buildResponse : function(result, id) {
      if (id === undefined)
          return null;
          
      return new rpcMessage({
          "jsonrpc" : "2.0",
          "result" : result,
          "id" : id
      });
    },
    
    parseRequest : function(request) {
      try {
          
          // validate jsonrpc property
          if (request.jsonrpc !== "2.0")
              throw rpcError(-32600);
          
          // if it is a method request
          if (typeof request.method !== 'undefined') {
            // validate method property
            if (typeof request.method !== "string" || request.method.substring(0,4) === "rpc.")
                throw rpcError(-32600);
            request.method = request.method.toUpperCase(); //methode man should be UpperCase
            if (RPCS.indexOf(request.method) === -1)
                throw rpcError(-32601);
          }

          // validate id property
          if (typeof request.id === "number") {
              if (request.id >>> 0 !== request.id) //is a integer
                  throw rpcError(-32600);
          }
          else if (typeof request.id !== "string" && typeof request.id === "boolean")
              throw rpcError(-32600);
          
          request.id = new String(request.id); // id should be strings
          
                            
          // validate and convert params
          var args;
          if (request.params === undefined || request.params === null)
              args = [];
          else if (Array.isArray(request.params))
              args = request.params;
          else if (request && request.params.constructor === Object)
              args = [request.params];
          else
              throw rpcError(-32600);
         
         return new rpcMessage(request);

      } catch (e) {
          if('undefined' === typeof e.code) //throwed error is not a custom ours
            e = rpcError(-32603, null, String(e));
            
          throw this.buildError(e, request.id);
      }
    }
  };
  
  var rpcMessage = function(hash) {
    this.msg = hash;
  };
  
  rpcMessage.prototype = {
    
    setRPCID : function(id) {
      this.msg.id = new String(id);
      return this;
    },
    
    getRPCID : function() {
      return this.msg.id;
    },
    
    isResponse: function() {
      return !('undefined' === typeof this.msg.result);
    },
    
    getResult: function() {
      return this.msg.result;
    },
    
    isMethod : function() {
      return !('undefined' === typeof this.msg.method);
    },
    
    getMethod : function() {
      return this.msg.method;
    },
    
    getParams : function() {
      return this.msg.params;
    },
    
    isError : function() {
      return !('undefined' === typeof this.msg.error);
    },
    
    getError : function() {
      return this.msg.error;
    },
    
    getType : function() {
      if(this.isResponse()) return 'response';
      if(this.isMethod()) return 'method';
    },
    
    stringify : function() {
      return this.msg;
    }
  };
  
  var rpcError = function(code, message, data) {
      var error = {
          code : code,
          message : message || jsonrpc2.JSONRPC_ERROR_STRINGS[code] || '',
      };
      if (data !== undefined)
          error.data = data;
      return error;
  };
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
