// Dep: [KadOH]/util/crypto

(function(exports) {
  
  var KadOH = exports;
  KadOH.globals = {
      // Maximum number of contacts in a k-bucket
      _k: 6
      
      // Degree of parallelism for network calls
    , _alpha: 3
    
    // Size of the space in bits
    , _B: 160
    
    // implemented RCPs
    , _rpcs: [
        'PING'
      , 'FIND_NODE'
      ]
      
    // sha1 function
    , _digest: KadOH.util.Crypto.digest.SHA1

      // parser function
    , _parse: (typeof JSON !== 'undefined') ? JSON.parse : function(data) { eval('(' + data + ')'); }
  };

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));