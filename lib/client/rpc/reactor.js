// Dep: [KadOH]/core/stateeventemitter
// Dep: [KadOH]/core/deferred
// Dep: [KadOH]/rpc/p2ptransport/simudp
// Dep: [KadOH]/rpc/p2ptransport/xmpp
// Dep: [KadOH]/rpc/object/kadohrpc
// Dep: [KadOH]/globals
// Dep: [KadOH]/rpc/protocol/jsonrpc2
// Dep: [KadOH]/rpc/protocol/xmlrpc
// Dep: [KadOH]/util/crypto

(function(exports) {

  var KadOH = exports;

  var StateEventEmitter = KadOH.core.StateEventEmitter,
      Deferred          = KadOH.core.Deferred,
      globals           = KadOH.globals,
      protocol          = KadOH.rpc.protocol,
      transport         = KadOH.transport,
      Crypto            = KadOH.util.Crypto;

  var PingRPC           = KadOH.rpc.object.PingRPC,
      FindNodeRPC       = KadOH.rpc.object.FindNodeRPC,
      FindValueRPC      = KadOH.rpc.object.FindValueRPC,
      StoreRPC          = KadOH.rpc.object.StoreRPC;

  KadOH.Reactor = StateEventEmitter.extend({

    initialize: function(node, options) {
      this.supr();
      this._node = node;

      var config = this.config = {
        type     : transport.XMPP,
        protocol : protocol.xmlrpc,
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
      setInterval(function(self) {
        self._cleanup();
      }, globals.CLEANUP_INTERVAL, this);

      // add customized RPC objects associated to this reactor instance
      var self = this;
      var RPCObject = {
        _protocol         : self._protocol,
        _originatorNodeID : self._node.getID(),

        send: function() {
          this.supr();
          self._storeRequest(this);
          self._transport.send(this.getDST().getAddress(), this.getRequest());
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
        this._transport.on('connected', function(address) {
          // main listen loop
          self._transport.listen(self._handler, self);
          self.setState('connected', address);
        });
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
      var add_params = Array.prototype.slice.call(arguments);
      add_params.splice(0,2);

      var rpc;

      switch(method.toUpperCase()) {
        case 'PING' :
          rpc = new this.PingRPC(dst_peer);
          break;

        case 'FIND_NODE':
          rpc = new this.FindNodeRPC(dst_peer, add_params[0]);
          break;
        
        case 'STORE':
          rpc = new this.StoreRPC(dst_peer,
            add_params[0], //key
            add_params[1], //value
            add_params[2]  //expiration date
          );
          break;

        case 'FIND_VALUE':
          rpc = new this.FindValueRPC(dst_peer, params);
          break;

        default:
          throw new Error('RPC method '+method+' not implemented.');
      }
      
      this.emit('send rpc', dst_peer, rpc);
      rpc.send();
      return rpc;
    },

    /**
     * Helper to send parallel RPCs and return an Array
     * of promises.
     *
     * @param {Array} dsts Array of destinations sockets or Peers
     * @param {String} method The method name to call in uppercase
     * @param {*} params additional parameters
     * @return {Promises}
     */
    sendRPCs: function(dst_peer_array, method) {
      var add_params = Array.prototype.slice.call(arguments);
      add_params.splice(0,2);

      var requests = [];
      dst_peer_array.forEach(function(peer) {
        add_params.unshift(method);
        add_params.unshift(peer);
        requests.push(this.sendRPC.apply(this,add_params));
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
          var promise = method.call(this._node, params);

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
      this._requests[request.getID()] = request;
    },

    _cleanup: function() {
      var id;
      var requests = this._requests;
      for (id in requests) {
        if (requests.hasOwnProperty(id)) {
          if (requests[id].stateIsNot('progress'))
            delete requests[id];
        }
      }
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
