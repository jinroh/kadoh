var Node = Class.create({
  
  initialize: function(ip, port, id) {
    if (typeof id === 'undefined') {
      this.id = this._generateId();
    } else {
      this.id = id;
    }
    
    this._routing_table = new RoutingTable(this.id);
  },
  
  _generateId: function() {
    return _digest(this.ip + ':' + this.port);
  }
  
});
