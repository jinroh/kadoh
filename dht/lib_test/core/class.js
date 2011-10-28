(function(exports, global) {

  var global      = global        || {};
  global.core     = global.core   || {};
  var exports     = exports       || {};

  global.core.class = exports.class = {hi : "hi"};


  })('object' === typeof module ? module.exports : null
  , 'object' === typeof window ? window : null
);
