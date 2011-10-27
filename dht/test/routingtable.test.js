var vows = require('vows')
  , assert = require('assert');

var KadOH = require('../dist/KadOH');
var globals = KadOH.globals;
var RoutingTable = KadOH.RoutingTable;
var SHA1 = KadOH.util.Crypto.digest.SHA1;

var parent_id = SHA1('ip:port');

// var bytes = KadOH.util.Crypto.util.hexToBytes(parent_id);
// var close_nodes = [];
// 
// for (var i=19; i >= 0; i--) {
//   bytes[i]++;
//   close_nodes.push(KadOH.util.Crypto.util.bytesToHex(bytes));
// }

vows.describe('Routing Table system in KadOH').addBatch({
  
  'When I require routingtable': {
    
    topic: function() { return RoutingTable; },
    
    'should get a function': function(routing_table) {
      assert.isFunction(routing_table);
    }
    
  },
  
  'When I create a Routing Table': {
    
    topic: function() { return new RoutingTable(parent_id) },
  
    'should have one KBucket [0 -> _B]': function(routing_table) {
      assert.equal(1, routing_table.howManyKBuckets());
      var kbucket = routing_table.getKBuckets()[0];

      assert.equal(0, kbucket.getRange().min);
      assert.equal(globals._B, kbucket.getRange().max);
    },
    
    'should have access to its parent ID': function(routing_table) {
      assert.equal(parent_id, routing_table.getParentId());
    },
    
    'and add a new Peer to it': {
      
      topic: function(routing_table) { 
        routing_table.addPeer(new KadOH.Peer('127.0.0.1', '12345'));
        return routing_table;
      },
      
      'should have a Peer in the KBucket': function(routing_table) {
        assert.equal(1, routing_table.getKBuckets()[0].getSize());
      },
      
      'should be able to retrieve that peer': function(routing_table) {
        var id = SHA1('127.0.0.1:12345');
        var peer = routing_table.getPeer(id);
        assert.equal(id, peer.getId());
      },
          
      'and add another Peer to it': {
      
        topic: function(routing_table) { 
          routing_table.addPeer(new KadOH.Peer('127.0.0.1', '54321'));
          return routing_table;
        },
      
        'should have two Peers in the KBucket': function(routing_table) {
          assert.equal(2, routing_table.getKBuckets()[0].getSize());
        },
      
        'should be able to retrieve that peer': function(routing_table) {
          var id = SHA1('127.0.0.1:54321');
          var peer = routing_table.getPeer(id);
          assert.equal(id, peer.getId());
        },
        
        'and add _k elements to it': {
        
          topic: function(routing_table) {
            for (var i = 0; i < KadOH.globals._k; i++) {
              routing_table.addPeer(new KadOH.Peer('127.0.0.1', (1025 + i)));
            }
            return routing_table;
          },
        
          'should split the buckets': function(routing_table) {
            assert.equal(2, routing_table.howManyKBuckets());
          }
        }
      }// ,
      //       
      //       'and add plenty of close elements': {
      //         
      //         topic: function(routing_table) {
      //           for (var i = 0; i < close_nodes.length; i++) {
      //             routing_table.addPeer(new KadOH.Peer('127.0.0.1', '' + (1025 + i), close_nodes[i]));
      //             console.log(i);
      //           }
      //           return routing_table;
      //         },
      //         
      //         'should': function(routing_table) {
      //           console.log(routing_table._kbuckets);
      //         }
      //         
      //       }
    }
  }
}).export(module);