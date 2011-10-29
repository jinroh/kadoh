describe('KBucket', function() {
  
  beforeEach(function() {
    KadOH = (typeof require === 'function') ? require('./dist/KadOH.js') : KadOH;
    KBucket = KadOH.KBucket;
    
    SHA1 = KadOH.globals._digest;
    Peer = KadOH.Peer;
    
    min = 0;
    max = KadOH.globals._B;

    parent_id = SHA1('ip:port');
  });
  
  it('should be a function', function() {
    expect(typeof KBucket).toBe('function');
  });
  
  describe('When I instanciate a new KBucket', function() {
    beforeEach(function() {
      kbucket = new KBucket(min, max, parent_id);
    });
    
    it('should be empty, from 0 to _B with the right parent id', function() {
      expect(kbucket.getSize()).toEqual(0);
      
      expect(kbucket.getRange().min).toEqual(0);
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
      expect(function() { kbucket.removePeer(SHA1('foo')) }).toThrow();
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
}); 
