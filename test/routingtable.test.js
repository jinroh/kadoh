var chai = require('chai'),
    expect = chai.expect;

describe('Routing Table', function() {

  var RoutingTable = require('../lib/dht/routing-table'),
      Peer = require('../lib/dht/peer'),
      globals = require('../lib/globals'),
      crypto = require('../lib/util/crypto'),
      randomSHA1 = crypto.digest.randomSHA1,
      SHA1 = crypto.digest.SHA1;

  var address = 'foo@bar', id = randomSHA1(),
      rt;

  beforeEach(function() {
    rt = new RoutingTable(id);
  });

  afterEach(function() {
    rt.stop();
  });

  it('should be a function', function() {
    expect(RoutingTable).to.be.a('function');
  });
  
  describe('when I instanciate a new RoutingTable', function() {
    
    it('should have one KBucket [0 -> _B]', function() {
      expect(rt.howManyKBuckets()).to.equal(1);
      var kbucket = rt.getKBuckets()[0];
      expect(kbucket.getRange().min).to.equal(0);
      expect(kbucket.getRange().max).to.equal(globals.B);
    });
    
    it('should be possible to add a new peer and to retrieve it', function() {
      var peer = new Peer('127.0.0.1:54321', SHA1('127.0.0.1:54321'));
      rt.addPeer(peer);
      expect(rt.getKBuckets()[0].size()).to.equal(1);
      expect(function() {
        rt.getPeer(peer);
      }).to.not.throw;
      expect(rt.getPeer(peer).getID()).to.equal(SHA1('127.0.0.1:54321'));
    });

    describe('when I a add more than K elements to it', function() {
      
      it('should split when entering random peers', function() {
         for (var i = 0; i < globals.K +1; i++) {
          rt.addPeer(new Peer('127.0.0.1:' + (1025 + i), SHA1('127.0.0.1:' + (1025 + i))));
        }
        expect(rt.howManyKBuckets()).to.equal(2);
      });

      it('should update a full the kbucket', function() {
        for (var i = 0; i < globals.K + 1; i++) {
          rt.addPeer(
            new Peer('127.0.0.1:' + (1025 + i), randomSHA1(id, globals.B-1))
          );
        }
        var kb = rt.getKBuckets()[1];
        expect(kb.isFull()).to.be.true;
      });

    });

    describe('with a complete routing table', function() {
      
      beforeEach(function() {
        for (var i = 0; i < KadOH.globals.B - 120; i++) {
          for (var j = 0; j < KadOH.globals.K; j++) {
            rt.addPeer(new Peer(i+':'+j, randomSHA1(id, globals.B-i)));
          }
        }
      });

    });

  });
  
});