var vows = require('vows')
  , assert = require('assert');
  
var globals = require('../lib/globals');
var RoutingTable = require('../lib/routingtable');
var SHA1 = require('../lib/util/crypto').digest.SHA1;

var parent_id = SHA1('ip:port');

vows.describe('Routing Table system in KadOH').addBatch({
  
  'When I require routingtable': {
    
    topic: function() { return RoutingTable; },
    
    'should get a function': function(routing_table) {
      assert.isFunction(routing_table);
    }
    
  },
  
  'When I create of a Routing Table': {
    
    topic: function() { return new RoutingTable(parent_id) },
  
    'should have one KBucket [0 -> _B]': function(routing_table) {
      assert.equal(1, routing_table.howManyKBuckets);
      var kbucket = routing_table.getKBuckets[0];
      
      assert.equal(0, kbucket.getMinRange());
      assert.equal(globals._B, kbucket.getMaxRange());
    },
    
    'should have access to its parent ID': function(routing_table) {
      assert.equal(parent_id, routing_table.getParentId());
    },
    
    'and add a new Peer to it': {
      
      topic: function(routing_table) { 
        routing_table.addPeer(new Peer('127.0.0.1', '12345'));
        return routing_table;
      },
      
      'should have a Peer in the KBucket': function(routing_table) {
        assert.equal(1, routing_table.getKBuckets[0].getSize());
      }

      // ...

    }
  }
});