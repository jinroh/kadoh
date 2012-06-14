module.exports = {

  // Maximum number of contacts in a k-bucket
  K: 8,

  // Degree of parallelism for network calls
  ALPHA: 3,

  // The number of triple to put in a response
  BETA: 8,

  // Size of the space in bits
  B: 160,

  // Implemented RPCs
  RPCS: [
    'PING',
    'FIND_NODE',
    'FIND_VALUE',
    'STORE'
  ],
  
  // Request timeout in milliseconds
  TIMEOUT_RPC: 5 * 1000,

  // Refresh timeout for kbuckets in milliseconds
  TIMEOUT_REFRESH: 3600 * 1000,

  // Readujst the timeout refresh around a random window, in percent
  TIMEOUT_REFRESH_WINDOW: 0.1,

  // Expire timeout for key-value in milliseconds
  TIMEOUT_EXPIRE: 24 * 3600 * 1000,

  // republish timeout for key-value in milliseconds
  TIMEOUT_REPUBLISH: 3600 * 1000,

  // Readujst the timeout republish around a random window, in percent
  TIMEOUT_REPUBLISH_WINDOW: 0.1,

  // Default transport server or proxy
  // https://www.draugr.de/bosh
  // http://bosh.melo.fr.nf/http-bind
  // https://jabber.kiev.ua:5281/http-bind
  // http://jaim.at:5280/http-bind
  // http://jwchat.org/JHB/
  // https://www.jappix.com/bind
  // http://bosh.metajack.im:5280/xmpp-httpbind
  // ...
  BOSH_SERVER: 'http://bosh.melo.fr.nf/http-bind',

  // Default protocol: jsonrpc2, xmlrpc, ...
  PROTOCOL: 'xmlrpc',

  // Interval for cleanup of the Reactor's RPCs in milliseconds
  CLEANUP_INTERVAL: 30 * 1000,

  // Interval to compute a new adaptive timeout value
  ADAPTIVE_TIMEOUT_INTERVAL: 5 * 1000,

  // ID validator: B/4 hexadecimal characters
  REGEX_NODE_ID: /^[0-9a-fA-F]{40}$/,

  // The resource of the JabberID for KadOH
  JID_RESOURCE: 'kadoh'

};