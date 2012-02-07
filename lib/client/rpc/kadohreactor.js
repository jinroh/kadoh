// Dep: [KadOH]/core/stateeventemitter
// Dep: [KadOH]/rpc/object/pingrpc
// Dep: [KadOH]/rpc/object/findnoderpc
// Dep: [KadOH]/rpc/object/findvaluerpc
// Dep: [KadOH]/rpc/p2ptransport/simudp
// Dep: [KadOH]/rpc/p2ptransport/xmpp
// Dep: [KadOH]/rpc/p2ptransport/node-xmpp
// Dep: [KadOH]/rpc/p2ptransport/udp
// Dep: [KadOH]/rpc/object/storerpc
// Dep: [KadOH]/globals
// Dep: [KadOH]/rpc/protocol/jsonrpc2
// Dep: [KadOH]/rpc/protocol/xmlrpc
// Dep: [KadOH]/rpc/protocol/node-xmlrpc


(function(exports) {

  var KadOH     = exports,
      StateEventEmitter = KadOH.core.StateEventEmitter,
      protocol  = KadOH.rpc.protocol,
      transport = KadOH.transport,
      globals   = KadOH.globals;

  var PingRPC      = KadOH.rpc.object.PingRPC,
      FindNodeRPC  = KadOH.rpc.object.FindNodeRPC,
      FindValueRPC = KadOH.rpc.object.FindValueRPC,
      StoreRPC     = KadOH.rpc.object.StoreRPC;
    
  KadOH.rpc.Reactor = StateEventEmitter.extend({

    initialize: function(node, options) {
      this.supr();
      this._node      = node;

      //load config
      var config = this.config = {
        type     : globals.TRANSPORT,
        protocol : globals.PROTOCOL,
        cleanup  : globals.CLEANUP_INTERVAL
      };
      for (var option in options) {
        this.config[option] = options[option];
      }
      this._protocol  = protocol[config.protocol];

      //instantiate a transport
      this._transport = new transport[config.type](
        config.host,
        config.transport
      );

      //request table and ragular clean up the table
      this._requests = {};
      this._startCleanup();

      //associate RPC object to RPC methods
      this.RPCObject = {
        PING       : PingRPC.extend(     {reactor : this}),
        FIND_NODE  : FindNodeRPC.extend( {reactor : this}),
        FIND_VALUE : FindValueRPC.extend({reactor : this}),
        STORE      : StoreRPC.extend(    {reactor : this}),
        __default  : undefined
      };

      this.setState('disconnected');
    },

    stop: function() {
      this._stopCleanup();
      this.disconnectTransport();
    },

    getMeAsPeer: function() {
      return this._node;
    },

    connectTransport: function() {
      if (this._transport.stateIsNot('connected')) {
        this._transport.once('connected', function(address) {
          // main listen loop
          this._transport.listen(this.handleRPCMessage, this);
          this._startCleanup();
          this.setState('connected', address);
        }, this);
        this._transport.connect();
      }
      return this;
    },

    disconnectTransport: function() {
      if (this._transport.stateIsNot('disconnected')) {
        this._transport.once('disconnected', function() {
          this._stopCleanup();
          this.setState('disconnected');
        }, this);
        this._transport.disconnect();
      }
      return this;
    },


    sendNormalizedQuery: function(query, dst_peer, rpc) {
      var req = this._protocol.buildRequest(query.method, query.params);
      req.setRPCID(query.id);

      this._transport.send(dst_peer.getAddress(), req);
    },

    sendRPCQuery: function(rpc) {
      if (this.stateIsNot('connected')) {
        rpc.reject('transport not connected');
        KadOH.log.error('Reactor', 'send query : transport disconnected', rpc);
      }
      else {
        this._storeRequest(rpc);
        this.sendNormalizedQuery(rpc.normalizeQuery(), rpc.getQueried(), rpc);
        KadOH.log.debug('Reactor', 'send query', rpc.getMethod(), rpc.getQueried().getAddress(), rpc.normalizeQuery());
      }
      this.emit('querying', rpc);
      return this;
    },

    sendRPCResponse: function(rpc) {
      if(this.stateIsNot('connected')) {
        rpc.reject('transport not connected');
        KadOH.log.error('Reactor', 'send response : transport disconnected', rpc);
      } else {
        this.sendNormalizedResponse(rpc.normalizeResponse(), rpc.getQuerying(), rpc);
        KadOH.log.debug('Reactor', 'send response', rpc.getMethod(), rpc.getQuerying().getAddress(), rpc.normalizeResponse());
      }
      return this;
    },

    sendNormalizedResponse: function(response, dst_peer, rpc) {
      var prot = this._protocol,
          res  = (response.hasOwnProperty('result')) ?
            prot.buildResponse(response.result, response.id) :
            prot.buildErrorResponse(prot.buildInternalRPCError(response.error), response.id);

      this._transport.send(dst_peer.getAddress(), res);
    },


    handleRPCMessage: function(data) {
      var message;
      try {
        message = this._protocol.parseRPCMessage(data.msg);
      }
      catch(RPCError) {
        KadOH.log.warn('Reactor','received a broken RPC message', RPCError);
        return;
      }

      if (message.isRequest()) {
        this.handleNormalizedQuery({
            id     : message.getRPCID(),
            method : message.getMethod(),
            params : message.getParams()
        }, data.src);
      } else if (message.isResponse()) {
        this.handleNormalizedResponse({
          id     : message.getRPCID(),
          result : message.getResult()
        }, data.src);
      } else if(message.isError()) {
        this.handleNormalizedResponse({
          id    : message.getRPCID(),
          error : message.getError()
        }, data.src);
      }
    },

    handleNormalizedQuery: function(query, from) {
      var method = (this.RPCObject.hasOwnProperty(query.method)) ? query.method : '__default';

      if(!this.RPCObject[method]) {
        KadOH.log.warn('Reactor', 'receive query with method "' + query.method + '"" not available');
        return;
      }
      
      //crate the appropirate RPC object
      var rpc = new this.RPCObject[method]();

      rpc.handleNormalizedQuery(query, from);

      //when resolved or rejected, send response
      rpc.then(rpc.sendResponse, rpc.sendResponse);

      //handler could have rejected the query
      if(!rpc.isRejected()) {
        this.emit('reached', rpc.getQuerying());
      }

      KadOH.log.debug('Reactor', 'received query', rpc.getMethod(), from, query);
      this.emit('queried', rpc);
    },

    handleNormalizedResponse: function(response, from) {
      var rpc = this._getRequestByID(response.id);

      if(!rpc) {
        KadOH.log.warn('Reactor', 'response matches no request', from, response);
      } else {
        KadOH.log.debug('Reactor', 'received response', rpc.getMethod(), from, response);
        rpc.handleNormalizedResponse(response, from);
      }
      return this;
    },

    _getRequestByID: function(id) {
      return this._requests[id];
    },

    _storeRequest: function(rpc) {
      this._requests[rpc.getID()] = rpc;
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
      }, this.config.cleanup, this);
    },

    _stopCleanup: function() {
      clearInterval(this._cleanupProcess);
    },

    //helpers :
    
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
      method = method.toUpperCase();
      var rpc,
          klass = this.RPCObject[method];

      if (!klass)
        throw new Error('RPC method ' + method + ' not implemented');

      var success = function() {
        // emit the reach as the first event
        this.emit('reached', rpc.getQueried());
      };
      var failure = function(type) {
        if (type === 'outdated') {
          // forward outdated events
          this.emit.apply(this, arguments);
        } else {
          // @TODO (?)
        }
      };

      rpc = new klass(dst_peer, Array.prototype.slice.call(arguments, 2));
      rpc.then(success, failure, this);

      return rpc.sendQuery();
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

    FIND_VALUE: function(dst, target) {
      return this.sendRPC(dst, 'FIND_VALUE', target);
    },

    STORE: function(dst, key, value, exp) {
      return this.sendRPC(dst, 'STORE', key, value, exp);
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
