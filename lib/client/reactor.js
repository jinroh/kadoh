// Dep: [KadOH]/core/class

(function(exports) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  
  KadOH.reactor = Class({
    
    initialize: function() {
      this._rpcs = [];
    },
    
    deferred: function(rpc_method, callback) {
      
    }
    
  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
