describe('PeerArray', function() {
  beforeEach(function() {
    PeerArray = KadOH.PeerArray;
    Peer = KadOH.Peer;
    SHA1 = KadOH.globals.DIGEST;
    ip = '234.5.78.4';
    port = 1234;
    socket = ip + ':' + port;
    id = SHA1(socket);
    arr = new PeerArray();
  });

  describe('#add', function() {
    it('should be possible to add one triple', function() {
      arr.addPeer([socket, id]);
      expect(arr.getPeer(0).equals(new Peer(socket))).toBeTruthy();
    });

    it('should be possible to add one peer', function() {
      var peer = new Peer(socket);
      arr.addPeer(peer);
      expect(arr.getPeer(0).equals(peer)).toBeTruthy();
    });

    it('should be possible to add an array of triple', function() {
      arr.add([
        [socket, id], 
        [ip + ':' + (port+1), SHA1(ip + ':' + (port+1))]
        ]);
      expect(arr.getPeer(0).equals(new Peer(ip + ':' + port))).toBeTruthy();
      expect(arr.getPeer(1).equals(new Peer(ip + ':' + (port+1)))).toBeTruthy();
    });

    it('should be possible to add an array of peers', function() {
      var peer1 = new Peer(socket);
      var peer2 = new Peer(ip + ':' + (port+1));
      arr.add([peer1, peer2]);
      expect(arr.getPeer(0).equals(peer1)).toBeTruthy();
      expect(arr.getPeer(1).equals(peer2)).toBeTruthy();
    });

    it('should not create duplicate', function() {
      var peer1 = new Peer(socket);
      var peer2 = new Peer(socket);
      arr.add([peer1, peer2]);
      expect(arr.length()).toEqual(1);
    });

    it('should be possible to add a PeerArray instance', function() {
      var peer1 = new Peer(socket);
      var peer2 = new Peer(ip + ':' + (port+1));
      var pa = new PeerArray([peer1,peer2]);
      arr.add(pa);
      expect(arr.getPeer(0).equals(peer1)).toBeTruthy();
      expect(arr.getPeer(1).equals(peer2)).toBeTruthy();
    });
  });

  describe('#contains', function() {
    it('should respond correctly', function() {
      arr.addPeer([socket, id]);
      expect(arr.contains(new Peer(socket))).toBeTruthy();
      expect(arr.contains(new Peer(ip + ':' + (port+1)))).toBeFalsy();
    });
  });

  describe('#remove', function() {
    it('should works', function() {
      arr.add([new Peer(ip + ':' + port), new Peer(ip + ':' + (port+1)), new Peer(ip + ':' + (port+2)), new Peer(ip + ':' + (port+3))]);
      arr.remove([new Peer(ip + ':' + (port+1)),new Peer(ip + ':' + (port+3)) ]);

      expect(arr.contains(new Peer(ip + ':' + port))).toBeTruthy();
      expect(arr.contains(new Peer(ip + ':' + (port+2)))).toBeTruthy();
      expect(arr.contains(new Peer(ip + ':' + (port+1)))).toBeFalsy();
      expect(arr.contains(new Peer(ip + ':' + (port+3)))).toBeFalsy();
    });
  });

  describe('#clone', function() {
    it('should copy all the properties', function() {
      var clone = arr.clone();
      expect(clone).not.toBe(arr);
      expect(clone._PEERS).not.toBe(arr._PEERS);
      expect(clone._PEERS).toEqual(arr._PEERS);
    });
  });

});

describe('SortedPeerArray', function() {
  
  beforeEach(function() {
    PeerArray = KadOH.XORSortedPeerArray;
    Peer = KadOH.Peer;
    SHA1 = KadOH.globals.DIGEST;
    ip = '234.5.78.4';
    port = 1234;
    socket = ip + ':' + port;
    id = SHA1(socket);
    arr = new PeerArray().setRelativeNodeID(id);
    expect(arr instanceof KadOH.PeerArray).toBeTruthy();
  });

  describe('#add', function() {
    it('should be possible to add one triple', function() {
      arr.addPeer([socket, id]);
      expect(arr.getPeer(0).equals(new Peer(socket))).toBeTruthy();
    });

    it('should be possible to add one peer', function() {
      var peer = new Peer(socket);
      arr.addPeer(peer);
      expect(arr.getPeer(0).equals(peer)).toBeTruthy();
    });

    it('should be possible to add an array of triple', function() {
      arr.add([
        [socket, id], 
        [ip + ':' + (port+1), SHA1(ip + ':' + (port+1))]
        ]);
      expect(arr.getPeer(0).equals(new Peer(ip + ':' + port))).toBeTruthy();
      expect(arr.getPeer(1).equals(new Peer(ip + ':' + (port+1)))).toBeTruthy();
    });

    it('should be possible to add an array of peers', function() {
      var peer1 = new Peer(socket);
      var peer2 = new Peer(ip + ':' + (port+1));
      arr.add([peer1, peer2]);
      expect(arr.getPeer(0).equals(peer1)).toBeTruthy();
      expect(arr.getPeer(1).equals(peer2)).toBeTruthy();
    });

    it('should not create duplicate', function() {
      var peer1 = new Peer(socket);
      var peer2 = new Peer(socket);
      arr.add([peer1, peer2]);
      expect(arr.length()).toEqual(1);
    });

    it('should be possible to add a PeerArray instance', function() {
      var peer1 = new Peer(socket);
      var peer2 = new Peer(ip + ':' + (port+1));
      var pa = new PeerArray([peer1,peer2], id);
      arr.add(pa);
      expect(arr.getPeer(0).equals(peer1)).toBeTruthy();
      expect(arr.getPeer(1).equals(peer2)).toBeTruthy();
    });
  });

  describe('#contains', function() {
    it('should respond correctly', function() {
      arr.addPeer([socket, id]);
      expect(arr.contains(new Peer(socket))).toBeTruthy();
      expect(arr.contains(new Peer(ip + ':' + (port+1)))).toBeFalsy();
    });
  });

  describe('#remove', function() {
    it('should works', function() {
      arr.add([new Peer(ip + ':' + port), new Peer(ip + ':' + (port+1)), new Peer(ip + ':' + (port+2)), new Peer(ip + ':' + (port+3))]);
      arr.remove([new Peer(ip + ':' + (port+1)),new Peer(ip + ':' + (port+3)) ]);

      expect(arr.contains(new Peer(ip + ':' + port))).toBeTruthy();
      expect(arr.contains(new Peer(ip + ':' + (port+2)))).toBeTruthy();
      expect(arr.contains(new Peer(ip + ':' + (port+1)))).toBeFalsy();
      expect(arr.contains(new Peer(ip + ':' + (port+3)))).toBeFalsy();
    });
  });

  describe('#clone', function() {
    it('should copy all the properties', function() {
      var clone = arr.clone();
      expect(clone).not.toBe(arr);
      expect(clone._PEERS).not.toBe(arr._PEERS);
      expect(clone._PEERS).toEqual(arr._PEERS);
      expect(clone._relativeNodeID).toEqual(arr._relativeNodeID);
      expect(clone._newClosestIndex).toEqual(arr._newClosestIndex);
    });
  });

  describe('sorted array', function() {
    it('should be a sorted array', function() {
      var peers = [];
      for (var i = 0; i < KadOH.globals.B * 2; i++) {
        peers.push(new Peer(ip + ':' + port, Factory.distance(id, Math.floor(Math.random() * KadOH.globals.B))));
      }
      arr.add(peers);
      distance_array = arr.getRawArray().map(function(peer) {
        return KadOH.util.Crypto.distance(peer.getID(), id);
      });
      expect(distance_array).toBeAscSorted();
    });

  });

  describe('relative node id', function() {
    it('should have the good relative node id', function() {
      expect(arr.isSortedByDistanceTo(id)).toBeTruthy();
    });
  });

});