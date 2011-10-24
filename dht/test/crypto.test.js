var vows = require('vows')
  , assert = require('assert');

// var Crypto = require('../lib/util/crypto').Crypto;
var Crypto = require('../dist/KadOH.js').util.Crypto;

var util = Crypto.util;
var digest = Crypto.digest;

var foo = digest.SHA1('foo');
var bar = digest.SHA1('bar');

vows.describe('Crypto module of the util directory').addBatch({
  'SHA1': {
    'When I ask for the `SHA1` function': {
      
      topic: function() { return digest.SHA1 },
      
      'should be a function': function(sha1) {
        assert.isFunction(sha1);
      },
      
      'should return a string': function(sha1) {
        assert.isString(sha1('abc'));
      },
      
      'should return a SHA1 digest of the given parameter in hexadecimal': function(sha1) {
        assert.equal(sha1('DIGEST ME!'), 'a2cfd6254f8dcfa189b0c1142056df9d3daca861');
      }
    }
  }
}).addBatch({
  'XOR function': {
    'When I ask for the `XOR` function': {
      
      topic: function() { return util.XOR },
      
      'should be a function': function(xor) {
        assert.isFunction(xor);
      },
      
      'should return an array': function(xor) {
        assert.isArray(xor('012', 'DEF'));
      },
      
      'and ask the XOR of two HEX strings': {

        topic: function(xor) { return xor(foo, bar); },
      
        'should return 20 bytes (=160/8) long `Array`': function(topic) {
          assert.isArray(topic);
          assert.equal(topic.length, 20);
        },
      
        'should contains bytes': function(topic) {
          for (var i=0; i < topic.length; i++) {
            assert.isNumber(topic[i]);
            assert.isTrue(topic[i] < 256);
            assert.isTrue(topic[i] >= 0);
          }
        }
      }
    }
  },
  
  'distance function': {
    'When I ask for the distance function': {
      
      topic: function() { return util.distance },
      
      'should be a function': function(distance) {
        assert.isFunction(distance);
      },
      
      'and ask the distance between the same objects': {
        'should equal zero': function(distance) {
          assert.equal(0, distance(foo, foo));
          assert.equal(0, distance([35,90,34], [35,90,34]));
        }
      },

      'and ask the distance between two different length objects': {
        'should return -1': function(distance) {
          assert.equal(-1, distance([123,45,67], [34,67,45,90]));
        }
      },

      'and ask distances': {
        'should return a positive number': function(distance) {
          assert.isNumber(distance(foo, bar));
          assert.isTrue(distance(foo,bar) > 0)
        },

        'should return the good distances': function(distance) {
          var test = [36,0,5]
          
          for(var i=1; i < 256; i++) {
            if (i < 2)
              assert.equal(distance([36,i,6],   test), 1+8);
            else if (i < 4)
              assert.equal(distance([36,i,87],  test), 2+8);
            else if (i < 8)
              assert.equal(distance([36,i,234], test), 3+8);
            else if (i < 16)
              assert.equal(distance([36,i,89],  test), 4+8);
            else if (i < 32)
              assert.equal(distance([36,i,5],   test), 5+8);
            else if (i < 64)
              assert.equal(distance([36,i,124], test), 6+8);
            else if (i < 128)
              assert.equal(distance([36,i,90],  test), 7+8);
            else if (i < 256)
              assert.equal(distance([36,i,7],   test), 8+8);
          }
        }
      }
    }
  }
}).export(module);