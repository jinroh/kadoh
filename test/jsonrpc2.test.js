var expect = require('chai').expect;
var ping = require('./ressources/rpc/ping');
var findnode = require('./ressources/rpc/findnode');

describe('JSON-RPC2 protocol', function() {
  jsonrpc2 = require('../lib/network/protocol/jsonrpc2');
  
  it('should be defined', function() {
    expect(jsonrpc2).to.be.ok;
    expect(jsonrpc2.decode).to.be.a('function');
    expect(jsonrpc2.encode).to.be.a('function');
  });

  describe('encode * decode composition', function() {
    it('should be the identity function', function() {
      expect(jsonrpc2.decode(jsonrpc2.encode(ping.request))).to.deep.equal(ping.request);
      expect(jsonrpc2.decode(jsonrpc2.encode(findnode.request))).to.deep.equal(findnode.request);
    });
  });

  describe('encode/decode ping rpcs', function() {
    it('should encode a ping request', function() {
      var encoded = JSON.parse(jsonrpc2.encode(ping.request));
      expect(encoded).to.be.deep.equal({
        jsonrpc:"2.0",
        method:"PING",
        params:[{"id":"ebd52e2eef76eebd9fdc72dd6e3176d62a236a6f"}],
        id:"Zd"});
    });

    it('should encode a ping response', function() {
      var encoded = JSON.parse(jsonrpc2.encode(ping.response));
      expect(encoded).to.be.deep.equal({ 
        jsonrpc: '2.0',
        result: { id: 'ebd52e2eef76eebd9fdc72dd6e3176d62a236a6f' },
        id: 'Zd' });
      });
    
    it('should decode a ping request', function() {
      var decoded = jsonrpc2.decode(JSON.stringify({
        jsonrpc:"2.0",
        method:"PING",
        params:[{"id":"ebd52e2eef76eebd9fdc72dd6e3176d62a236a6f"}],
        id:"Zd"}));
      expect(decoded).to.be.deep.equal(ping.request);
    });

    it('should decode a ping response', function() {
      var decoded = jsonrpc2.decode(JSON.stringify({
        jsonrpc: '2.0',
        result: { id: 'ebd52e2eef76eebd9fdc72dd6e3176d62a236a6f' },
        id: 'Zd' }));
      expect(decoded).to.be.deep.equal(ping.response);
    });
  });

  describe('encode/decode findnode rpcs', function() {
    it('should encode a findnode request', function() {
      var encoded = JSON.parse(jsonrpc2.encode(findnode.request));
      expect(encoded).to.be.deep.equal({
        "jsonrpc": "2.0",
        "method": "FIND_NODE",
        "params": [{
          "target": "208e420d58ba3d30abc2ad87bdd3947f89605115",
          "id": "208e420d58ba3d30abc2ad87bdd3947f89605115"
        }],
        "id": "qN"
      });
    });

    it('should encode a findnode response', function() {
      var encoded = JSON.parse(jsonrpc2.encode(findnode.response));
      expect(encoded).to.be.deep.equal({
        "jsonrpc": "2.0",
        "result": {
          "id": "208e473b59668b454afda3726a9c8332a94815ab",
          "nodes": [
            ["95.42.79.101:11972", "208e426eb6e5c8c5e3b44b9206b3a4d3f74a1b82"],
            ["213.87.133.148:43657", "208e4274c592c3ee6b9b99da55b6518ca9f004ac"],
            ["88.85.52.44:26097", "208e42d7e8f9c1d042ce7bca1620e9a7905a1486"],
            ["88.85.52.44:13439", "208e42d7e8f9c1d042ce7bca1620e9a7905a1486"],
            ["88.85.52.44:20750", "208e42d7e8f9c1d042ce7bca1620e9a7905a1486"],
            ["88.85.52.44:23384", "208e42d7e8f9c1d042ce7bca1620e9a7905a1486"],
            ["88.85.52.44:21773", "208e42d7e8f9c1d042ce7bca1620e9a7905a1486"],
            ["88.85.52.44:15113", "208e42d7e8f9c1d042ce7bca1620e9a7905a1486"]
          ]
        },
        "id": "qN"
      });
    });
    
    it('should decode a findnode request', function() {
      var decoded = jsonrpc2.decode(JSON.stringify({
        "jsonrpc": "2.0",
        "method": "FIND_NODE",
        "params": [{
          "target": "208e420d58ba3d30abc2ad87bdd3947f89605115",
          "id": "208e420d58ba3d30abc2ad87bdd3947f89605115"
        }],
        "id": "qN"
      }));
      expect(decoded).to.be.deep.equal(findnode.request);
    });

    it('should decode a findnode response', function() {
      var decoded = jsonrpc2.decode(JSON.stringify({
        "jsonrpc": "2.0",
        "result": {
          "id": "208e473b59668b454afda3726a9c8332a94815ab",
          "nodes": [
            ["95.42.79.101:11972", "208e426eb6e5c8c5e3b44b9206b3a4d3f74a1b82"],
            ["213.87.133.148:43657", "208e4274c592c3ee6b9b99da55b6518ca9f004ac"],
            ["88.85.52.44:26097", "208e42d7e8f9c1d042ce7bca1620e9a7905a1486"],
            ["88.85.52.44:13439", "208e42d7e8f9c1d042ce7bca1620e9a7905a1486"],
            ["88.85.52.44:20750", "208e42d7e8f9c1d042ce7bca1620e9a7905a1486"],
            ["88.85.52.44:23384", "208e42d7e8f9c1d042ce7bca1620e9a7905a1486"],
            ["88.85.52.44:21773", "208e42d7e8f9c1d042ce7bca1620e9a7905a1486"],
            ["88.85.52.44:15113", "208e42d7e8f9c1d042ce7bca1620e9a7905a1486"]
          ]
        },
        "id": "qN"
      }));
      expect(decoded).to.be.deep.equal(findnode.response);
    });
  });
});