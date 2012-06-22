var StateEventEmitter = require('../util/state-eventemitter'),
    globals           = require('../globals'),

    protocol          = require('./protocol'),

    //@browserify-alias[simudp] ./transport/simudp  --replace
    //@browserify-alias[xmpp] ./transport/strophe --replace
    Transport      = require('./transport'),
 
    log = require('../logging').ns('Reactor');
  
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
      protocol : globals.PROTOCOL,
      cleanup  : globals.CLEANUP_INTERVAL,
      adaptiveTimeout : globals.ADAPTIVE_TIMEOUT_INTERVAL
    };
    for (var option in options) {
      this.config[option] = options[option];
    }

    if (typeof config.protocol === 'string' && !protocol.hasOwnProperty(config.protocol))
      throw new Error('non defined protocol');

    // instantiate the transport and protocol
    this._protocol  = (typeof config.protocol === 'string') ? protocol[config.protocol] : config.protocol;
    this._transport = (typeof config.transportInstance !== 'undefined')
                    ? config.transportInstance
                    : new Transport(
                        config.host,
                        config.transport
                      );

    // request table and ragular clean up the table
    this._requests = {};
    this._startCleanup();
    this._rtts = [];

    // associate RPC object to RPC methods
    this.RPCObject = {
      __default  : undefined
    };

    this.setState('disconnected');
  },

  /**
   * Register RPC objects to associate with RPC method names.
   * 
   * @example
   * reactor.register({
   *   'PING'  : PingRPC,
   *   'STORE' : StoreRPC
   * });
   * 
   * Special method name '__default' : object use when method
   * names not associated to any RPCObject.
   * 
   * @param  {Object} rpcs - hash of RPCS to register
   */
  register: function(rpcs) {
    //TODO suppress reference to reactor
    for(var i in rpcs) {
      this.RPCObject[i] = rpcs[i].extend({reactor : this});
    }
    return this;
  },

  /**
   * Stop the reactor:
   * stop clean-up process and disconnect transport.
   */
  stop: function() {
    this._stopCleanup();
    this._stopAdaptiveTimeout();
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
      log.error('send query : transport disconnected', rpc);
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
    var req = this._protocol.encode(query);
    this._transport.send(dst_peer.getAddress(), req, query);
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
      log.debug('send response', rpc.getMethod(), rpc.getQuerying().getAddress(), rpc.normalizeResponse());
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
    var res  = this._protocol.encode(response);
    this._transport.send(dst_peer.getAddress(), res, response);
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
      message = this._protocol.decode(data.msg);
    }
    catch(RPCError) {
      log.warn('received a broken RPC message', RPCError);
      return;
    }

    switch(message.type) {
      case 'request' :
        this.handleNormalizedQuery(message, data.src);
        break;
      case 'error' :
      case 'response' :
        this.handleNormalizedResponse(message, data.src);
        break;
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
      log.debug('received query', rpc.getMethod(), from, query);
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
      log.warn('response matches no request', from, response);
    } else {
      log.debug('received response', rpc.getMethod(), from, response);
      rpc.handleNormalizedResponse(response, from);
      this.addRTT(rpc.getRTT());
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
   * kethod to send a rpc.
   * 
   * @param  {RPC | Array<RPC>} rpc - rpc to send
   */
  sendRPC: function(rpc) {

    //an array of RPCs
    if(Array.isArray(rpc)) {
      for(var i  = 0; i < rpc.length; i++) {
        this.sendRPC(rpc[i]);
      }
      return this;
    }

    //pass instace of reactor
    rpc.reactor = this;
    rpc.setQuerying(this.getMeAsPeer());
    
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

    rpc.then(success, failure, this);
    return rpc.sendQuery();
  },

  //
  // Statistics
  //

  timeoutValue: globals.TIMEOUT_RPC,

  adaptive: {
    maxSize : 5000,
    minSize : 300,
    tolerance : 0.80,
    max : 10 * 1000,
    min : 1000,
    deflt : globals.TIMEOUT_RPC,
    running : false
  },

  addRTT: function(rtt) {
    if (rtt <= 0) return;
    this._rtts.push(rtt);
    if (!this.adaptive.running &&
        this._rtts.length >= this.adaptive.minSize) {
      this.adaptive.running = true;
      if (this.config.adaptiveTimeout) {
        var self = this;
        setTimeout(function() {
          self._adaptiveTimeout();
        }, this.config.adaptiveTimeout);
      }
    }
  },

  /**
   * Implements the algorithm to compute a
   * long-term-adaptive-timeout value
   */
  _adaptiveTimeout: function() {
    var adaptive = this.adaptive;
    var rtts = this._rtts;

    if (rtts.length > adaptive.maxSize) {
      this._rtts = rtts = rtts.slice(rtts.length - adaptive.maxSize);
    }

    var timeout = this.adaptiveFn(rtts.slice(), adaptive);
    if (timeout > adaptive.max) {
      timeout = adaptive.max;
    } else if (timeout < adaptive.min) {
      timeout = adaptive.min;
    }

    this.timeoutValue = timeout;
    adaptive.running = false;
  },

  /**
   * Default adaptive function based on a fault tolerance
   * adaptive timeout.
   * This function can be overridden
   */
  adaptiveFn: function(distribution, adaptive) {
    distribution.sort(function(a, b) { return a - b; });
    var i = Math.round(distribution.length * adaptive.tolerance) - 1;
    if (i < distribution.length - 1) {
      return distribution[i];
    }
    return adaptive.deflt;
  }

});