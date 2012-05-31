var expect = require('chai').expect;
var helpers = require('./helpers');

var Peer = require('../lib/dht/peer'),
    crypto = require('../lib/util/crypto');

var address = function() {
  var text = "";
  var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < 20; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

var id = function(address) {
  return address ? crypto.digest.SHA1(address) : crypto.digest.SHA1(Math.random().toString());
}

var triple = function() {
  return [address(), id()];
}

describe('PeerArray', function() {
  var PeerArray = require('../lib/util/peerarray'),
      arr;

  beforeEach(function() {
    arr = new PeerArray();
  });

  it('should be defined', function() {
    expect(PeerArray).to.be.ok;
    expect(PeerArray).to.be.a('function');
  });

  describe('#add', function() {
    it('should be possible to add one triple', function() {
      var peer = triple();
      arr.addPeer(peer);
      expect(arr.getPeer(0).equals(new Peer(peer))).to.be.true;
    });

    it('should be possible to add one peer', function() {
      var peer = new Peer(triple());
      arr.addPeer(peer);
      expect(arr.getPeer(0).equals(peer)).to.be.true;
    });

    it('should be possible to add an array of triple', function() {
      var peer1 = triple(), peer2 = triple();
      arr.add([peer1, peer2]);
      expect(arr.getPeer(0).equals(new Peer(peer1))).to.be.true;
      expect(arr.getPeer(1).equals(new Peer(peer2))).to.be.true;
    });

    it('should be possible to add an array of peers', function() {
      var peer1 = new Peer(triple());
      var peer2 = new Peer(triple());
      arr.add([peer1, peer2]);
      expect(arr.getPeer(0).equals(peer1)).to.be.true;
      expect(arr.getPeer(1).equals(peer2)).to.be.true;
    });

    it('should not create duplicate', function() {
      var peer = triple();
      var peer1 = new Peer(peer);
      var peer2 = new Peer(peer);
      arr.add([peer1, peer2]);
      expect(arr.size()).to.equal(1);
    });

    it('should be possible to add a PeerArray instance', function() {
      var peer1 = new Peer(triple());
      var peer2 = new Peer(triple());
      var pa = new PeerArray([peer1,peer2]);
      arr.add(pa);
      expect(arr.getPeer(0).equals(peer1)).to.be.true;
      expect(arr.getPeer(1).equals(peer2)).to.be.true;
    });
  });

  describe('#contains', function() {
    it('should respond correctly', function() {
      var peer = triple();
      arr.addPeer(peer);
      expect(arr.contains(new Peer(peer))).to.be.true;
      expect(arr.contains(new Peer(triple()))).to.be.false;
    });
  });

  describe('#remove', function() {
    it('should works', function() {
      var triples = [];
      for (var i = 0; i < 10; i++) triples.push(triple());
      var peers = triples.map(function(peer) {
        return new Peer(peer);
      });

      arr.add(peers);
      arr.remove([peers[2],  peers[4]]);

      expect(arr.contains(peers[0])).to.be.true;
      expect(arr.contains(peers[2])).to.be.false;
      expect(arr.contains(peers[4])).to.be.false;
    });
  });

  describe('#clone', function() {
    it('should copy all the properties', function() {
      var peers = [];
      for (var i = 0; i < 10; i++) peers.push(new Peer(triple()));
      arr.add(peers);
      var clone = arr.clone();
      expect(clone).not.to.equal(arr);
      expect(clone.toArray()).to.not.equal(arr.toArray());
      expect(clone.toArray()).to.eql(arr.toArray());
    });
  });

});

describe('SortedPeerArray', function() {
  
  var PeerArray = require('../lib/util/xorsorted-peerarray'),
      nodeID = id(),
      arr;

  beforeEach(function() {
    arr = new PeerArray().setRelative(nodeID);
  });

  describe('#clone', function() {
    it('should copy all the properties', function() {
      var peers = [];
      for (var i = 0; i < 10; i++) peers.push(new Peer(triple()));
      arr.add(peers);
      var clone = arr.clone();
      expect(clone).not.to.equal(arr);
      expect(clone.toArray()).to.not.equal(arr.toArray());
      expect(clone.toArray()).to.eql(arr.toArray());
      expect(clone._relative).to.equal(arr._relative);
      expect(clone._newClosestIndex).to.equal(arr._newClosestIndex);
    });
  });

  describe('sorted array', function() {
    it('should be a sorted array', function() {
      var peers = [];
      for (var i = 0; i < 10; i++) {
        peers.push(new Peer(address(), id()));
      }
      arr.add(peers);
      expect(arr.toArray()).to.be.sorted(function(a, b) {
        return crypto.compareHex(a.getID(), b.getID(), nodeID);
      });
    });

  });

});