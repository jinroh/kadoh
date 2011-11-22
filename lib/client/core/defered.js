// Dep: [KadOH]/core/class
// Dep: [KadOH]/util/when

(function(exports) {

  var KadOH = exports;
  KadOH.core = KadOH.core || {};

  var Class = KadOH.core.Class;
  var when = KadOH.util.when;

   KadOH.core.Defered = Class({
     initialize : function() {
      var _extend = function(obj, source) {
        for (var prop in source) {
          if (source[prop] !== void 0) obj[prop] = source[prop];
        }
        return obj;
      };

       _extend(this, when.defer());
     }
  });
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
