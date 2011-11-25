// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/core/deferred

(function(exports) {

  var KadOH = exports;
  var globals = KadOH.globals;
  var Peer = KadOH.Peer;
  var Crypto = KadOH.util.Crypto;
  var Deferred = KadOH.core.Deferred;

  KadOH.protocol = KadOH.protocol || {};

  KadOH.protocol.RPC = Deferred.extend({
    initialize: function(dst, request, udp) {
      this.supr();
      
      this._id = this._generateID();

      this._dst = dst;
      this._request = request;
      this._udp = udp;

      this._request.setRPCID(this._id);
      this._state = 'initialized';

      // complete the RPC when
      // it's resolved or rejected
      var self = this;
      var completed = function() {
        self._state = 'completed';
      };
      this.then(completed, completed);
    },

    // Network call

    send: function() {
      // console.log("SEND RPC:", this);
      this._setTimeoutError();
      this._udp.send(this._dst.getSocket(), this._request);

      this._state = 'sent';
    },

    delay: function(ms) {
      var self = this;
      setTimeout(function() {
        self.send();
      }, ms);
    },

    handle: function(response) {
      if (this._state !== 'completed') {
        // if the response is an error
        // call the ErrBack of the request object
        if (response.isError()) {
          this.reject(response.getError());
        } else {
          this._clearTimeoutError();
          this.resolve(response.getResult());
        }
      }
    },

    // Private

    _setTimeoutError: function() {
      this._timeout_id = setTimeout(
        function(self) {
          self.reject('TIMEOUT');
        },
        globals._timeout, this
      );
    },

    _clearTimeoutError: function() {
      clearTimeout(this._timeout_id);
    },

    _generateID: function() {
      // return Crypto.digest.randomSHA1();
      // return (String.fromCharCode(Math.floor((Math.random() * 64)))
             // +String.fromCharCode(Math.floor((Math.random() * 255))));
      var alph = '0123456789abcdefghijklmnopqrstuvwxyz';
      return (alph[Math.floor(Math.random() * alph.length)] + alph[Math.floor(Math.random() * alph.length)]);
    },

    // Getters

    getState: function () {
      return this._state;
    },

    getID: function() {
      return this._id;
    },

    getDST: function() {
      return this._dst;
    },

    getDSTSocket: function() {
      return this._dst.getSocket();
    },

    getDSTID: function() {
      return this._dst.getId();
    },

    getRequest: function() {
      return this._request;
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
