describe('Peer', function() {
  var rID = function() {
    return KadOH.util.Crypto.digest.randomSHA1();
  }

  beforeEach(function() {
    Peer = KadOH.Peer;
    SHA1 = KadOH.globals.DIGEST;
    ip = '234.5.78.4:1234';
    id = rID();
  });
  
  it('should be a function', function() {
    expect(Peer).toBeFunction();
  });
  
  describe('When I instantiate a new Peer', function() {
    
    beforeEach(function() {
      peer = new Peer(ip, id);
    });
    
    it('should respond to `getAddress()` and `getID()`', function() {
      expect(typeof peer.getAddress).toBe('function');
      expect(typeof peer.getID).toBe('function');
    });

    it('should get a socket which is the ip:port string', function() {
      expect(peer.getAddress()).toEqual(ip);
    });

    it('should get the ID', function() {
      expect(peer.getID()).toEqual(id);
    });

  });
  
  it('should be possible to instanciate a peer using a triple', function() {
    var peer1 = new Peer(['127.0.0.1:1234', SHA1('foo')]);
    var peer2 = new Peer('127.0.0.1:1234', SHA1('foo'));
    expect(peer1.getAddress()).toEqual('127.0.0.1:1234');
    expect(peer1.getID()).toEqual(SHA1('foo'));
    expect(peer1.equals(peer2)).toBeTruthy();
  });

  it('should be possible to test their equality', function() {
    var id1 = rID();
    var id2 = rID();
    var peer1 = new Peer(['127.0.0.1:1234', id1]);
    var peer2 = new Peer('127.0.0.1:1234', id1);
    var peer3 = new Peer(['127.0.0.1:1235', id2]);
    
    expect(peer1.equals(peer2)).toBeTruthy();
    expect(peer1.equals(peer3)).toBeFalsy();
  });

  it('should prevent bad ID', function() {
    var test = function() {
      var peer = new Peer(ip, 'abc');
    };
    expect(test).toThrow();
  });
  
});