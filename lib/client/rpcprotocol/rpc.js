// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/peerarray
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/core/deferred
// Dep: [KadOH]/rpcprotocol/jsonrpc2



(function(exports) {

  var KadOH = exports;
  var globals = KadOH.globals;
  var Peer = KadOH.Peer;
  var Crypto = KadOH.util.Crypto;
  var Deferred = KadOH.core.Deferred;
  var Protocol = KadOH.protocol.jsonrpc2;
  var PeerArray = KadOH.PeerArray;



  KadOH.protocol = KadOH.protocol || {};

  KadOH.protocol.RPC = Deferred.extend({

    initialize: function(dst_peer) {
      this.supr();
      
      this._id = this._generateID();
      this._dst = dst_peer;
    },

    setTimeout: function() {
      this._timeout_id = setTimeout(
        function(self) {
          self.reject('TIMEOUT');
        },
        globals._timeout, this
      );
    },

    cancel: function() {
      if(this.state == 'progress') {
        this.reject('CANCELED');
      }
    },

    handle: function(response) {      
      if (this._state !== 'progress') 
        return;

        // if the response is an error
        // call the ErrBack of the request object
      if (response.isError()) {
        this.reject('RETURNED ERROR', response.getError());
        return;
      }
      
      if(reponse.getResult().id !== this.dst.getId()) {
        this.reject('ID ERROR', response);
        return;
      }

      this._resolver(reponse);
    },

    // Private

    _resolver : function(response) {
      //////ABSTRACT : to implement///
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

  KadOH.protocol.PingRPC = RPC.extend({

    initialize: function(dst_peer) {
      this.supr(dst_peer);

      this._request = Protocol.buildRequest('PING', {id : globals._ME.getId()});
      this._request.setRPCID(this.getID());
    },

    _resolver: function(response) {
      // if(this.getResult().response !== 'PONG') {
      //   this.reject('RESPONSE ERROR', response); 
      //   return;
      // }

      this._clearTimeoutError();
      this.resolve();
    }

  });

    KadOH.protocol.FindNodeRPC = RPC.extend({

    initialize: function(dst_peer, target_peer) {
      this.supr(dst_peer);

      this._request = Protocol.buildRequest('FIND_NODE', {id : globals._ME.getId(), target : target_peer.getId()});
      this._request.setRPCID(this.getID());
    },

    _resolver: function(response) {
      try{
        var peers = response.getResult().nodes.map(function(peer) {
          return new Peer(peer);
        });
        this._clearTimeoutError();
        this.resolve(new PeerArray(peers));

      } catch(e) {
        this.reject('RESPONSE ERROR', reponse, e);
      }
    }
    
  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
