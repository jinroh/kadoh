// Dep: [KadOH]/core/class
// Dep: [KadOH]/transport/SimUDP
// Dep: [KadOH]/util/when
// Dep: [KadOH]/protocol/jsonrpc2

(function(exports, when) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  var SimUDP = KadOH.transport.SimUDP;
  var globals = KadOH.globals;
  var Protocol = KadOH.protocols.JSONRPCv2;
  
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
    
    sendRPC: function(dst, method, params) {
      // build the RPC message
      var message = Protocol.buildRPCMessage(method, params);
      
      // create and store the deferred object
      var deferred = when.defer();
      var id = this._generateID();
      this._deferreds[src][id] = deferred;
      
      // set the timeout reject on the deferred
      // @TODO implement it in when.js ?
      setTimeout(function() {
        try {
          deferred.reject('TIMEOUT');
        } catch(e) {}
      }, globals._timeout);
      
      // send the message
      this._udp.send(dst, message);
      
      return deferred.promise;
    },
    
    PING: function(dst) {
      this.sendRPC(dst, 'PING');
    },
    
    FIND_NODE: function(dst, id) {
      this.sendRPC(dst, 'FIND_NODE', [id]);
    },
    
    // Private
    
    /**
     * Main handler for any incoming message
     *
     * @param {Object}
     */
    _handler: function(data) {
      console.log('RECV : ');
      console.log(data.msg);
      var message;
      
      try {
        message = Protocol.buildRPCMessage(data.msg);

        // if the message is an RPC
        if (message.isMethod()) {
          this._handleRPC(message);
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
      var deferred = this._deferreds[src][message.getID()];
      
      // if their is no deferred object corresponding
      // the message doesn't match with any previously sent RPC
      if ('undefined' === typeof deferred) {
        throw new Protocol.buildError();
      }
      
      // if the response is an error
      // call the ErrBack of the deferred object
      if(message.isError()) {
        deferred.reject(message.getError());
      } else {
        deferred.resolve(message.getResponse());
      }
      
      // delete the RPC from the _deferreds Array
      delete this._deferreds[src][message.getID()];
    },
    
    /**
     * Handles RPC requests
     * 
     */
    _handleRPC: function(src, request) {
      var method = this._node[request.getMethod()];
      
      var response = Protocol.buildResponse(
        request.getID,
        method.apply(this._node, request.getParams())
      );
      
      this._udp.send(src, response);
    },
    
    _generateID: function() {
      return Math.floor(Math.random() * (100000 + 1));
    }
    
  });
})( 'object'   === typeof module    ? module.exports : (this.KadOH = this.KadOH || {}),
    'function' === typeof this.when ? this.when      : false                          );
