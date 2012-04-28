var StateEventEmitter = require('./util/StateEventEmitter'),
    globals           = require('./globals.js'),

    protocol          = require('./protocol'),
    Transport         = require('./Transport'),
 
    PingRPC           = require('./rpc/PingRPC'),
    FindNodeRPC       = require('./rpc/FindNodeRPC'),
    FindValueRPC      = require('./rpc/FindValueRPC'),
    StoreRPC          = require('./rpc/StoreRPC'),

    log = require('./logging')('Reactor');
  
var Reactor = module.exports = StateEventEmitter.extend({

  /**
   * TODO : explicit the options
   *
   * @param  {Node}   node    - the Node Instance to which this reactor is associated
   * @param  {Object} options - options
   */
  initialize: function(node, options) {
    this.supr();
    this._node = node;

    // load config
    var config = this.config = {
      type     : globals.TRANSPORT,
      protocol : globals.PROTOCOL,
      cleanup  : globals.CLEANUP_INTERVAL
    };
    for (var option in options) {
      this.config[option] = options[option];
    }

    if (!protocol.hasOwnProperty(config.protocol)) throw new Error('non defined protocol');

    // instantiate the transport and protocol
    this._protocol  = protocol[config.protocol];
    this._transport = new Transport(
      config.host,
      config.transport
    );

    // request table and ragular clean up the table
    this._requests = {};
    this._startCleanup();

    // associate RPC object to RPC methods
    this.RPCObject = {
      PING       : PingRPC.extend(     {reactor : this}),
      FIND_NODE  : FindNodeRPC.extend( {reactor : this}),
      FIND_VALUE : FindValueRPC.extend({reactor : this}),
      STORE      : StoreRPC.extend(    {reactor : this}),
      __default  : undefined
    };

    this.setState('disconnected');
  },

  /**
   * Stop the reactor:
   * stop clean-up process and disconnect transport.
   */
  stop: function() {
    this._stopCleanup();
    this.disconnectTransport();
  },

  /**
   * Return the node instance (also a Peer instance).
   * @return {Object} node instance
   */
  getMeAsPeer: function() {
    return this._node;
  },

  /**
   * Connect the transport.
   */
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

  /**
   * Disconnect the transport.
   * @return {[type]}
   */
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

  /**
   * Send a RPC query : add it to the requests table and pass it
   * to #sendNormalizedQuery.
   *
   * @param  {RPC} rpc - rpc to send
   */
  sendRPCQuery: function(rpc) {
    if (this.stateIsNot('connected')) {
      rpc.reject('transport not connected');
      log.error( 'send query : transport disconnected', rpc);
    }
    else {
      this._storeRequest(rpc);
      this.sendNormalizedQuery(rpc.normalizeQuery(), rpc.getQueried(), rpc);
      log.debug('Reactor', 'send query', rpc.getMethod(), rpc.getQueried().getAddress(), rpc.normalizeQuery());
    }
    this.emit('querying', rpc);
    return this;
  },
  
  /**
   * Encode a normalised query whith the appropriate protcol,
   * and send it.
   *
   * @param  {Object} query    - normalized query
   * @param  {Peer} dst_peer - destination peer
   */
  sendNormalizedQuery: function(query, dst_peer) {
    var req = this._protocol.buildRequest(query.method, query.params);
    req.setRPCID(query.id);

    this._transport.send(dst_peer.getAddress(), req);
  },

  /**
   * Send a RPC response.
   * @param  {RPC} rpc - RPC object to send.
   */
  sendRPCResponse: function(rpc) {
    if (this.stateIsNot('connected')) {
      rpc.reject('transport not connected');
      log.error('send response : transport disconnected', rpc);
    } else {
      this.sendNormalizedResponse(rpc.normalizeResponse(), rpc.getQuerying(), rpc);
      log.debug( 'send response', rpc.getMethod(), rpc.getQuerying().getAddress(), rpc.normalizeResponse());
    }
    return this;
  },

  /**
   * Encode a normalised query whith the appropriate protcol,
   * and send it.
   *
   * @param  {Object} response    - normalized query
   * @param  {Peer} dst_peer - destination peer
   */
  sendNormalizedResponse: function(response, dst_peer) {
    var prot = this._protocol,
        res  = (response.hasOwnProperty('result')) ?
          prot.buildResponse(response.result, response.id) :
          prot.buildErrorResponse(prot.buildInternalRPCError(response.error), response.id);

    this._transport.send(dst_peer.getAddress(), res);
  },

  /**
   * Handle an incoming encoded RPC message :
   * normalyse the message and pass it to the right handler.
   *
   * @param  {Object} data - raw data
   */
  handleRPCMessage: function(data) {
    var message;
    try {
      message = this._protocol.parseRPCMessage(data.msg);
    }
    catch(RPCError) {
      log.warn('received a broken RPC message', RPCError);
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
    } else if (message.isError()) {
      this.handleNormalizedResponse({
        id    : message.getRPCID(),
        error : message.getError()
      }, data.src);
    }
  },

  /**
   * Handle a normalized query : construct the associated RPC object,
   * and emit `queried` wiht the object. Bind the resolve or reject for
   * sending the response.
   *
   * @param  {Object} query - normalized query
   * @param  {String} from  - address of the querying peer
   */
  handleNormalizedQuery: function(query, from) {
    var method = (this.RPCObject.hasOwnProperty(query.method)) ? query.method : '__default';

    if (!this.RPCObject[method]) {
      log.warn( 'receive query with method "' + query.method + '" not available');
      return;
    }
    
    //crate the appropirate RPC object
    var rpc = new this.RPCObject[method]();

    rpc.handleNormalizedQuery(query, from);

    //when resolved or rejected, send response
    rpc.always(rpc.sendResponse);

    //handler could have rejected the query
    if (!rpc.isRejected()) {
      this.emit('reached', rpc.getQuerying());
      log.debug( 'received query', rpc.getMethod(), from, query);
      this.emit('queried', rpc);
    }
  },

  /**
   * Handle a normalized response : find the associated RPC
   * object (correspond to the rpc id) and pass to it.
   * @param  {Object} response - normalized response
   * @param  {String} from     - address of the peer that responded
   */
  handleNormalizedResponse: function(response, from) {
    var rpc = this._getRequestByID(response.id);

    if (!rpc) {
      log.warn( 'response matches no request', from, response);
    } else {
      log.debug( 'received response', rpc.getMethod(), from, response);
      rpc.handleNormalizedResponse(response, from);
    }
    return this;
  },

  /**
   * Find a request in the requests table given its rpc id.
   * @param  {String} id - rpc id
   */
  _getRequestByID: function(id) {
    return this._requests[id];
  },

  /**
   * Store the request in he table.
   * @param  {RPC} rpc - rpc to store
   */
  _storeRequest: function(rpc) {
    this._requests[rpc.getID()] = rpc;
  },

  /**
   * Periodicly remove the stored requests already completed.
   */
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

  /**
   * Stop the periodic cleanup.
   */
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