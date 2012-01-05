// Dep: [KadOH]/core/deferred

(function(exports) {

  var KadOH     = exports,
      Deferred  = KadOH.core.Deferred;

  KadOH.rpc        = KadOH.rpc || {};
  KadOH.rpc.object = KadOH.rpc.object || {};

  KadOH.rpc.object.RPC = Deferred.extend({

    initialize: function(queried_peer, method, params) {
      this.supr();

      //if no arguments, empty RPC that need to parsed from normalized query
      if(arguments.length ===0) return this;

      this.method = method;
      this.params = params || []; //params should alwais be an array
      this.setQueried(queried_peer);

      this.setID(this._generateRandomID());
    },

    //to be defined...
    reactor : undefined,

    //geters

    getMethod : function() {
      return this.method;
    },

    getParams: function() {
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
      if(!(this.isRejected() || this.isResolved()))
        return null;

      var res = {
        id     : this.getID(),
        method : this.method
      };

      if(this.isResolved()) {
        res.result = this.getResult();
      }
      if(this.isRejected()) {
        res.error = this.getError();
      }
      return res;
    },

    // receiving a query from the network :
    
    handleNormalizedQuery: function(query, from, specific_handler) {
      if(from)
        this.setQuerying(from);

      this.setID(query.id);
      this.method = query.method;

      if (typeof specific_handler === 'function')
        specific_handler.call(this, query, from);
      else {
        this.params = query.params;
      }

      return this;
    },
    //receiving a response from network
    
    /**
     * Handle the response coming from the node that have executed the RPC. This
     * method shou  ld do verifications and reject or resolve the RPC (as deferred).
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
      if(this.stateIsNot('progress')) {
        KadOH.log.warn('rcv response already finished', this.getQueried().getAddress(),this, response);
        return;
      }

      //antispoofing
      if(from && from !== this.getQueried())
        return;

      //probably need specific_handler to handle result and error
      if (typeof specific_handler === 'function')
        specific_handler.call(this, response);

      else {
        if(response.hasOwnProperty('result')) {
          var result = (response.result !== null) ? [response.result] : [];
          this.resolve.apply(this, result);
        }
        else if(response.hasOwnProperty('error')) {
          this.reject(response.error);
        }
        else this.reject('Handle normalized reponse : nor result, nor error given');
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


  // time out stuff
  
    _timeoutValue : 2*1000,

    _setTimeout: function() {
      this._timeout_id = setTimeout(
        function(self) {
          if (self.stateIs('progress'))
            self.reject('TIMEOUT');
        },
        this._timeoutValue, this
      );
    },

    _clearTimeout: function() {
      if(typeof this._timeout_id !== 'undefined') {
        clearTimeout(this._timeout_id);
        this._timeout_id = 'undefined';
      }
    },

    //id stufs
  
    setID : function(id) {
      this.id = id;
    },

    getID : function() {
      return this.id;
    },

    _generateRandomID : function() {
      var alph = '0123456789abcdefghijklmnopqrstuvwxyz';
      return (alph[Math.floor(Math.random() * alph.length)] + alph[Math.floor(Math.random() * alph.length)]);
    }

  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
