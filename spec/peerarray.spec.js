describe('PeerArray', function() {
  beforeEach(function() {
    PeerArray = KadOH.PeerArray;
    Peer = KadOH.Peer;
    SHA1 = KadOH.globals._digest;
    ip = '234.5.78.4';
    port = 1234;
    id = SHA1(ip + ':' + port);
  });

  describe('method add', function() {
    beforeEach(function() {
      arr = new PeerArray();
    });

    it('should be possible to add one triple', function () {
      arr.add([ip, port, id]);
      expect(arr.getPeer(0).equals(new Peer(ip, port))).toBeTruthy();
    });

    it('should be possible to add one peer', function () {
      var peer = new Peer(ip, port);
      arr.add(peer);
      expect(arr.getPeer(0).equals(peer)).toBeTruthy();
    });

    it('should be possible to add an array of triple', function () {
      arr.add([
        [ip, port, id], 
        [ip, port+1, SHA1(ip + ':' + (port+1))]
        ]);
      expect(arr.getPeer(0).equals(new Peer(ip, port))).toBeTruthy();
      expect(arr.getPeer(1).equals(new Peer(ip, port+1))).toBeTruthy();
    });

    it('should be possible to add an array of peers', function () {
      var peer1 = new Peer(ip, port);
      var peer2 = new Peer(ip, port+1);
      arr.add([peer1, peer2]);
      expect(arr.getPeer(0).equals(peer1)).toBeTruthy();
      expect(arr.getPeer(1).equals(peer2)).toBeTruthy();
    });

    it('should not create duplicate', function() {
      var peer1 = new Peer(ip, port);
      var peer2 = new Peer(ip, port);
      arr.add([peer1, peer2]);
      expect(arr.length()).toEqual(1);

    });

    it('should be possible to add a PeerArray instance', function () {
      var peer1 = new Peer(ip, port);
      var peer2 = new Peer(ip, port+1);
      var pa = new PeerArray([peer1,peer2]);
      arr.add(pa);
      expect(arr.getPeer(0).equals(peer1)).toBeTruthy();
      expect(arr.getPeer(1).equals(peer2)).toBeTruthy();
    });
  });

  describe('method contains', function() {
    beforeEach(function() {
      arr = new PeerArray();
    });

    it('should respond correctly', function () {
      arr.add([ip, port, id]);
      expect(arr.contains(new Peer(ip, port))).toBeTruthy();
      expect(arr.contains(new Peer(ip, port+1))).toBeFalsy();
    });
  });

  describe('method remove', function() {
    beforeEach(function() {
      arr = new PeerArray();
    });

    it('should works', function () {
      arr.add([new Peer(ip, port), new Peer(ip, port+1), new Peer(ip, port+2), new Peer(ip, port+3)]);
      arr.remove([new Peer(ip, port+1),new Peer(ip, port+3) ]);

      expect(arr.contains(new Peer(ip, port  ))).toBeTruthy();
      expect(arr.contains(new Peer(ip, port+2))).toBeTruthy();
      expect(arr.contains(new Peer(ip, port+1))).toBeFalsy();
      expect(arr.contains(new Peer(ip, port+3))).toBeFalsy();
    });
  });
});