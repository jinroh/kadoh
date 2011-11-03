// Dep: [KadOH]/core/class
// Dep: [KadOH]/reactor

(function(exports) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  
  KadOH.Protocol = Class({
    
    initialize: function(node) {
      this._node = node;
      this._reactor = new KadOH.Reactor(this);
    },
    
    PING: function(deferred) {
      var ping = this._node.ping();
      
      deferred.resolve(ping)
      return deferred.promise;
    },
    
    FIND_NODE: function(deferred, id) {
      
    }
    
  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
