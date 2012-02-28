// Dep: [KadOH]/core/deferred

(function(exports) {

  var KadOH     = exports,
      Deferred  = KadOH.core.Deferred;

  KadOH.rpc        = KadOH.rpc || {};
  KadOH.rpc.object = KadOH.rpc.object || {};

  KadOH.rpc.object.RPC = Deferred.extend({

    initialize: function(queried_peer, method, params) {
      this.supr();

      // if no arguments, empty RPC that need to parsed from normalized query
      if (arguments.length === 0) return;

      this.method = method;
      this.params = params || []; // params should alwais be an array
      this.setQueried(queried_peer);

      this.setID(this._generateRandomID());
    },

    // to be defined...
    reactor : undefined,

    // Geters

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
      this._setTimeout();
      this.reactor.sendRPCQuery(this);
      return this;
    },

    sendResponse: function() {
      this.reactor.sendRPCResponse(this);
      return this;
    },
   
    /**
     * Express the query associated to this RPC wihtin a normalized form.
     *
     * @return the normalized query
     */
    normalizeQuery : function() {
      return {
        id     : this.getID(),
        method : this.method,
        params : this.getParams()
      };
    },

    /**
     * Express the response associated to this RPC whithin a normalized form.
     *
     * @return {[type]}
     */
    normalizeResponse : function() {
      var res = {
        id     : this.getID(),
        method : this.method
      };

      if (this.isResolved()) {
        res.result = this.getResult()[0];
      } else if (this.isRejected()) {
        res.error = this.getError();
      } else {
        res = null;
      }

      return res;
    },

    handleNormalizedQuery: function(query, from, specific_handler) {
      if (from) {
        this.setQuerying(from);
      }

      this.setID(query.id);
      this.method = query.method;

      if (typeof specific_handler === 'function') {
        specific_handler.call(this, query, from);
      } else {
        this.params = query.params;
      }
      return this;
    },

    /**
     * Handle the response coming from the node that have executed the RPC. This
     * method should do verifications and reject or resolve the RPC (as deferred).
     *
     * Verification can be done by passing a specific handler as argument. If there is no specific handler the RPC is bascily resolved.
     *
     * A good pattern is to overide this method and call the super for further verification :
     *
     * @example
     *   _handleResponse: function(response) {
     *     this.supr(response, function(response) {
     *       //some other tests here
     *        this.resolve();
     *      });
     *    }
     *
     * @param  {RPCResponse}  response            ResponseRPC object
     * @param  {Function}     [specific_handler]  Specific handler
     */
    handleNormalizedResponse: function(response, from, specific_handler) {
      if (this.isResolved() || this.isRejected()) {
        KadOH.log.warn('Reactor','received response to an already completed query', from, response);
        return this;
      }

      // antispoofing
      if (from && from !== this.getQueried())
        return this;

      // probably need specific_handler to handle result and error
      if (typeof specific_handler === 'function') {
        specific_handler.call(this, response);
      } else {
        if (response.hasOwnProperty('result')) {
          this.resolve(response.result);
        } else if (response.hasOwnProperty('error')) {
          this.reject(response.error);
        } else {
          this.reject('no result or error given');
        }
      }
      return this;
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
  
    _timeoutValue : 2 * 1000,

    _setTimeout: function() {
      this._timeoutID = setTimeout(function(self) {
        if (self.inProgress())
          KadOH.log.info('Reactor', 'query timeout');
          self.reject(new Error('timeout'));
        }, this._timeoutValue, this);
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
    }

  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
