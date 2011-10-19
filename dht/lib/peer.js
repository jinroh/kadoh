var Peer = (function() {
  var Peer = function(ip, port, id) {
    this.address = ip;
    this.port = port;
    
    if (typeof id === 'undefined') {
      this.id = this._generateId();
    } else {
      this.id = id;
    }
  };
  
  // Public
  var toString = function() {
    return '<' + this.id + '; ' + this.address + ':' + this.port + '>';
  };
  
  // Private
  var _generateId = function() {
    return _sha1(this.ip + ':' + this.port); 
  };
  
  Peer.prototype = {
    // Public
      constructor: Peer
    , toString: toString
    
    // Private
    , _generateId: _generateId
  };
  
  return Peer;
})();