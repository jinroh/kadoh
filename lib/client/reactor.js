// Dep: [KadOH]/core/stateeventemitter
// Dep: [KadOH]/core/deferred
// Dep: [KadOH]/p2ptransport/simudp
// Dep: [KadOH]/p2ptransport/xmpp
// Dep: [KadOH]/rpcprotocol/rpc
// Dep: [KadOH]/globals
// Dep: [KadOH]/rpcprotocol/jsonrpc2
// Dep: [KadOH]/rpcprotocol/xmlrpc
// Dep: [KadOH]/util/crypto

(function(exports) {

  var KadOH = exports;

  var StateEventEmitter = KadOH.core.StateEventEmitter,
      Deferred          = KadOH.core.Deferred,
      globals           = KadOH.globals,
      protocol          = KadOH.protocol,
      transport         = KadOH.transport,
      Crypto            = KadOH.util.Crypto;

  var PingRPC           = KadOH.protocol.PingRPC,
      FindNodeRPC       = KadOH.protocol.FindNodeRPC,
      FindValueRPC      = KadOH.protocol.FindValueRPC,
      StoreRPC          = KadOH.protocol.StoreRPC;

  KadOH.Reactor = StateEventEmitter.extend({

    initialize: function(node, options) {
      this.supr();
      this._node = node;

      var config = this.config = {
        type     : transport[globals.TRANSPORT],
        protocol : protocol[globals.PROTOCOL],
        host     : globals.TRANSPORT_SERVER
      };
      for (var option in options) {
        config[option] = options[option];
      }

      this._protocol  = config.protocol;
      this._transport = new config.type(
        config.host,
        config.transport
      );

      // initialize the _requests object
      this._requests = {};

      // and the cleanup process
      this._startCleanup();

      // add customized RPC objects associated to this reactor instance
      var self = this;
      var RPCObject = {
        _protocol         : self._protocol,
        _originatorNodeID : self._node.getID(),

        send: function() {
          this.supr();
          self._storeRequest(this);
          self._transport.send(this.getDST().getAddress(), this.getRequest());
          return this;
        },

        _updatePeer: function(peer) {
          self._node._routingTable.addPeer(peer);
        }
      };
      
      this.PingRPC      = PingRPC.extend(RPCObject);
      this.FindNodeRPC  = FindNodeRPC.extend(RPCObject);
      this.FindValueRPC = FindValueRPC.extend(RPCObject);
      this.StoreRPC     = StoreRPC.extend(RPCObject);
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
    connectTransport: function() {
      if (this._transport.stateIsNot('connected')) {
        this._transport.connect();

        var self = this;
        this._transport.once('connected', function(address) {
          // main listen loop
          this._transport.listen(this._handler, this);
          this._startCleanup();
          this.setState('connected', address);
        }, this);
      }
      return this;
    },

    disconnectTransport: function() {
      if (this._transport.stateIsNot('disconnected')) {
        this._transport.disconnect();

        this._transport.once('disconnected', function() {
          this._stopCleanup();
          this.setState('disconnected');
        }, this);
      }
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
     * @param {*} params additional parameters
     * @return {Promise}
     */
    sendRPC: function(dst_peer, method) {
      var rpc;
      method = method.toUpperCase();

      switch(method) {
        case 'PING' :
          rpc = new this.PingRPC(dst_peer);
          break;

        case 'FIND_NODE':
          rpc = new this.FindNodeRPC(dst_peer, arguments[2]);
          break;
        
        case 'FIND_VALUE':
          rpc = new this.FindValueRPC(dst_peer, arguments[2]);
          break;

        case 'STORE':
          rpc = new this.StoreRPC(dst_peer,
            arguments[2], //key
            arguments[3], //value
            arguments[4]  //expiration date
          );
          break;

        default:
          throw new Error('RPC method '+method+' not implemented.');
      }
      
      this.emit('send rpc', dst_peer, rpc);
      return rpc.send();
    },

    /**
     * Helper to send parallel RPCs and return an Array
     * of promises.
     *
     * @param {Array} peers Array of destinations sockets or Peers
     * @param {String} method The method name to call in uppercase
     * @param {*} params additional parameters
     * @return {Promises}
     */
    sendRPCs: function(peers, method) {
      var params   = arguments,
          requests = [];
      
      peers.forEach(function(peer) {
        params[0] = peer;
        requests.push(this.sendRPC.apply(this, params));
      }, this);

      return requests;
    },

    PING: function(dst) {
      return this.sendRPC(dst, 'PING');
    },

    FIND_NODE: function(dst, target) {
      return this.sendRPC(dst, 'FIND_NODE', target);
    },

    FIND_VALUE: function(dst, value) {
      return this.sendRPC(dst, 'FIND_VALUE', value);
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
        message = this._protocol.parseRPCMessage(data.msg);
      }
      catch(RPCError) {
        KadOH.log.warn('received a wrong RPC', RPCError);
        return;
      }

      // if the message is an RPC
      if (message.isRequest()) {
        this.emit("received rpc", data.src, message);
        this._handleRPC(data.src, message);
      }
      // if the message is a response to a RPC
      else if (message.isResponse()) {
        this.emit("received response", data.src, message);
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
        this.emit('response matches no request', src, response);
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
          // call the RPC which may be a promise or a value
          var promise = method.apply(this._node, params);

          var self = this;
          Deferred.when(promise).then(
            function(result) {
              self._sendResponse(src, request.getRPCID(), result);
            },
            function(error) {
              self._sendError(src, request.getRPCID(), error);
            }
          );
        }
        catch(internal_error) {
          this._sendError(src, request.getRPCID(), internal_error);
        }
      }
      catch(rpc_error) {
        var RPCError = this._protocol.buildInternalRPCError(rpc_error.message);
        this._sendError(src, request.getRPCID(), RPCError);
      }
    },

    _sendResponse: function(dst, rpc_id, result) {
      var response = this._protocol.buildResponse(
        result,
        rpc_id
      );
      this.emit('send response', dst, response);
      this._transport.send(dst, response);
    },

    _sendError: function(dst, rpc_id, error) {
      var response = this._protocol.buildErrorResponse(
        error,
        rpc_id
      );
      this.emit('send error', dst, response);
      this._transport.send(dst, response);
    },

    _storeRequest: function(request) {
      // @TODO
      // regenerate an id if the id is already taken
      // maybe not necessary if we generate 160bits long IDs...
      // but useful for the bittorrent ID generator (8bits long)
      this._requests[request.getID()] = request;
    },

    _startCleanup: function() {
      this._cleanupProcess = setInterval(function(self) {
        var requests = self._requests;
        for (var id in requests) {
          if (requests.hasOwnProperty(id)) {
            if (requests[id].isCompleted())
              delete requests[id];
          }
        }
      }, globals.CLEANUP_INTERVAL, this);
    },

    _stopCleanup: function() {
      clearInterval(this._cleanupProcess);
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
