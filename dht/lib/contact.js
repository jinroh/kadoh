(function() {
  Contact = function(ip, port, id) {
    this.address = ip;
    this.port = port;
    
    if (typeof id === 'undefined') {
      this.id = this._generateId();
    } else {
      this.id = id;
    }
  };
  
  // Public
  Contact.prototype.toString = function() {
    return '<' + this.id + '; ' + this.address + ':' + this.port + '>';
  };
  
  // Private
  Contact.prototype._generateId = function() {
    return Crypto.SHA1(this.ip + ':' + this.port); 
  };
})();