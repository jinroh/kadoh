describe('KBucket', function() {
  
  beforeEach(function() {
    KadOH = (typeof require === 'function') ? require('./dist/KadOH.js') : KadOH;
    RoutingTable = KadOH.RoutingTable;
    globals = KadOH.globals;
    
    SHA1 = KadOH.globals._digest;
    Peer = KadOH.Peer;

    parent_id = SHA1('ip:port');
  });
  
  it('should be a function', function() {
    expect(typeof RoutingTable).toBe('function');
  });
  
  describe('when I instanciate a new RoutingTable', function() {
    
    beforeEach(function() {
      routing_table = new RoutingTable(parent_id);
    });
    
    it('should have one KBucket [0 -> _B]', function() {
      expect(routing_table.howManyKBuckets()).toEqual(1);
      
      var kbucket = routing_table.getKBuckets()[0];
      expect(kbucket.getRange().min).toBe(0);
      expect(kbucket.getRange().max).toBe(globals._B);
    });
    
    it('should be possible to add a new peer and to retrieve it', function() {
      routing_table.addPeer(new Peer('127.0.0.1', 54321));
      
      expect(routing_table.getKBuckets()[0].getSize()).toEqual(1);
      
      expect(function() {
        routing_table.getPeer(SHA1('127.0.0.1:54321'));
      }).not.toThrow();
      
      expect(routing_table.getPeer(SHA1('127.0.0.1:54321')).getId()).toEqual(SHA1('127.0.0.1:54321'));
    });
    
  });
  
  describe('when a add more than _k elements to it', function() {
    
    it('should split', function() {
       for (var i = 0; i < KadOH.globals._k; i++) {
        routing_table.addPeer(new Peer('127.0.0.1', (1025 + i)));
      }
      
      expect(routing_table.howManyKBuckets()).toEqual(2);
    });
    
  });
  
});