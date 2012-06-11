exports.util = {
  crypto              : require('./util/crypto'),
  EventEmitter        : require('./util/eventemitter'),
  StateEventEmitter   : require('./util/state-eventemitter'),
  Deferred            : require('./util/deferred'),
  PeerArray           : require('./util/peerarray'),
  SortedPeerArray     : require('./util/sorted-peerarray'),
  XORSortedPeerArray  : require('./util/xorsorted-peerarray')
};

exports.logic = {
  KademliaNode        : require('./node'),
  Bootstrap           : require('./bootstrap')
};

exports.network = {
  Reactor             : require('./network/reactor'),
  rpc : {
    RPC               : require('./network/rpc/rpc'),
    PingRPC           : require('./network/rpc/ping'),
    FindNodeRPC       : require('./network/rpc/findnode'),
    FindValueRPC      : require('./network/rpc/findvalue'),
    StoreRPC          : require('./network/rpc/store')
  },
  transport : {
    UDPTransport      : require('./network/transport/udp'),
    SimUDPTransport   : require('./network/transport/simudp'),
    NodeXMPPTransport : require('./network/transport/node-xmpp')
  }
};

exports.dht = {
  RoutingTable        : require('./dht/routing-table'),
  KBucket             : require('./dht/kbucket'),
  Peer                : require('./dht/peer'),
  BootstrapPeer       : require('./dht/bootstrap-peer'),
  IterativeFindNode   : require('./dht/iterativefind/iterative-findnode'),
  IterativeFindValue  : require('./dht/iterativefind/iterative-findvalue')
};

exports.data = {
  ValueStore          : require('./data/value-store'),
  storage : {
    BasicStorage      : require('./data/storage/basic')
  }
};