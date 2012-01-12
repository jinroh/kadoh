// Dep: [KadOH]/rpc/reactor
// Dep: [KadOH]/rpc/object/pingrpc
// Dep: [KadOH]/rpc/object/findnoderpc
// Dep: [KadOH]/rpc/object/findvaluerpc
// Dep: [KadOH]/rpc/p2ptransport/simudp
// Dep: [KadOH]/rpc/p2ptransport/xmpp
// Dep: [KadOH]/rpc/p2ptransport/udp
// Dep: [KadOH]/rpc/object/storerpc
// Dep: [KadOH]/globals
// Dep: [KadOH]/rpc/protocol/jsonrpc2
// Dep: [KadOH]/rpc/protocol/xmlrpc
// Dep: [KadOH]/rpc/protocol/node-xmlrpc


(function(exports) {

  var KadOH     = exports,
      Reactor   = KadOH.rpc.Reactor,
      protocol  = KadOH.rpc.protocol,
      transport = KadOH.transport,
      globals   = KadOH.globals;

  var PingRPC      = KadOH.rpc.object.PingRPC,
      FindNodeRPC  = KadOH.rpc.object.FindNodeRPC,
      FindValueRPC = KadOH.rpc.object.FindValueRPC,
      StoreRPC     = KadOH.rpc.object.StoreRPC;
    
  KadOH.rpc.KadOHReactor = Reactor.extend({

    initialize: function(node, options) {
      var config = this.config = {
        type     : globals.TRANSPORT,
        protocol : globals.PROTOCOL,
        host     : globals.TRANSPORT_SERVER,
        cleanup  : globals.CLEANUP_INTERVAL
      };

      this.supr(options);

      this._node      = node;
      this._protocol  = protocol[config.protocol];
      this._transport = new transport[config.type](
        config.host,
        config.transport
      );

      this.RPCObject = {
        PING       : PingRPC.extend(     {reactor : this}),
        FIND_NODE  : FindNodeRPC.extend( {reactor : this}),
        FIND_VALUE : FindValueRPC.extend({reactor : this}),
        STORE      : StoreRPC.extend(    {reactor : this}),
        __default  : undefined
      };

    },

    getMeAsPeer: function() {
      return this._node.getMe();
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
        this.emit('received a broken RPC message', RPCError);
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
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
