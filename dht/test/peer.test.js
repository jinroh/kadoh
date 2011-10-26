var vows = require('vows')
  , assert = require('assert');

var KadOH = require('../dist/KadOH.js');

var Peer = KadOH.Peer;
var SHA1 = KadOH.globals._digest;

var ip = '234.5.78.4';
var port = 1234;

vows.describe('Peer class from KadOH').addBatch({
  
  'When I require Peer': {
    
    topic: function() { return Peer },
    
    'should get a function': function(peer) {
      assert.isFunction(peer);
    }
    
  },
  
  'When I create a new Peer': {
    
    topic: function() { return new Peer(ip, port); },
    
    'should respond to `getSocket()` and `getId()`': function(peer) {
      assert.isFunction(peer.getSocket);
      assert.isFunction(peer.getId);
    },
    
    'should get a socket which is the ip:port string': function(peer) {
      assert.equal(ip + ':' + port, peer.getSocket());
    },
    
    'should get an ID which is the SHA1 of IP:PORT': function(peer) {
      assert.equal(SHA1(ip + ':' + port), peer.getId());
    }
    
  }
  
}).export(module);