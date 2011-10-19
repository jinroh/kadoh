var Node = (function() {
  var Node = function(ip, port, id) {
    if (typeof id === 'undefined') {
      this.id = this._generateId();
    } else {
      this.id = id;
    }
    
    this._routing_table = new RoutingTable(this.id);
  };
  
  var _generateId = function() {
    return _sha1(this.ip + ':' + this.port);
  };
  
  Node.prototype = {
    // Public
      constructor: Node
      
    // Private
    , _generateId: _generateId
  };
  
  return Node;
})();