(function() {
  Contact = function(id, ip, port) {
    this.id = id;
    this.address = ip;
    this.port = port;
  };
  
  Contact.prototype.toString = function() {
    return '<' + this.id + '; ' + this.address + ':' + this.port + '>';
  };
})();