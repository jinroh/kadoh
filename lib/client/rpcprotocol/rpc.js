// Dep: [KadOH]/core/class
// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/util/when

/**
 * Extend a defer object and 
 */
(function(exports, when) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  var globals = KadOH.globals;
  var Peer = KadOH.Peer;
  var Crypto = KadOH.util.Crypto;
  
  KadOH.protocol = KadOH.protocol || {};
  
  KadOH.protocol.RPC = Class({
    initialize: function(dst, request, udp) {
      this._id = this._generateID();

      this._dst = new Peer(dst.split(':'));
      this._request = request;
      this._udp = udp;

      this._request.setRPCID(this._id);
      
      // extend RPC object with a defer object
      _extend(this, when.defer());
    },

    // Network call

    send: function() {
      console.log("SEND RPC:", this);
      this._timeout_id = this._setTimeoutError();
      this._udp.send(this._dst.getSocket(), this._request);
    },

    handle: function(response) {
      // if the response is an error
      // call the ErrBack of the request object
      if (response.isError()) {
        this.reject(response.getError());
      } else {
        this.resolve(response.getResult());
        this._clearTimeoutError();
      }
    },
    
    // Private
    
    _setTimeoutError: function() {
      return setTimeout(
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
  
})( 'object'   === typeof module    ? module.exports : (this.KadOH = this.KadOH || {}),
    'function' === typeof this.when ? this.when      : false                          );
