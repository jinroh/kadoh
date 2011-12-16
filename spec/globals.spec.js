describe('globals', function() {
  beforeEach(function() {
    globals = KadOH.globals;
  });
  
  it('should be defined', function() {
    expect(globals).toBeDefined();
  });
  
  it('should define K', function() {
    expect(globals.K).toBeDefined();
    expect(globals.K).toBeNumber();
  });
  
  it('should define ALPHA', function() {
    expect(globals.ALPHA).toBeDefined();
    expect(globals.ALPHA).toBeNumber();
  });
  
  it('should define BETA', function() {
    expect(globals.BETA).toBeDefined();
    expect(globals.BETA).toBeNumber();
  });
  
  it('should define B', function() {
    expect(globals.B).toBeDefined();
    expect(globals.B).toBeNumber();
  });

  it('should define a timeout error for rpcs', function() {
    expect(globals.TIMEOUT_RPC).toBeDefined();
    expect(globals.TIMEOUT_RPC).toBeNumber();
  });
  
  it('should define a digest function', function() {
    expect(globals.DIGEST).toBeDefined();
    expect(globals.DIGEST).toBeFunction();
  });
  
  it('should define a regex for id validations function', function() {
    expect(globals.REGEX_NODE_ID).toBeDefined();
  });
  
  it('should define all the RPC functions', function() {
    expect(globals.RPCS).toBeDefined();
    expect(globals.RPCS).toBeArray();
  });
});