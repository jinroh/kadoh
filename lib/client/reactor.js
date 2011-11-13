// Dep: [KadOH]/core/class
// Dep: [KadOH]/p2ptransport/simudp
// Dep: [KadOH]/rpcprotocol/rpc
// Dep: [KadOH]/globals
// Dep: [KadOH]/rpcprotocol/jsonrpc2
// Dep: [KadOH]/util/bind
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/util/when

(function(exports, when) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  var globals = KadOH.globals;
  var Protocol = KadOH.protocol.jsonrpc2;
  var RPC = KadOH.protocol.RPC;
  var SimUDP = KadOH.transport.SimUDP;
  var bind = KadOH.util.bind;
  var Crypto = KadOH.util.Crypto;
  
  if (!when) {
    if ('object' === typeof console)
      console.warn('WARNING : when is not defined');
    return;
  }
  
  KadOH.Reactor = Class({
    
    initialize: function(node) {
      this._node = node;
      this._udp = new SimUDP(globals._transport_server);
      
      // initialize the _requests object
      // and the cleanup process
      this._requests = {};
      setInterval(function(self) {
        self._cleanup();
      }, globals._cleanup_interval, this);
      
      // main listen loop
      this._udp.listen(bind(this._handler, this));
    },
    
    // Public
    
    /**
     * Method to send a RPC
     * 
     * It generates and store an associated request object
     * and return the promise.
     * You can chain the promise with a `then()` function
     * taking a callback and an errback as parameters.
     * ie: 
     * `sendRPC(...).then(callback, errback);`
     * 
     * @param {String} dst The destination socket 'ip:port' or a Peer object
     * @param {String} method The method name to call in uppercase
     * @param {Array} params An array of params to pass in the method
     * @return {Promise}
     */
    sendRPC: function(dst, method, params) {
      // check wether dst is a string socket
      // or a Peer object
      if (typeof dst.getSocket === 'function') {
        dst = dst.getSocket();
      }
      
      // build the RPCMessage and associate
      // the generated `id`
      var message = Protocol.buildRequest(method, params);
      
      // create and store the request object
      var request = new RPC(dst, message, this._udp);
      this._storeRequest(request);
      
      request.send();
      return request.promise;
    },
    
    /**
     * Helper to send parallel RPCs and return an Array
     * of promises.
     * It is possible to call for `when.some()` or `when.any()`
     * for instance to deal with callbacks.
     * ie:
     * `when.any(sendRPCs).then(callback, errback);`
     * 
     * @param {Array} dsts Array of destinations sockets or Peers
     * @param {String} method The method name to call in uppercase
     * @param {Array} params An array of params to pass in the method
     * @return {Promises}
     */
    sendRPCs: function(dsts, method, params) {
      var promises = [];
      
      for (var i=0; i < dsts.length; i++) {
        promises.push(
          this.sendRPC(dsts[i], method, params)
        );
      }
      return promises;
    },
    
    PING: function(dst) {
      return this.sendRPC(dst, 'PING');
    },
    
    FIND_NODE: function(id) {
      return this.sendRPC(dst, 'FIND_NODE', [id]);
    },
    
    // Private
    
    /**
     * Main handler for any incoming message
     *
     * @param {Object}
     */
    _handler: function(data) {
      var message;
      try {
        message = Protocol.parseRPCMessage(data.msg);
      }
      catch(RPCError) {
        this._sendError(data.src, undefined, RPCError);
      }
      
      // if the message is an RPC
      if (message.isRequest()) {
        console.log("RCV A RPC", message);
        this._handleRPC(data.src, message);
      }
      // if the message is a response to a RPC
      else if (message.isResponse()) {
        console.log("RCV A RESPONSE", message);
        this._handleResponse(data.src, message);
      }
    },
    
    /**
     * Handle response messages
     *
     * @param {String} socket source 'ip:port'
     * @param {RPCMessage} response
     */
    _handleResponse: function(src, response) {
      // retrieve the request object
      var request = this._requests[response.getRPCID()];
      // if their is no request object corresponding
      // the message doesn't match with any previously sent RPC
      if ('undefined' === typeof request) {
        console.warn('Received a response which doesn\'t correspond to any sended request');
        return;
      }
      request.handle(response);
    },
    
    /**
     * Handles RPC requests
     * 
     * @param {String} src The source socket 'ip:port'
     * @param {Object} request The request object of the RPC
     */
    _handleRPC: function(src, request) {
      var method = this._node[request.getMethod()];
      
      try {
        var params = request.getParams();
        
        // add the requestor socket at the end of the params
        params.push(src.split(':'));
        
        // call the RPC
        var promise = method.apply(this._node, params);
        
        when(promise).then(
          bind(function(result) {
            this._sendResponse(src, request.getRPCID(), result);
          }, this),
          bind(function(error) {
            this._sendError(src, request.getRPCID(), error);
          }, this)
        );
      }
      catch(e) {
        var RPCError = Protocol.buildInternalRPCError(e.message);
        this._sendError(src, request.getRPCID(), RPCError);
      }
    },
    
    _sendResponse: function(dst, rpc_id, result) {
      var response = Protocol.buildResponse(
        result,
        rpc_id
      );
      console.log("SEND RESPONSE :", response);
      this._udp.send(dst, response);
    },
    
    _sendError: function(dst, rpc_id, error) {
      var response = Protocol.buildErrorResponse(
        error,
        rpc_id
      );
      console.log("SEND ERROR :", response);
      this._udp.send(dst, response);
    },
    
    /**
     * Generate a random ID to associate with the request
     */
    _generateID: function() {
      return Crypto.digest.randomSHA1();
    },
    
    _storeRequest: function(request) {
      this._requests[request.getID()] = request;
    },

    _cleanup: function() {
      var id;
      var requests = this._requests;
      for(id in requests) {
        if (requests[id].getState() === 'completed')
          delete requests[id];
      }
    }
    
  });
  
})( 'object'   === typeof module    ? module.exports : (this.KadOH = this.KadOH || {}),
    'function' === typeof this.when ? this.when      : false                          );
