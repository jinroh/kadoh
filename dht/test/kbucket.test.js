var vows = require('vows'), 
    assert = require('assert');


var KadOH = require('../dist/KadOH.js');
var SHA1 = KadOH.globals._digest;

var KBucket = KadOH.KBucket;
var Peer = KadOH.Peer;

var min = 0;
var max = KadOH.globals._B;

var parent_id = SHA1('ip:port');

vows.describe('KBucket object in KadOH').addBatch({
  
  'When I require KBucket': {
    
    topic: function() { return KBucket; },
    
    'should get a function': function(kbucket) {
      assert.isFunction(kbucket);
    }
    
  },
  
  'When I create a new KBucket': {
  
    topic: function() { return new KBucket(min, max, parent_id); },
    
    'should get an empty KBucket from 0 to _B with the right parent id': function(kbucket) {
      assert.equal(0, kbucket.getSize());
      
      assert.equal(0, kbucket.getRange().min);
      assert.equal(KadOH.globals._B, kbucket.getRange().max);
      
      assert.equal(parent_id, kbucket._parent_id);
    },
    
    'and add a new Peer to it': {
      
      topic: function(kbucket) {
        return kbucket.addPeer(new Peer('127.0.0.1', 1234));
      },
      
      'should have one peer in my bucket': function(kbucket) {
        assert.equal(1, kbucket.getSize());
      },
      
      'and add the same Peer again': {
        
        topic: function(kbucket) {
          return kbucket.addPeer(new Peer('127.0.0.1', 1234));
        },
        
        'should have one peer in my bucket': function(kbucket) {
          assert.equal(1, kbucket.getSize());
        },
       
       'and then remove it': {
         
         topic: function(kbucket) {
           return kbucket.removePeer(SHA1('127.0.0.1:1234'));
         },
         
         'should have no peer in the kbucket': function(kbucket) {
           assert.equal(0, kbucket.getSize());
           assert.isEmpty(kbucket._peers);
         }
         
       },
       
       'and then remove a Peer which is not in the kbucket': {
         
         topic: function(kbucket) {
           return kbucket;
         },
         
         'should throw an Error': function(kbucket) {
           assert.throws(function() { kbucket.removePeer(SHA1('foo')); }, Error);
         },
         
       }
      }
    }
  }
  
}).addBatch({
  'When I have a full kbucket': {

    topic: function() {
      kbucket = new KBucket(min, max, parent_id);
      for (var i=0; i < KadOH.globals._k; i++) {
        kbucket.addPeer(new Peer('127.0.0.1', 1025+i));
      }
      return kbucket;
    },

    'should not be able to add a new peer': function(kbucket) {
      assert.throws(function() { kbucket.addPeer(new Peer('127.0.0.1', 2000)); }, Error);
    }

  }
}).export(module); 