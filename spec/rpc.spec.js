describe('RPC', function() {
  
  beforeEach(function() {
    RPC = KadOH.protocol.RPC;
    SHA = KadOH.globals._digest;
  });
  
  it('should be a function', function() {
    expect(RPC).toBeFunction();
  });
  
  it('should have a `then` function', function() {
    var rpc = new RPC(123, '127.0.0.1:321', {});
    expect(rpc.then).toBeFunction();
  });
  
  it('should have all the getters', function() {
    var rpc = new RPC(123, '127.0.0.1:321', {request: 'foo', params: 'bar'});
    expect(rpc.getID()).toEqual(123);
    expect(rpc.getDST() instanceof KadOH.Peer).toBe(true);
    expect(rpc.getDSTSocket()).toEqual('127.0.0.1:321');
    expect(rpc.getDSTID()).toEqual(SHA('127.0.0.1:321'));
    expect(rpc.getRequest()).toBeObject();
  });
  
});