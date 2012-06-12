var expect = require('chai').expect;
var ping = require('./ressources/rpc/ping');
var findnode = require('./ressources/rpc/findnode');

describe('mainline protocol', function() {
  mainline = require('../lib/network/protocol/mainline');
  
  it('should be defined', function() {
    expect(mainline).to.be.ok;
    expect(mainline.decode).to.be.a('function');
    expect(mainline.encode).to.be.a('function');
  });

  describe('encode/decode ping rpcs', function() {
    //hex encoded buffers :
    var ping_req = '64313a74323a5a64313a79313a71313a6164323a6964323'+
    '03aebd52e2eef76eebd9fdc72dd6e3176d62a236a6f65313a71343a70696e6765';

    var ping_res = '64313a74323a5a64313a79313a72313a7264323a6964323'+
    '03aebd52e2eef76eebd9fdc72dd6e3176d62a236a6f6565';

    it('should encode a ping request', function() {
      var encoded = mainline.encode(ping.request);
      expect(mainline.decode(encoded)).to.be.deep.equal(ping.request);
    });

    it('should encode a ping response', function() {
      var encoded = mainline.encode(ping.response);
      expect(mainline.decode(encoded)).to.be.deep.equal(ping.response);
    });
    
    it('should decode a ping request', function() {
      var decoded = mainline.decode(new Buffer(ping_req, 'hex'));
      expect(decoded).to.be.deep.equal(ping.request);
    });

    it('should decode a ping response', function() {
      var decoded = mainline.decode(new Buffer(ping_res, 'hex'));
      expect(decoded).to.be.deep.equal(ping.response);
    });
  });

  describe('encode/decode findnode rpcs', function() {
    //hex encoded buffers :
    var findnode_req = '64313a74323a714e313a79313a71313a6164323a6964323'+
    '03a208e420d58ba3d30abc2ad87bdd3947f89605115363a74617267657432303a20'+
    '8e420d58ba3d30abc2ad87bdd3947f8960511565313a71393a66696e645f6e6f646565';
    var findnode_res = '64313a74323a714e313a79313a72313a7264323a6964323'+
    '03a208e473b59668b454afda3726a9c8332a94815ab353a6e6f6465733230383a20'+
    '8e426eb6e5c8c5e3b44b9206b3a4d3f74a1b825f2a4f652ec4208e4274c592c3ee6b'+
    '9b99da55b6518ca9f004acd5578594aa89208e42d7e8f9c1d042ce7bca1620e9a790'+
    '5a14865855342c65f1208e42d7e8f9c1d042ce7bca1620e9a7905a14865855342c347'+
    'f208e42d7e8f9c1d042ce7bca1620e9a7905a14865855342c510e208e42d7e8f9c1d0'+
    '42ce7bca1620e9a7905a14865855342c5b58208e42d7e8f9c1d042ce7bca1620e9a790'+
    '5a14865855342c550d208e42d7e8f9c1d042ce7bca1620e9a7905a14865855342c3b096565';

    it('should encode a findnode request', function() {
      var encoded = mainline.encode(findnode.request);
      expect(mainline.decode(encoded)).to.be.deep.equal(findnode.request);
    });

    it('should encode a findnode response', function() {
      var encoded = mainline.encode(findnode.response);
      expect(mainline.decode(encoded)).to.be.deep.equal(findnode.response);
    });
    
    it('should decode a findnode request', function() {
      var decoded = mainline.decode(new Buffer(findnode_req, 'hex'));
      expect(decoded).to.be.deep.equal(findnode.request);
    });

    it('should decode a findnode response', function() {
      var decoded = mainline.decode(new Buffer(findnode_res, 'hex'));
      expect(decoded).to.be.deep.equal(findnode.response);
    });
  });
});