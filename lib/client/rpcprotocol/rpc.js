// Dep: [KadOH]/core/class
// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/util/when

/**
 * Extend a defer object and 
 */
(function(exports, when) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  var Peer = KadOH.Peer;
  var globals = KadOH.globals;
  
  KadOH.protocol = KadOH.protocol || {};
  
  KadOH.protocol.RPC = Class({
    initialize: function(id, dst, request) {
      this._id = id;
      this._request = request;
      
      this._dst = new Peer(dst.split(':'));
      
      // extend RPC object with a defer object
      _extend(this, when.defer());
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
  
})( 'object'   === typeof module    ? module.exports : (this.KadOH = this.KadOH || {}),
    'function' === typeof this.when ? this.when      : false                          );
