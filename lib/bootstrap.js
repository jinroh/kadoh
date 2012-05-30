var StateEventEmitter = require('./util/state-eventemitter'),
    Crypto            = require('./util/crypto'),
    globals           = require('./globals.js'),

    Peer              = require('./dht/peer'),
    PeerArray         = require('./util/peerarray'),

    PingRPC            = require('./network/rpc/ping'),
    FindNodeRPC        = require('./network/rpc/findnode'),
    FindValueRPC       = require('./network/rpc/findvalue'),
    StoreRPC           = require('./network/rpc/store'),

    Reactor           = require('./network/reactor');
    

var Bootstrap = module.exports = StateEventEmitter.extend({

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
    this._reactor.register({
      PING       : PingRPC,
      FIND_NODE  : FindNodeRPC,
      FIND_VALUE : FindValueRPC,
      STORE      : StoreRPC
    });
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
      console.log('add peers', peer.getAddress());
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
    if (!rpc.inProgress())
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
    if (this._peers.size() <= globals.BETA) {
      toGive = this._peers.clone();
    } else {
      var indexs = [];
      toGive = new PeerArray();
      while(toGive.size() < globals.BETA) {
        var i = Math.floor(Math.random()*this._peers.size());
        toGive.addPeer(this._peers.getPeer(i));
      }
    }
    toGive.removePeer(rpc.getQuerying());
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