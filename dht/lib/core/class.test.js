var vows = require('vows')
, assert = require('assert');

var Class = require('./class').core.Class;


vows.describe('Class system in KaDOH').addBatch({
  'When we require kadOH.core.Class': {
    topic : function() { return require('./class').core.Class;},
    
    'it should be here' : function(Class){
      assert.isFunction(Class);
    }
  },
  
  'When I declare a Class' : {
    topic : function() {return new Class(function(n){this.n = n});},
    
    '≤should be able to instanciate it' : function(aClass){
      var foo = new aClass(3);
      assert.isObject(foo);
    },
    
    'should be able to add methods' : function(aClass){
      aClass.methods({get : function(){return this.n;}});
      var foo = new aClass(3);
      assert.equal(3, foo.n);
    },
    
    'should be able to add statics' : function(aClass){
      aClass.statics({'dead' : 'obese'});
      assert.equal(aClass.dead, 'obese');
    }
    
  }


  // 
  // 'when I  define a class' : {
    //   
    //   topic : function() {return Class(function(n) {this.n = n});},
    //   
    //   'I should be able to instanciate it' : function(topic){
      //     var obj = new topic();
      //     assert.equal(obj.n, 3);
      //   }
      // }

      }).export(module);