require('chai').should();
var expect = require('chai').expect;

describe('Peer', function() {
  var Peer,
   ip = '234.5.78.4:1234',
   id = 'adb3bf3007abe686cf742851fe561bd1890b6295';
  
  beforeEach(function() {
    Peer = require('../lib/dht/peer');
  });

  it('should be there', function() {
    Peer.should.be.ok;
    Peer.should.be.a('function');
  });
  
  describe('When I instantiate a new Peer', function() {
    var peer;

    beforeEach(function() {
      peer = new Peer(ip, id);
    });
    
    it('should respond to `getAddress()` and `getID()`', function() {
      peer.getAddress.should.be.a('function');
      peer.getID.should.be.a('function');
    });

    it('should get a socket which is the ip:port string', function() {
      expect(peer.getAddress()).to.equal(ip);
    });

    it('should get the ID', function() {
      expect(peer.getID()).to.equal(id);
    });

  });
  
  it('should be possible to instanciate a peer using a triple', function() {
    var peer1 = new Peer(['127.0.0.1:1234', id]);
    var peer2 = new Peer('127.0.0.1:1234', id);
    expect(peer1.getAddress()).to.equal('127.0.0.1:1234');
    expect(peer1.getID()).to.equal(id);
    expect(peer1.equals(peer2)).to.be.true;
  });

  it('should be possible to test their equality', function() {
    var id1 = 'adb3bf3007abe686cf742851fe561bd1890b6295';
    var id2 = '0beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33';
    var peer1 = new Peer(['127.0.0.1:1234', id1]);
    var peer2 = new Peer('127.0.0.1:1234', id1);
    var peer3 = new Peer(['127.0.0.1:1235', id2]);
    
    expect(peer1.equals(peer2)).to.be.true;
    expect(peer1.equals(peer3)).to.be.false;
  });

  it('should prevent bad ID', function() {
    var test = function() {
      var peer = new Peer(ip, 'abc');
    };
    expect(test).to.throw(Error);
  });
  
});