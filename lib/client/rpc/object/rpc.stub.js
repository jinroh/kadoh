// Dep: [KadOH]/core/deferred

(function(exports) {

  var KadOH     = exports,
      globals   = KadOH.globals,
      Peer      = KadOH.Peer,
      Crypto    = KadOH.util.Crypto,
      Deferred  = KadOH.core.Deferred,
      PeerArray = KadOH.PeerArray;

  KadOH.rpc        = KadOH.rpc || {};
  KadOH.rpc.object = KadOH.rpc.object || {};

  KadOH.rpc.object.StubRPC = Deferred.extend({

    initialize: function(method, params, options) {
      this.supr();

      this.method   = method;
      this.params   = this._generateID();
      this.options  = options || {};
    },

    /**
     * Send method this RPC. To be overriden to associate a reactor instance.
     *
     * Basicly set a timer for timeout.
     * @abstract
     */
    send : function() {
      this._setTimeout();
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
      this.response = {};
      this.response.result = args;
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
