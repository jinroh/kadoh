var Deferred  = require('../../util/deferred'),
    Peer      = require('../../dht/peer'),
    globals   = require('../../globals'),

    log       = require('../../logging').ns('Reactor');


var RPC = module.exports = Deferred.extend({

  initialize: function(queried_peer, method, params) {
    this.supr();

    // if no arguments, empty RPC that need to parsed from normalized query
    if (arguments.length === 0) return;

    this._rtt = 0;
    this._isTimeout = false;

    this.method = method;
    this.params = params || []; // params should alwais be an array
    this.setQueried(queried_peer);

    //hack
    if(this.reactor)
      this.setQuerying(this.reactor.getMeAsPeer());

    this.setID(this._generateRandomID());
  },

  // to be defined...
  reactor : undefined,

  //
  // Getters
  //

  getMethod : function() {
    return this.method;
  },

  getParams: function(index) {
    if (typeof index === 'number') {
      return this.params[index];
    }
    return this.params;
  },

  getResult: function() {
    return this.getResolvePassedArgs();
  },

  getError: function() {
    return this.getRejectPassedArgs();
  },

  getRTT: function() {
    return this._rtt;
  },

  isTimeout: function() {
    return this._isTimeout;
  },

  //peers role
  
  setQueried : function(queried_peer) {
    this.queried = queried_peer;
  },

  getQueried: function() {
    return this.queried;
  },

  setQuerying : function(querying_peer) {
    this.querying = querying_peer;
  },

  getQuerying: function() {
    return this.querying;
  },

  /**
   * Send method for this RPC.
   */
  sendQuery : function() {
    this._sendTime = new Date().getTime();
    this._setTimeout();
    this.reactor.sendRPCQuery(this);
    return this;
  },

  sendResponse: function() {
    this.reactor.sendRPCResponse(this);
    return this;
  },
 
  handleNormalizedQuery: function(query, from) {
    this.setQueried(this.reactor.getMeAsPeer());

    this.id     = query.id;
    this.method = query.method;

    var params = query.params[0];
    if (typeof params !== 'object') {
      log.warn('query with no parameters');
      this.reject();
    }
    else if (this._nonValidID(params.id)) {
      log.warn('query with non valid node id');
      this.reject();
    }
    else {
      this.setQuerying(new Peer(from, params.id));
      this.handleNormalizedParams(params);
    }

    return this;
  },

  // @abstract
  handleNormalizedParams: function() {
    return this;
  },

  // @abstract
  normalizeParams: function() {
    return {};
  },

  /**
   * Express the query associated to this RPC wihtin a normalized form.
   * @return the normalized query
   */
  normalizeQuery : function() {
    var params = this.normalizeParams();
    params.id = this.getQuerying().getID();

    return {
      type : 'request',
      id     : this.getID(),
      method : this.method,
      params : [params]
    };
  },

  // @abstract
  normalizeResult: function() {
    return {};
  },

  normalizeResponse: function() {
    var res = {
      id : this.getID()
    };
    if (this.isResolved()) {
      res.type = 'response',
      res.result = this.normalizeResult(),
      res.result.id = this.getQueried().getID();
    } else if (this.isRejected()) {
      res.type = 'error';
      res.error = this.normalizeError();
    } else {
      log.warn('try to normalize a response not yet completed');
      return null;
    }
    return res;
  },

  normalizeError: function() {
    return this.getError().toString();
  },

  /**
   * Handle the response coming from the node that have executed the RPC. This
   * method should do verifications and reject or resolve the RPC (as deferred).
   *
   * @param  {RPCResponse}  response            ResponseRPC object
   * @param  {Function}     [specific_handler]  Specific handler
   */
  handleNormalizedResponse: function(response, from) {
    this._rtt = new Date().getTime() - this._sendTime;

    if (this.isResolved() || this.isRejected()) {
      log.warn('received response to an already completed query', from, response);
      return this;
    }

    if (from && from !== this.getQueried().getAddress()) {
      log.warn('spoofing attack from ' + from + ' instead of ' + this.getQueried().getAddress());
      return this;
    }

    if (response.hasOwnProperty('result')) {
      var id = response.result.id;
      if (this._nonValidID(id)) {
        log.warn('non valid ID', id, response);
        this.reject();
      }
      // if the ID is outdated (not the same in the response and in the routing table)
      // call the ErrBack with the outdated event
      else if (this._outdatedID(id)) {
        log.info('outdated ID', this.getQueried(), id);
        this.reject('outdated', this.getQueried(), id);
      } else {
        this.handleNormalizedResult(response.result);
      }
    } else if (response.hasOwnProperty('error')) {
      this.handleNormalizedError(response.error);
    } else {
      this.reject();
    }
    return this;
  },

  // @abstract
  handleNormalizedResult: function(result) {
    this.resolve();
  },

  handleNormalizedError: function(error) {
    this.reject(new Error(error));
  },

  /**
   * Clear the timer and resolve.
   * @extends {Deferred#resolve}
   */
  resolve: function() {
    this._clearTimeout();
    this.supr.apply(this,arguments);
  },

  /**
   * Clear the timer and reject.
   * @extends {Deferred#reject}
   */
  reject: function() {
    this._clearTimeout();
    this.supr.apply(this,arguments);
  },

  cancel: function() {
    this._clearTimeout();
    this.supr();
  },

  //
  // Timeout
  //

  _setTimeout: function() {
    this._timeoutID = setTimeout(function(self) {
      if (self.inProgress()) {
        log.info('query timeout');
        self._isTimeout = true;
        self.reject(new Error('timeout'));
      }
    }, this.reactor.timeoutValue, this);
  },

  _clearTimeout: function() {
    if (this._timeoutID) {
      clearTimeout(this._timeoutID);
      this._timeoutID = undefined;
    }
  },

  //
  // ID
  //

  setID : function(id) {
    this.id = id;
  },

  getID : function() {
    return this.id;
  },

  _generateRandomID : function() {
    var dict   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
        length = 2,
        id     = '';
    for (var i = 0; i < length; i++) {
      id += dict.charAt(Math.floor(Math.random() * dict.length));
    }
    return id;
  },

  /**
   * Check if an id is given in the response.
   * @private
   * @param  {String} id ID to validated
   * @return {Boolean} True if and only if the ID is not valid
   */
  _nonValidID: function(id) {
    return (typeof id !== 'string' || !globals.REGEX_NODE_ID.test(id));
  },

  /**
   * Check if the id responded if the same as the local one.
   * @private
   * @param  {String} id ID to check
   * @return {Boolean} True if and only if the ID is outdated
   */
  _outdatedID: function(id) {
    var queried_id = this.getQueried().getID();

    // if the id of the destination
    // peer is a bootstrap (with null id), update queried
    if (queried_id === null) {
      this.getQueried().setID(id);
    }
    else if (id !== queried_id) {
      return true;
    }
    return false;
  }

});