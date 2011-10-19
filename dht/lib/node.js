(function() {
  var Node = function(ip, port, id) {
    
    if (typeof id === 'undefined') {
      this.id = this._generateId();
    }
  };
  
  Node.prototype = {
    
  };
  
  var _generateId = function() {
    return Crypto.SHA1(this.ip + ':' + this.port);
  };
  
  return Node;
})();