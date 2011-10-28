(function(exports, global) {

  var global  = global  ||  {};
  var exports = exports ||  {};

  var class = (require ? require('./core/class').class 
                       : global.core.class); // dep:[test]/core/class

  global.module = exports.module = function() {console.log(class.hi);};


  })( 'object' === typeof module ? module.exports : null
    , 'object' === typeof window ? window         : null
);