/*
 * Dep: [KadOH]/core/stateeventemitter
 * Dep: [KadOH]/globals
 * Dep: [KadOH]/rpc/reactor
 * Dep: [KadOH]/util/crypto
 * Dep: [KadOH]/peerarray
 * Dep: [KadOH]/peer
 */

(function(exports) {
  
  var KadOH             = exports,
      StateEventEmitter = KadOH.core.StateEventEmitter,
      globals           = KadOH.globals,
      Reactor           = KadOH.rpc.Reactor,
      Crypto            = KadOH.util.Crypto,
      PeerArray         = KadOH.PeerArray,
      Peer              = KadOH.Peer;

  KadOH.Bootstrap = StateEventEmitter.extend({

    initialize: function(id, options) {
      this.supr();
      this.setState('initializing');

      if (!id)
        this._id = this._generateID();
      else
        this._id = id;

      var config = this.config = {};
      for (var option in options) {
        config[option] = options[option];
      }

      this._peers = new PeerArray();

      this._reactor = new Reactor(this, config.reactor);
      this._reactor.on(this.reactorEvents, this);

      this.setState('initialized');
    },

    //
    // Events
    //

    reactorEvents : {
      // Connection
      connected: function(address) {
        this._me      = new Peer(address, this._id);
        this._address = address;
        this.setState('connected');
      },

      disconnected: function() {
        this.setState('disconnected');
      },

      // RPC
      reached: function(peer) {
        peer.touch();
        console.log('add peers', peer.getAddress())
        this._peers.addPeer(peer);
      },

      queried: function(rpc) {
        this._handleRPCQuery(rpc);
      }
    },

    
    //
    // Network functions
    //

    connect: function(callback, context) {
      if (this.stateIsNot('connected')) {
        if (callback) {
          this.once('connected', callback, context || this);
        }
        this._reactor.connectTransport();
      }
      return this;
    },

    disconnect: function(callback, context) {
      if (this.stateIsNot('disconnected')) {
        this._reactor.disconnectTransport();
      }
      return this;
    },

    //
    // RPCs
    //

    _handleRPCQuery: function(rpc) {
      if (! rpc.stateIs('progress'))
        return;
      var result,
          method = rpc.getMethod();
      result = this[method].call(this, rpc);
    },

    PING: function(rpc) {
      rpc.resolve();
    },

    FIND_NODE: function(rpc) {
      //give random BETA peeers
      var toGive;
      if(this._peers.length() <= globals.BETA) {
        toGive = this._peers.clone();
      } else {
        var indexs = [];
        toGive = new PeerArray();
        while(toGive.length() < globals.BETA) {
          var i = Math.floor(Math.random()*this._peers.length());
          toGive.addPeer(this._peers.getPeer(i));
        }
      }
      toGive.removePeer(rpc.getQuerying());
      console.log('give', toGive);
      rpc.resolve(toGive);
    },

    FIND_VALUE: function(rpc) {
      rpc.reject('I am  a bootstrap !');
    },

    STORE: function(rpc) {
      rpc.reject('I am  a bootstrap !');
    },

    //
    // Getters
    //
    
    reactor: function() {
      return this._reactor;
    },

    getMe: function() {
      return this._me;
    },
    
    getID: function() {
      return this._id;
    },

    getAddress: function() {
      return this._address;
    },
    
    //
    // Private
    //

    _generateID: function() {
      return Crypto.digest.randomSHA1();
    }

  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
