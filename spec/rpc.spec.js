xdescribe('RPC', function() {
  
  beforeEach(function() {
    RPC = KadOH.protocol.RPC;
    SHA = KadOH.globals.DIGEST;
    jsonrpc = KadOH.protocol.jsonrpc2;
    
    peer = new Peer(['127.0.0.1:321']);
    request = jsonrpc.buildRequest('foo', 'bar');
  });
  
  it('should be a function', function() {
    expect(RPC).toBeFunction();
  });
  
  it('should have a `then` function', function() {
    var rpc = new RPC(peer, request);
    expect(rpc.then).toBeFunction();
  });
  
  it('should have all the getters', function() {
    var rpc = new RPC(peer, request);
    expect(rpc.getID).toBeFunction();
    expect(rpc.getDST().equals(peer)).toBeTruthy();
    expect(rpc.getRequest()).toBeObject();
  });
  
});