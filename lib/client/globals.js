// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/core/log

(function(exports) {

  var KadOH = exports;
  KadOH.globals = {

    // global instance of a peer object which
    // represent the our node
    ME: null,
    
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
    
    // Request timeout in milliseconds
    TIMEOUT_RPC: 2 * 1000,

    // Refresh timeout for kbuckets in milliseconds
    TIMEOUT_REFRESH: 3600 * 1000,

    // Expire timeout for key-value in milliseconds
    TIMEOUT_EXPIRE: 24 * 3600 * 1000,

    // republish timeout for key-value in milliseconds
    TIMEOUT_REPUBLISH: 3600 * 1000,

    // SHA1 function
    DIGEST: KadOH.util.Crypto.digest.SHA1,

    // Interval for cleanup of the Reactor's RPCs in milliseconds
    CLEANUP_INTERVAL: 30 * 1000,

    // ID validator: B/4 hexadecimal characters
    REGEX_NODE_ID: /^[0-9a-fA-F]{40}$/,

    // Transport server or proxy
    TRANSPORT_SERVER: 'http://bosh.melo.fr.nf/http-bind',

    // The resource of the JabberID for KadOH
    JID_RESOURCE: 'kadoh'

  };

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));