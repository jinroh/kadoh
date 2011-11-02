describe('globals', function() {
  beforeEach(function() {
    globals = KadOH.globals;
  });
  
  it('should be defined', function() {
    expect(globals).toBeDefined();
  });
  
  it('should define _k', function() {
    expect(globals._k).toBeDefined();
    expect(globals._k).toBeNumber();
  });
  
  it('should define _alpha', function() {
    expect(globals._alpha).toBeDefined();
    expect(globals._alpha).toBeNumber();
  });
  
  it('should define _B', function() {
    expect(globals._B).toBeDefined();
    expect(globals._B).toBeNumber();
  });
  
  it('should define a digest function', function() {
    expect(globals._digest).toBeDefined();
    expect(globals._digest).toBeFunction();
  });
});