// Dep: [KadOH]/rpc/object/rpc.stub
// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/peerarray
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/core/deferred

(function(exports) {

  var KadOH     = exports,
      globals   = KadOH.globals,
      Peer      = KadOH.Peer,
      RPCStub   = KadOH.rpc.object.RPCStub,
      PeerArray = KadOH.PeerArray;

  KadOH.rpc        = KadOH.rpc || {};
  KadOH.rpc.object = KadOH.rpc.object || {};

  KadOH.prc.object.RPC = RPCStub.extend({

    initialize: function(dst_peer, method, param) {
      param = param || {};
      param.id = this._myNodeID;
      this.setDest(dst_peer);
      
      this.supr(method, param);
    },
    
    setDest : function(dst) {
      this._addExtra('dest', dst);
    },

    getDest: function() {
      return this.extra.dest;
    },

    _myNodeID : undefined,

    _timeoutValue : globals.TIMEOUT_RPC,

    _getResultFromResolve: function() {
      var args = this.supr.apply(this, arguments);
      args.id = this._myNodeID;
      return args;
    },

    _getErrorFromReject: function(reason) {
      return {message : reason};
    },

    _handleResponse : function(response, specific_handler) {
      this.supr(response, function(response) {

        if (this.stateIsNot('progress')) {
          return;
        }

        var id = response.result.id;

        // if the ID is not valid
        // call the errback with the RESPONSE ERROR event
        if (this._nonValidID(id)) {
          this.reject('RESPONSE ERROR', response, 'no id given');
          return;
        }

        // if the ID is outdated (not the same in the response and in the routing table)
        // call the ErrBack with the OUTDATED ID event
        if (this._outdatedID(id)) {
          this.reject('OUTDATED ID', this.getDest(), new Peer(this.getDest().getAddress(), id));
          return;
        }

        // if the response is an error
        // call the ErrBack of the request object
        if (typeof response.error !== undefined) {
          this.reject('RETURNED ERROR', response.error);
          return;
        }
        
        if (typeof specific_handler === 'function')
          specific_handler.call(this, response);
        else
          this.resolve();
      });
    },

    /**
     * Check if an id is given in the response.
     * @private
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
     * Check if the id responded if the same as the local one.
     * @private
     * @param  {String} id ID to check
     * @return {Boolean} True if and only if the ID is outdated
     */
    _outdatedID: function(id) {
      var dst_id = this.getDest().getID();

      // if the id of the destination peer is a fake (null), update _dst
      if (dst_id === null) {
        this._dst.setID(id);
      }
      else {
        if (id !== dst_id) {
          KadOH.log.warn('outdated id', this.getDest(), id);
          return true;
        }
      }
      return false;
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
