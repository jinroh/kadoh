describe('KBucket', function() {
  
  beforeEach(function() {
    KBucket = KadOH.KBucket;
    
    SHA1 = KadOH.globals._digest;
    Peer = KadOH.Peer;
    
    min = 1;
    max = KadOH.globals._B;

    parent_id = SHA1('ip:port');
  });
  
  it('should be a function', function() {
    expect(KBucket).toBeFunction();
  });
  
  describe('When I instanciate a new KBucket', function() {
    beforeEach(function() {
      kbucket = new KBucket(min, max, parent_id);
    });
    
    it('should be empty, from 1 to _B with the right parent id', function() {
      expect(kbucket.getSize()).toEqual(0);
      
      expect(kbucket.getRange().min).toEqual(1);
      expect(KadOH.globals._B).toEqual(kbucket.getRange().max);
      
      expect(kbucket._parent_id).toEqual(parent_id);
    });
    
    it('should have a new peer when i add one', function() {
      kbucket.addPeer(new Peer('127.0.0.1', 1234));
      
      expect(kbucket.getSize()).toEqual(1);
    });
    
    it('should be empty when i add and remove a peer', function() {
      var peer = new Peer('127.0.0.1', 1234);
      kbucket.addPeer(peer);
      kbucket.removePeer(peer);
      
      expect(kbucket.getSize()).toEqual(0);
    });
    
    it('should throw an error when removing a non existing peer', function() {
      expect(function() { kbucket.removePeer(SHA1('foo')); }).toThrow();
    });
    
    it('should update a peer if i add an already existing one', function() {
      var peer1 = new Peer('127.0.0.1', 1234);
      var peer2 = new Peer('127.0.0.1', 4321);
      kbucket.addPeer(peer1);
      kbucket.addPeer(peer2);
      
      expect(kbucket.getNewestPeer()).toBe(peer2);
      
      kbucket.addPeer(peer1);
      expect(kbucket.getNewestPeer()).toBe(peer1);
    });
    
    it('should be able to give me the closest peer from a given ID', function() {
      var peer1 = new Peer('foo', 123, Factory.distance(parent_id, 5));
      var peer2 = new Peer('bar', 123, Factory.distance(parent_id, 150));
      
      kbucket.addPeer(peer1);
      kbucket.addPeer(peer2);
      
      expect(kbucket.getClosestPeer(parent_id)).toBe(peer1);
    });
    
  });
  
  describe('When I have a full KBucket', function() {
    
    beforeEach(function() {
      kbucket = new KBucket(min, max, parent_id);
      for (var i=0; i < KadOH.globals._k; i++) {
        kbucket.addPeer(new Peer('127.0.0.1', 1025+i));
      }
    });

    it('should not be able to add a new peer', function() {
      expect(function() { kbucket.addPeer(new Peer('127.0.0.1', 2000)); }).toThrow();
    });
  });
  
  describe('When I want to split the KBucket', function() {
    
    it('should return me a new kbucket with the right range', function() {
      var new_kbucket = kbucket.split();
      
      expect(new_kbucket.getRange().min).toEqual(1);
      expect(new_kbucket.getRange().max).toEqual(kbucket.getRange().min - 1);
    });
    
    it('should change the KBucket\'s range min', function() {
      old_range = kbucket.getRange();
      kbucket.split();
      
      expect(kbucket.getRange().max).toEqual(old_range.max);
      expect(kbucket.getRange().min).toEqual((old_range.max+old_range.min+1)/2);
    });
        
  });
}); 
