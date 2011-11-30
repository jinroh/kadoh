// Dep: [KadOH]/core/eventemitter
// Dep: [KadOH]/p2ptransport/simudp
// Dep: [KadOH]/rpcprotocol/rpc
// Dep: [KadOH]/globals
// Dep: [KadOH]/rpcprotocol/jsonrpc2
// Dep: [KadOH]/util/crypto

(function(exports) {

  var KadOH = exports;

  var EventEmitter = KadOH.core.EventEmitter;
  var globals      = KadOH.globals;
  var Protocol     = KadOH.protocol.jsonrpc2;
  var SimUDP       = KadOH.transport.SimUDP;
  var Crypto       = KadOH.util.Crypto;

  var FindNodeRPC = KadOH.protocol.FindNodeRPC;
  var PingRPC     = KadOH.protocol.PingRPC;



  KadOH.Reactor = EventEmitter.extend({

    initialize: function(node, options) {
      this.supr();

      this._node = node;

      this._transport = new SimUDP(globals.TRANSPORT_SERVER, (options) ? options.transport : undefined);
      this.transport_state = 'disconnected';

      // initialize the _requests object
      // and the cleanup process
      this._requests = {};
      setInterval(function(self) {
        self._cleanup();
      }, globals.CLEANUP_INTERVAL, this);

      //Add cusomized RPC objects associated to this reactor instance
      var self = this;

      var custom_rpc_object = {

        originatorNodeID : self._node.getID(),

        send : function() {
          this.supr();
          self._storeRequest(this);
          self._transport.send(this.getDST().getAddress(), this.getRequest());
        }
      };
      
      this.FindNodeRPC =  FindNodeRPC.extend(custom_rpc_object);
      this.PingRPC     =  PingRPC.extend(custom_rpc_object);
    },


    // Public
    /**
     * Method to connect the transport layer
     * 
     * It emits an event named `transport connect` when the connection succeed with, as parameter, 
     * the address as the node is known on the network.
     * 
     * @return {Reactor} This {@link Reactor} instance
     */
    connectTransport : function() {
      this._transport.connect();

      var self = this;
      this._transport.on('connect', function(iam) {
        self.transport_state = 'connected';
        self.emit('transport connect', iam);

      // main listen loop
        self._transport.listen(self._handler, self);
      });

      return this;
    },

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
     * @param {Peer} dst The destination socket 'ip:port' or a Peer object
     * @param {String} method The method name to call in uppercase
     * @param {Array} params An array of params to pass in the method
     * @return {Promise}
     */
    sendRPC: function(dst_peer, method, params) {
      var rpc;

      switch(method.toUpperCase()) {
        case 'PING' :
          rpc = new this.PingRPC(dst_peer);  
          break;

        case 'FIND_NODE':
          rpc = new this.FindNodeRPC(dst_peer, params);
          break;

        default:
          throw new Error('RPC method '+method+' not implemented.');
      }
      
      rpc.send();
      return rpc;
    },

    /**
     * Helper to send parallel RPCs and return an Array
     * of promises.
     *
     * @param {Array} dsts Array of destinations sockets or Peers
     * @param {String} method The method name to call in uppercase
     * @param {Array} params An array of params to pass in the method
     * @return {Promises}
     */
    sendRPCs: function(dst_peer_array, method, params) {
      var requests = [];
      dst_peer_array.forEach(function(peer) {
        requests.push(this.sendRPC(peer,method, params));
      }, this);

      return requests;
    },

    PING: function(dst) {
      return this.sendRPC(dst, 'PING');
    },

    FIND_NODE: function(dst, target_peer) {
      return this.sendRPC(dst, 'FIND_NODE', target_peer);
    },

    // Private

    /**
     * Main handler for any incoming message
     *
     * @param {Object}
     */
    _handler: function(data, context) {
      var self = context || this;
      var message;

      try {
        message = Protocol.parseRPCMessage(data.msg);
      }
      catch(RPCError) {
        return;
      }

      // if the message is an RPC
      if (message.isRequest()) {
        // console.log("RCV A RPC", message);
        self._handleRPC(data.src, message);
      }
      // if the message is a response to a RPC
      else if (message.isResponse()) {
        // console.log("RCV A RESPONSE", message);
        self._handleResponse(data.src, message);
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
        this.emit('response matches no request', response);
        console.warn('Received a response which doesn\'t correspond to any sent request');
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
        try {
          // call the RPC
          var result = method.call(this._node, params);
          this._sendResponse(src, request.getRPCID(), result);
        }
        catch(e) {
          this._sendError(src, request.getRPCID(), e);
        }
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
      this._transport.send(dst, response);
    },

    _sendError: function(dst, rpc_id, error) {
      var response = Protocol.buildErrorResponse(
        error,
        rpc_id
      );
      console.log("SEND ERROR :", response);
      this._transport.send(dst, response);
    },

    _storeRequest: function(request) {
      this._requests[request.getID()] = request;
    },

    _cleanup: function() {
      var id;
      var requests = this._requests;
      for(id in requests) {
        if (requests[id].state === 'rejected' || requests[id].state === 'resolved')
          delete requests[id];
      }
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
