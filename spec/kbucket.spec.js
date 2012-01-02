describe('KBucket', function() {
  
  beforeEach(function() {
    KBucket = KadOH.KBucket;
    
    SHA1 = KadOH.globals.DIGEST;
    Peer = KadOH.Peer;
    
    min = 0;
    max = KadOH.globals.B;

    parent_id = SHA1('ip:port');
  });
  
  it('should be a function', function() {
    var kbucket = new KBucket(parent_id, min, max);
    expect(KBucket).toBeFunction();
    expect(kbucket instanceof KadOH.PeerArray).toBeTruthy();
    kbucket.stopRefreshTimeout();
  });
  
  describe('When I instanciate a new KBucket', function() {
    beforeEach(function() {
      kbucket = new KBucket(parent_id, min, max);
    });
    afterEach(function() {
      kbucket.stopRefreshTimeout();
    });
    
    it('should be empty, from 1 to _B with the right parent id', function() {
      expect(kbucket.length()).toEqual(0);
      
      expect(kbucket.getRange().min).toEqual(0);
      expect(KadOH.globals.B).toEqual(kbucket.getRange().max);
      
      expect(kbucket._parentID).toEqual(parent_id);
    });
    
    it('should have a new peer when i add one', function() {
      kbucket.addPeer(new Peer('127.0.0.1:1234'));
      
      expect(kbucket.length()).toEqual(1);
    });
    
    it('should be empty when i add and remove a peer', function() {
      var peer = new Peer('127.0.0.1:1234');
      kbucket.addPeer(peer);
      kbucket.removePeer(peer);
      
      expect(kbucket.length()).toEqual(0);
    });
    
    it('should update a peer if i add an already existing one', function() {
      var peer1 = new Peer('127.0.0.1:1234');
      var peer2 = new Peer('127.0.0.1:4321');
      kbucket.addPeer(peer1);
      kbucket.addPeer(peer2);
      
      expect(kbucket.getNewestPeer()).toBe(peer2);
      
      kbucket.addPeer(peer1);
      expect(kbucket.getNewestPeer()).toBe(peer1);
    });
    
    it('should be possible to retrieve a certain number of peers from it', function() {
      for (var i=0; i < KadOH.globals.K; i++) {
        kbucket.addPeer(new Peer('127.0.0.1:' + 1025+i));
      }
      expect(kbucket.getPeers(KadOH.globals.K - 1).length()).toEqual(KadOH.globals.K - 1);
      expect(kbucket.getPeers(KadOH.globals.K).getRawArray().map(function(peer) {
        return peer.getAddress().split(':')[1];
      })).toBeDescSorted();
    });

    it('should exclude certain peers', function() {
      for (var i=0; i < KadOH.globals.K; i++) {
        kbucket.addPeer(new Peer('127.0.0.1:' + 1025+i));
      }
      var exclude = [new Peer('127.0.0.1:' + 1026)];
      expect(kbucket.getPeers(kbucket.length(), exclude).contains(exclude)).toBeFalsy();
    });
    
  });
  
  describe('When I have a full KBucket', function() {
    
    beforeEach(function() {
      kbucket = new KBucket(parent_id, min, max);
      for (var i=0; i < KadOH.globals.K; i++) {
        kbucket.addPeer(new Peer('127.0.0.1:' + 1025+i));
      }
    });
    afterEach(function() {
      kbucket.stopRefreshTimeout();
    });

    it('should not be able to add a new peer', function() {
      expect(function() { kbucket.addPeer(new Peer('127.0.0.1:2000')); }).toThrow();
    });
  });
  
  describe('When I want to split the KBucket', function() {
    
    beforeEach(function() {
      old_range = kbucket.getRange();
      new_kbucket = kbucket.split();
    });
    
    afterEach(function() {
      new_kbucket.stopRefreshTimeout();
    });

    it('should return me a new kbucket with the right range', function() {
      expect(new_kbucket.getRange().min).toEqual(0);
      expect(new_kbucket.getRange().max).toEqual(kbucket.getRange().min);
    });
    
    it('should change the KBucket\'s range min', function() {
      expect(kbucket.getRange().max).toEqual(old_range.max);
      expect(kbucket.getRange().min).toEqual(old_range.max - 1);
    });
    
  });
});
