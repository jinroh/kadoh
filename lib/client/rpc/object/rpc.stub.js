// Dep: [KadOH]/core/deferred

(function(exports) {

  var KadOH     = exports,
      Deferred  = KadOH.core.Deferred;

  KadOH.rpc        = KadOH.rpc || {};
  KadOH.rpc.object = KadOH.rpc.object || {};

  KadOH.rpc.object.RPCStub = Deferred.extend({

    initialize: function(method, params, extra) {
      this.supr();

      //if no arguments, empty RPC that need to parsed from normalized query
      if(arguments.length ===0) return this;

      this.method = method;
      this.params = params || null;
    },

    //to be defined...
    reactor : undefined,

    //geters

    getMethod : function() {
      return this.method;
    },

    getParams: function() {
      return this.params || null;
    },

    getResult: function() {
      var args = this.getResolvePassedArgs();
      args = (args.length === 0)? null    : args;
      args = (args.length ==  1)? args[0] : args;
      return args;
    },

    getError: function() {
      var args = this.getRejectPassedArgs();
      args = (args.length === 0)? null    : args;
      args = (args.length ==  1)? args[0] : args;
      return args;
    },

    //peers role
    
    setQueried : function(queried_peer) {
      this.queried = queried_peer;
    },

    getQueried: function() {
      return this.queried;
    },

    setQuering : function(quering_peer) {
      this.quering = quering_peer;
    },

    getQuering: function() {
      return this.quering;
    },

    /**
     * Send method for this RPC.
     * @abstract
     */
    sendQuery : function() {
      this._setTimeout();
      this.reactor.sendRPCQuery(this);
      return this;
    },
   
    /**
     * Express the query associated to this RPC wihtin a normalized form.
     *
     * @return the normalized query
     */
    normalizeQuery : function() {
      return {
        id     : this._getId(),
        method : this.method,
        params : this.params
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
        id     : this._getId(),
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
    
    handleNormalizedQuery: function(query, specific_handler) {
      //id is mandatory
      if(query.indexOf('id') !==-1 && typeof query.id == 'string')
        this._setId(query.id);
      else this.reject('Handle normalized query : RPC id '+query.id+' not valid');

      if(query.indexOf('method') !==-1 && typeof query.method == 'string')
        this.method = query.method;
      else this.reject('Handle normalized query : RPC method '+query.method+' not valid');

      //probably need specific_handler to handle params

      if (typeof specific_handler === 'function')
        specific_handler.call(this, response);
      else {
        this.params = query.params;
      }

      return this;
    },
    //receiving a response from network
    
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
    handleNormalizedResponse: function(response, specific_handler) {
      if(this.stateIsNot('progress'))
        return;

      if(response.indexOf('id') ==-1 || typeof response.id !== 'string' || response.id !== this.getId())
        this.reject('Handle normalized reponse : RPC id'+response.id+' not valid');

      if(response.indexOf('method') ==-1 || typeof response.method !== 'string' || response.method !== this.getMethod())
        this.reject('Handle normalized reponse : RPC method'+response.method+' not valid');

      //probably need specific_handler to handle result and error
      
      if (typeof specific_handler === 'function')
        specific_handler.call(this, response);

      else {
        if(response.indexOf('result') !== -1) {
          var result = (response.result !== null) ? response.result : [];
          result = (Array.isArray(result))? result : [result];
          this.resolve.apply(this, result);
        }
        else if(response.indexOf('error') !==-1) {
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
  
    setId : function(id) {
      this.id = id;
    },

    getId : function() {
      return this.id;
    },

    _generateRandomId : function() {
      var alph = '0123456789abcdefghijklmnopqrstuvwxyz';
      var id = (alph[Math.floor(Math.random() * alph.length)] + alph[Math.floor(Math.random() * alph.length)]);
      this._setId(id);
    }

  })

  //statics method
  .statics({

    parseQuery: function(query) {
      var rpc = KadOH.rpc.object.RPCStub();
      rpc.handleNormalizedQuery(query);
      return rpc;
    }

  });


})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
