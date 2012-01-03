// Dep: [KadOH]/rpc/reactor
// Dep: [KadOH]/rpc/object/pingrpc
// Dep: [KadOH]/rpc/object/findnoderpc
// Dep: [KadOH]/rpc/object/findvaluerpc
// Dep: [KadOH]/rpc/object/storerpc
// Dep: [KadOH]/globals
// Dep: [KadOH]/rpc/protocol/jsonrpc2
// Dep: [KadOH]/rpc/protocol/xmlrpc


(function(exports) {

  var KadOH = exports;
  KadOH.rpc = KadOH.rpc || {};

  var Reactor = KadOH.rpc.Reactor,
      globals = KadOH.globals;


  var PingRPC           = KadOH.rpc.object.PingRPC,
      FindNodeRPC       = KadOH.rpc.object.FindNodeRPC,
      FindValueRPC      = KadOH.rpc.object.FindValueRPC,
      StoreRPC          = KadOH.rpc.object.StoreRPC;

    
  KadOH.rpc.KadOHReactor = Reactor.extend({

    initialize: function() {
      this.supr();

      this.RPCObject = {
        'PING'       : PingRPC.extend(     {reactor : this}),
        'FIND_NODE'  : FindNodeRPC.extend( {reactor : this}),
        'FIND_VALUE' : FindValueRPC.extend({reactor : this}),
        'STORE'      : StoreRPC.extend(    {reactor : this}),
        '__default'  : undefined
      };

    },

    _cleanup_interval: globals._CLEANUP_INTERVAL,

    getMeAsPeer: function() {
      //todo
    },

    connect: function() {
      //to be defined
      this.setState('connected');
    },

    disconnect: function() {
      //to be defined
      this.setState('disconnect');
    },


    sendNormalizedQuery: function(query, dst_peer, rpc) {
      //to be defined
    },


    sendNormalizedResponse: function(response, dst_peer, rpc) {
      //to be defined
    },


    onRPCMessage: function() {
      //to be defined
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
