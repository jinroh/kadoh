// Dep: [KadOH]/core/class
// Dep: [KadOH]/transport/simudp
// Dep: [KadOH]/util/when
// Dep: [KadOH]/protocol/jsonrpc2

(function(exports, when) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  var SimUDP = KadOH.transport.SimUDP;
  var globals = KadOH.globals;
  var Protocol = KadOH.protocol.jsonrpc2;
  
  if (!when) {
    if ('object' === typeof console)
      console.warn('WARNING : when is not defined');
    return;
  }
  
  KadOH.Reactor = Class({
    
    initialize: function(node) {
      this._node = node;
      this._udp = SimUDP;
      
      // initialize the _deferreds object
      this._deferreds = {};
      
      // main listen loop
      this._udp.listen(this._handler, this);
    },
    
    // Public
    
    /**
     * Method to send a RPC
     * 
     * It generates and store an associated deferred object
     * and return the promise.
     * You can chain the promise with a `then()` function
     * taking a callback and an errback as parameters.
     * ie: 
     * `sendRPC(...).then(callback, errback);`
     * 
     * @param {String} dst The destination socket 'ip:port'
     * @param {String} method The method name to call in uppercase
     * @param {Array} params An array of params to pass in the method
     * @return {Promise}
     */
    sendRPC: function(dst, method, params) {
      // create and store the deferred object
      var deferred = when.defer();
      var id = this._generateID();
      this._storeDeferred(dst, id, deferred);
      
      // build the RPC message and associate
      // the generated `id`
      var message = Protocol.buildRequest(method, params);
      message.setRPCID(id);
      
      // set the timeout reject on the deferred
      // @TODO implement it in when.js ?
      var self = this;
      setTimeout(function() {
        try {
          delete self._deferreds[dst][id];
          deferred.reject('TIMEOUT');
        } catch(e) {}
      }, globals._timeout);
      
      // send the message
      this._udp.send(dst, message);
      
      return deferred.promise;
    },
    
    PING: function(dst) {
      return this.sendRPC(dst, 'PING');
    },
    
    FIND_NODE: function(dst, id) {
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
        message = Protocol.parseRequest(data.msg);

        // if the message is an RPC
        if (message.isMethod()) {
          this._handleRPC(data.src, message);
        }
        // if the message is a response to a RPC
        else if (message.isResponse()) {
          this._handleResponse(data.src, message);
        }
      }
      // if we catch any ErrorMessage exception
      // we send it right back as an error
      catch(ErrorMessage) {
        message = ErrorMessage;
        this._udp.send(data.src, message);
      }
    },
    
    /**
     * Handle response messages
     *
     * @param {String} socket source 'ip:port'
     * @param {RPCMessage} response
     */
    _handleResponse: function(src, response) {
      // get deferred object and call resolve()
      var deferred = this._deferreds[src][response.getRPCID()];
      
      // if their is no deferred object corresponding
      // the message doesn't match with any previously sent RPC
      if ('undefined' === typeof deferred) {
        console.log(response);
        
        throw new Protocol.buildError(
          'Invalid Request.',
          response.getRPCID()
        );
      }
      
      // if the response is an error
      // call the ErrBack of the deferred object
      if(response.isError()) {
        deferred.reject(response.getError());
      } else {
        deferred.resolve(response.getResult());
      }
      
      // delete the RPC from the _deferreds Array
      delete this._deferreds[src][response.getRPCID()];
    },
    
    /**
     * Handles RPC requests
     * 
     * @param {String} src The source socket 'ip:port'
     * @param {Object} request The request object of the RPC
     */
    _handleRPC: function(src, request) {
      var method = this._node[request.getMethod()];
      var response;
      
      try {
        response = Protocol.buildResponse(
          method.apply(this._node, request.getParams()),
          request.getRPCID()
        );
      }
      catch(e) {
        response = Protocol.buildError(
          e.message,
          request.getRPCID()
        );
      }
      
      this._udp.send(src, response);
    },
    
    /**
     * Generate a random ID to associate with the request
     */
    _generateID: function() {
      return Math.floor(Math.random() * (100000 + 1));
    },
    
    _storeDeferred: function(dst, id, deferred) {
      this._deferreds[dst] = this._deferreds[dst] ? this._deferreds[dst] : {};
      this._deferreds[dst][id] = deferred;
    }
    
  });
})( 'object'   === typeof module    ? module.exports : (this.KadOH = this.KadOH || {}),
    'function' === typeof this.when ? this.when      : false                          );
