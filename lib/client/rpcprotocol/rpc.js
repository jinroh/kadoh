// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/peerarray
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/core/deferred
// Dep: [KadOH]/rpcprotocol/jsonrpc2



(function(exports) {

  var KadOH     = exports,
      globals   = KadOH.globals,
      Peer      = KadOH.Peer,
      Crypto    = KadOH.util.Crypto,
      Deferred  = KadOH.core.Deferred,
      Protocol  = KadOH.protocol.jsonrpc2,
      PeerArray = KadOH.PeerArray;

  KadOH.protocol = KadOH.protocol || {};

  KadOH.protocol.RPC = Deferred.extend({

    initialize: function(dst_peer, request) {
      this.supr();

      this._request = request;
      this._id = this._generateID();
      this._dst = dst_peer;

      request.setRPCID(this.getID());
    },

    ////ABSTRACT/////
    originatorNodeID : undefined,

    send : function() {
      //////HALF-ABSTRACT////
      // Need to be overriden in Reactor class to alow direct sending
      this._setTimeout();
    },

    cancel: function() {
      if (this.state == 'progress') {
        this.reject('CANCELED');
      }
    },

    handle: function(response, specific_handler) {
      ////HALF-ABSTRACT/////   
      if (this.state !== 'progress') { 
        return;
      }
        // if the response is an error
        // call the ErrBack of the request object
      if (response.isError()) {
        this.reject('RETURNED ERROR', response.getError());
        return;
      }
     
      // This part leads to abusing reject when DST is a bootstrap. Indeed its id is a random generated id.   
      // if (response.getResult().id !== this.getDST().getID()) {
      //   this.reject('ID ERROR', response);
      //   return;
      // }

      if (typeof specific_handler === 'function')
        specific_handler.apply(this, [response]);
    },

    // Overriden
    resolve: function() {
      this.supr.apply(this,arguments);
      this._clearTimeout();
    },    

    reject: function() {
      this.supr.apply(this,arguments);
      this._clearTimeout();
    },

    // Private
    _setTimeout: function() {
      this._timeout_id = setTimeout(
        function(self) {
          self.reject('TIMEOUT');
        },
        globals.TIMEOUT, this
      );
    },

    _clearTimeout: function() {
      clearTimeout(this._timeout_id);
    },

    _generateID: function() {
      // return Crypto.digest.randomSHA1();
      var alph = '0123456789abcdefghijklmnopqrstuvwxyz';
      return (alph[Math.floor(Math.random() * alph.length)] + alph[Math.floor(Math.random() * alph.length)]);
    },

    // Getters

    getID: function() {
      return this._id;
    },

    getDST: function() {
      return this._dst;
    },

    getRequest: function() {
      return this._request;
    }

  });

  KadOH.protocol.PingRPC = KadOH.protocol.RPC.extend({

    initialize: function(dst_peer) {
      var request = Protocol.buildRequest('PING', {id : this.originatorNodeID});
      this.supr(dst_peer, request);
    },

    handle: function(response) {
      this.supr(response, function(response){
      // if (this.getResult().response !== 'PONG') {
      //   this.reject('RESPONSE ERROR', response); 
      //   return;
      // }
      });
    }

  });

  KadOH.protocol.FindNodeRPC = KadOH.protocol.RPC.extend({

    initialize: function(dst_peer, target_peer) {
      var request = Protocol.buildRequest('FIND_NODE', {id : this.originatorNodeID, target : target_peer.getID()});
      this.supr(dst_peer, request);
    },

    handle: function(response) {
      this.supr(response, function(response){
        try {
          var peers = response.getResult().nodes.map(function(peer) {
            return new Peer(peer);
          });
          this.resolve(new PeerArray(peers));
        } catch(e) {
          this.reject('RESPONSE ERROR', response, e);
        }
      });
    }
  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
