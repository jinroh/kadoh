// Dep: [KadOH]/core/class
// Dep: [KadOH]/util/when

(function(exports) {

  var KadOH = exports;
  KadOH.core = KadOH.core || {};

  var Class = KadOH.core.Class;
  var when = KadOH.util.when;

   KadOH.core.Defered = Class({}).extend(when.defer());

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
