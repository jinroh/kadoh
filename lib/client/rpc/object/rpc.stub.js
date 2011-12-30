// Dep: [KadOH]/core/deferred

(function(exports) {

  var KadOH     = exports,
      Deferred  = KadOH.core.Deferred;

  KadOH.rpc        = KadOH.rpc || {};
  KadOH.rpc.object = KadOH.rpc.object || {};

  KadOH.rpc.object.StubRPC = Deferred.extend({

    initialize: function(method, params, extra) {
      this.supr();

      this.method       = method;
      this.query        = {};
      this.query.params = params;
      this.extra        = extra || {};
    },

    /**
     * Send method for this RPC. To be overriden to associate a reactor instance.
     *
     * Basicly set a timer for timeout.
     * @abstract
     */
    send : function() {
      this._setTimeout();
    },

    //getters
    
    getMethod : function() {
      return this.method;
    },

    getParams : function() {
      return this.query.params;
    },

    _setResponseResult : function(result) {
      this.response = {};
      this.response.result =result;
    },
    //id stufs
  
    _setId : function(id) {
      this.id = id;
    },

    _getId : function() {
      return this.id;
    },

    _generateRandomId : function() {
      var alph = '0123456789abcdefghijklmnopqrstuvwxyz';
      var id = (alph[Math.floor(Math.random() * alph.length)] + alph[Math.floor(Math.random() * alph.length)]);
      this._setId(id);
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
    _handleResponse: function(response, specific_handler) {
      if (typeof specific_handler === 'function')
        specific_handler.call(this, response);
      else
        this.resolve();
    },

    //receive a resolve/reject from inside

    _handleResolve: function() {
      var args = Array.prototype.slice.call(arguments);
      args = (args.length === 0) ? {} : args;
      args = (args.length === 1) ? args[0] : args;
       args;
    },

    _handleReject: function() {
      var args = Array.prototype.slice.call(arguments);
      args = (args.length == 1) ? args[0] : args;
      this.response = {};
      this.response.error = args;
    },

    /**
     * Clear the timer and resolve.
     * @extends {Deferred#resolve}
     */
    resolve: function() {
      this._clearTimeout();
      this._handleResolve.apply(this, arguments);
      this.supr.apply(this,arguments);
    },

    /**
     * Clear the timer and reject.
     * @extends {Deferred#reject}
     */
    reject: function() {
      this._clearTimeout();
      this._handleReject.apply(this, arguments);
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
    }

  });


})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
