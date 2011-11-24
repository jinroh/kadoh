(function(exports) {

  var KadOH = exports;
  
  KadOH.util = KadOH.util || {};
  
  // From underscore.js
  var ctor = function(){};
  
  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
  // We check for `func.bind` first, to fail fast when `func` is undefined.
  KadOH.util.bind = function(func, context) {
    var bound, args;
    
    var nativeBind = Function.prototype.bind;
    var slice      = Array.prototype.slice;
    
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if ('function' !== typeof func) throw new TypeError();
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor();
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
