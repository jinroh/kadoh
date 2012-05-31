expect = require('chai').expect;

describe('globals', function() {
  globals = require('../lib/globals');
  
  it('should be defined', function() {
    expect(globals).to.be.ok;
  });
  
  it('should define K', function() {
    expect(globals.K).to.be.ok;
    expect(globals.K).to.be.a('number');
  });
  
  it('should define ALPHA', function() {
    expect(globals.ALPHA).to.be.ok;
    expect(globals.ALPHA).to.be.a('number');
  });
  
  it('should define BETA', function() {
    expect(globals.BETA).to.be.ok;
    expect(globals.BETA).to.be.a('number');
  });
  
  it('should define B', function() {
    expect(globals.B).to.be.ok;
    expect(globals.B).to.be.a('number');
  });

  it('should define a timeout error for rpcs', function() {
    expect(globals.TIMEOUT_RPC).to.be.ok;
    expect(globals.TIMEOUT_RPC).to.be.a('number');
  });
  
  it('should define a regex for id validations function', function() {
    expect(globals.REGEX_NODE_ID).to.be.ok;
    expect(globals.REGEX_NODE_ID).to.be.instanceof(RegExp);
  });
  
  it('should define all the RPC functions', function() {
    expect(globals.RPCS).to.be.ok;
    expect(globals.RPCS).to.be.instanceof(Array);
  });
});