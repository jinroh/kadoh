(function(exports) {
  
  var KadOH = exports;
  KadOH.globals = {};
  
  // Maximum number of contacts in a k-bucket
  KadOH.globals._k = 6;

  // Degree of parallelism for network calls
  KadOH.globals._alpha = 3;

  // Size of the space in bits
  KadOH.globals._B = 160;

  // sha1 function
  KadOH.globals._digest = KadOH.util.Crypto.digest.SHA1;
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));