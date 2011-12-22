// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/peerarray
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/core/deferred

(function(exports) {

  var KadOH     = exports,
      globals   = KadOH.globals,
      Peer      = KadOH.Peer,
      Crypto    = KadOH.util.Crypto,
      Deferred  = KadOH.core.Deferred,
      PeerArray = KadOH.PeerArray;

  KadOH.protocol = KadOH.protocol || {};

  KadOH.protocol.RPC = Deferred.extend({

    initialize: function(dst_peer, request) {
      this.supr();

      this._request = request;
      this._id      = this._generateID();
      this._dst     = dst_peer;

      request.setRPCID(this.getID());
    },

    ////ABSTRACT/////
    _protocol         : undefined,
    _originatorNodeID : undefined,

    send : function() {
      //////HALF-ABSTRACT////
      // Need to be overriden in Reactor class to alow direct sending
      this._setTimeout();
    },

    cancel: function() {
      if (this.stateIs('progress')) {
        this.reject('CANCELED');
      }
    },

    handle: function(response, specific_handler) {
      ////HALF-ABSTRACT/////   
      if (this.stateIsNot('progress')) { 
        return;
      }

      var id = response.getResult().id;

      // if the ID is not valid
      // call the errback with the RESPONSE ERROR event
      if (this._nonValidID(id)) {
        this.reject('RESPONSE ERROR', response, 'no id given');
        return;
      }

      // if the ID is outdated (not the same in the response and in the routing table)
      // call the ErrBack with the OUTDATED ID event
      if (this._outdatedID(id)) {
        this.reject('OUTDATED ID', this.getDST(), new Peer(this.getDST().getAddress(), id));
        return;
      }

      // if the response is an error
      // call the ErrBack of the request object
      if (response.isError()) {
        this.reject('RETURNED ERROR', response.getError());
        return;
      }
      
      // update the peer in the routing table (add or touch)
      this._updatePeer(this.getDST());

      if (typeof specific_handler === 'function')
        specific_handler.call(this, response);
    },

    // Extend

    resolve: function() {
      this._clearTimeout();
      this.supr.apply(this,arguments);
    },

    reject: function() {
      this._clearTimeout();
      this.supr.apply(this,arguments);
    },

    // Private

    /**
     * Check if an id is given in the response
     * @param  {String} id ID to validated
     * @return {Boolean} True if and only if the ID is not valid
     */
    _nonValidID: function(id) {
      if (!globals.REGEX_NODE_ID.test(id)) {
        KadOH.log.warn('received response without id', response);
        return true;
      }
      return false;
    },

    /**
     * Check if the id responded if the same as the local one
     * @param  {String} id ID to check
     * @return {Boolean} True if and only if the ID is outdated
     */
    _outdatedID: function(id) {
      var dst_id = this.getDST().getID();

      // if the id of the destination peer is a fake (null), update _dst
      if (dst_id === null) {
        this._dst.setID(id);
      }
      else {
        if (id !== dst_id) {
          KadOH.log.warn('outdated id', this.getDST(), id);
          return true;
        }
      }
      return false;
    },

    _updatePeer: function() {},

    _setTimeout: function() {
      this._timeout_id = setTimeout(
        function(self) {
          if (self.stateIs('progress'))
            self.reject('TIMEOUT');
        },
        globals.TIMEOUT_RPC, this
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
      var request = this._protocol.buildRequest('PING', {id : this._originatorNodeID});
      this.supr(dst_peer, request);
    },

    handle: function(response) {
      this.supr(response, function(response) {
        this.resolve(this.getDST());
      });
    }

  });

  KadOH.protocol.FindNodeRPC = KadOH.protocol.RPC.extend({

    initialize: function(dst_peer, target_peer) {
      var request = this._protocol.buildRequest('FIND_NODE', {id : this._originatorNodeID, target : target_peer.getID()});
      this.supr(dst_peer, request);
    },

    handle: function(response) {
      this.supr(response, function(response) {
        var result = response.getResult();
        var validations = (
          typeof result       === 'object'         &&
          typeof result.nodes === 'object'         &&
          typeof result.nodes.every === 'function' &&
          result.nodes.every(function(peer) {
            return (
              typeof peer[0] === 'string'          &&
              globals.REGEX_NODE_ID.test(peer[1])
            );
          })
        );

        if (!validations) {
          this.reject('RESPONSE ERROR', response);
          return;
        }

        var peers = result.nodes.map(function(peer) {
          return new Peer(peer);
        });
        var res = new PeerArray(peers);
        this.resolve(res);
      });
    }
  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
