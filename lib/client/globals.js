// Dep: [KadOH]/util/crypto

(function(exports) {

  var KadOH = exports;
  KadOH.globals = {
/****************CONFIGURATION Constants****************/
    // Maximum number of contacts in a k-bucket
    K: 8,

    // Degree of parallelism for network calls
    ALPHA: 3,

    // The number of triple to put in a response
    BETA: 2,

    // Size of the space in bits
    B: 160,

    // Implemented RPCs
    RPCS: [
      'PING',
      'FIND_NODE'
    ],
    
    TRANSPORT_SERVER: undefined, //server that served js

    // Request timeout in milliseconds
    TIMEOUT: 2 * 1000,

    // SHA1 function
    DIGEST: KadOH.util.Crypto.digest.SHA1,

    // Interval for cleanup of the Reactor's RPCs in milliseconds
    CLEANUP_INTERVAL: 30 * 1000,

    REGEX_NODE_ID: /[0-9a-fA-F]{40}$/,

/*****************INSTANCE Constants ********************/
    
    OUR_NODE_ID: undefined
  };

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));