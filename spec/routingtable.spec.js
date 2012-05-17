describe('Routing Table', function() {
  
  beforeEach(function() {
    RoutingTable = KadOH.RoutingTable;
    globals = KadOH.globals;
    SHA1    = globals.DIGEST;
    Peer    = KadOH.Peer;
    Crypto  = KadOH.util.Crypto;

    parent_id = SHA1('ip:port');
  });
  
  beforeEach(function() {
    routing_table = new RoutingTable(parent_id);
  });
  afterEach(function() {
    routing_table.stop();
  });

  it('should be a function', function() {
    expect(RoutingTable).toBeFunction();
  });
  
  describe('when I instanciate a new RoutingTable', function() {
    
    it('should have one KBucket [0 -> _B]', function() {
      expect(routing_table.howManyKBuckets()).toEqual(1);
      
      var kbucket = routing_table.getKBuckets()[0];
      expect(kbucket.getRange().min).toEqual(0);
      expect(kbucket.getRange().max).toEqual(globals.B);
    });
    
    it('should be possible to add a new peer and to retrieve it', function() {
      var peer = new Peer('127.0.0.1:54321', SHA1('127.0.0.1:54321'));
      routing_table.addPeer(peer);
      
      expect(routing_table.getKBuckets()[0].size()).toEqual(1);
      
      expect(function() {
        routing_table.getPeer(peer);
      }).not.toThrow();
      
      expect(routing_table.getPeer(peer).getID()).toEqual(SHA1('127.0.0.1:54321'));
    });

    describe('when I a add more than K elements to it', function() {
      
      it('should split when entering random peers', function() {
         for (var i = 0; i < globals.K +1; i++) {
          routing_table.addPeer(new Peer('127.0.0.1:' + (1025 + i), SHA1('127.0.0.1:' + (1025 + i))));
        }
        expect(routing_table.howManyKBuckets()).toEqual(2);
      });

      it('should update a full the kbucket', function() {
        for (var i = 0; i < globals.K + 1; i++) {
          routing_table.addPeer(
            new Peer('127.0.0.1:' + (1025 + i), Crypto.digest.randomSHA1(parent_id, globals.B-1))
          );
        }
        var kb = routing_table._kbuckets[1];
        expect(kb.isFull()).toBeTruthy();
      });

    });

    describe('with a complete routing table', function() {
      
      beforeEach(function() {
        for (var i = 0; i < KadOH.globals.B - 120; i++) {
          for (var j = 0; j < KadOH.globals.K; j++) {
            routing_table.addPeer(new Peer(i+':'+j, Crypto.digest.randomSHA1(parent_id, globals.B-i)));
          }
        }
      });

    });

  });
  
});