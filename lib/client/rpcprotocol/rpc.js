// Dep: [KadOH]/core/class
// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/util/when

(function(exports) {

  var KadOH = exports;
  var Class = KadOH.core.Class;
  var globals = KadOH.globals;
  var Peer = KadOH.Peer;
  var Crypto = KadOH.util.Crypto;
  var when = KadOH.util.when;

  KadOH.protocol = KadOH.protocol || {};

  KadOH.protocol.RPC = Class({
    initialize: function(dst, request, udp) {
      this._id = this._generateID();

      this._dst = new Peer(dst.split(':'));
      this._request = request;
      this._udp = udp;

      this._request.setRPCID(this._id);
      this._state = 'initialized';
      // extend RPC object with a defer object
      _extend(this, when.defer());

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
      console.log("SEND RPC:", this);
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
      // if the response is an error
      // call the ErrBack of the request object
      if (response.isError()) {
        this.reject(response.getError());
      } else {
        this._clearTimeoutError();
        this.resolve(response.getResult());
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
      return Crypto.digest.randomSHA1();
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

  var _extend = function(obj, source) {
    for (var prop in source) {
      if (source[prop] !== void 0) obj[prop] = source[prop];
    }
    return obj;
  };

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
