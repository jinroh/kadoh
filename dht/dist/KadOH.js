(function(global) {
  // Maximum number of contacts in a k-bucket
  global.k = 6;

  // Degree of parallelism for network calls
  global.alpha = 3;

  // sha1 function
  globals._sha1 = Crypto.SHA1;
})(this);
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