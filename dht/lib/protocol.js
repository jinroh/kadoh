function(exports) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  
  KadOH.protocol = Class({
    
    initialize: function() {
      this._reactor = new KadOH.reactor();
    },
    
    PING: function(callback) {
      // this._reactor.
    },
    
    FIND_NODE: function() {
      
    }
    
  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
