describe('Peer', function() {  
  beforeEach(function() {
    Peer = KadOH.Peer;
    SHA1 = KadOH.globals._digest;
  });
  
  it('should be a function', function() {
    expect(Peer).toBeFunction();
  });
  
  describe('When I instantiate a new Peer', function() {
    
    var ip = '234.5.78.4';
    var port = 1234;
    var peer;
    
    beforeEach(function() {
      peer = new Peer(ip, port);
    });
    
    it('should respond to `getSocket()` and `getId()`', function() {
      expect(typeof peer.getSocket).toBe('function');
      expect(typeof peer.getId).toBe('function');
    });

    it('should get a socket which is the ip:port string', function() {
      expect(peer.getSocket()).toEqual(ip + ':' + port);
    });

    it('should get an ID which is the SHA1 of IP:PORT', function() {
      expect(peer.getId()).toEqual(SHA1(ip + ':' + port));
    });
    
  });
  
  it('should be possible to instanciate a peer using a triple', function() {
    var peer = new Peer(['127.0.0.1', 1234]);
    
    expect(peer.getSocket()).toEqual('127.0.0.1:1234');
    expect(peer.getId()).toEqual(SHA1('127.0.0.1:1234'));
  });
  
});