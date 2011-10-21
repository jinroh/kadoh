var Peer = Class.create({
  
  initialize: function(ip, port, id) {
    this.address = ip;
    this.port = port;
    
    if (typeof id === 'undefined') {
      this.id = this._generateId();
    } else {
      this.id = id;
    }
  },
  
  // Public
  toString: function() {
    return '<' + this.id + '; ' + this.address + ':' + this.port + '>';
  },
  
  // Private
  _generateId: function() {
    return _digest(this.ip + ':' + this.port); 
  }
  
});
