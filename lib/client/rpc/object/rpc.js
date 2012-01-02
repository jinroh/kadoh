// xDep: [KadOH]/rpc/object/rpc.stub
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

    initialize: function(queried_peer, method, params) {
      //if no arguments, empty RPC that need to parsed from normalized query
      if(arguments.length === 0) {
        this.supr();
        return this;
      }

      this.setQueried(queried_peer);
      this.supr(method, params);
    },

    _timeoutValue: globals.TIMEOUT_RPC,

    reactor: undefined,

    handleNormalizedQuery: function(query, quering_address) {
      this.setQueried(this.reactor.getMeAsPeer());

      this.supr(query, function(query) {
        if(typeof query.params !== 'object')
          return this.reject('Handle normalized query : no params');

        if(typeof query.params.id !== 'string' || this._nonValidID(query.params.id))
          return this.reject('Handle normalized query : non valid node id');

        this.setQuering(new Peer(quering_address, query.params.id));

        this.handleNormalizedParams(query.params);
      });
      return this;
    },

    handleNormalizedParams: function(params) {
      //to be overriden
      this.params = params;
      return this;
    },

    /**
     * Express the query associated to this RPC wihtin a normalized form.
     *
     * @return the normalized query
     */
    normalizeQuery : function() {
      var params = normalizeParams();
      params.id = this.getQuering().getID();

      return {
        id     : this.getId(),
        method : this.method,
        params : params
      };
    },

    normalizeParams: function() {
      //To be orverriden
      return {};
    },

    /**
     * Express the response associated to this RPC whithin a normalized form.
     *
     * @return {[type]}
     */
    normalizeResponse : function() {
      if(!(this.isRejected() || this.isResolved()))
        return null;

      var res = {
        id     : this.getId(),
        method : this.method
      };

      if(this.isResolved()) {
        res.result = this.normalizeResult();
        res.result.id = this.getQueried().getID();
      }
      if(this.isRejected()) {
        res.error = this.normalizeError();
      }
      return res;
    },

    normalizeResult: function() {
      //to be overriden
      return {};
    },

    normalizeError: function() {
      return this.getError().toString();
    },

    handleNormalizedResponse : function(response) {
      this.supr(response, function(response) {

        if(response.indexOf('result') !== -1) {

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
            this.reject('OUTDATED ID', this.getQueried(), new Peer(this.getQueried().getAddress(), id));
            return;
          }
          
          //delegate treatment
          this.handleNormalizedResult(response.result);
        }
        else if(response.indexOf('error') !==-1) {
          this.handleNormalizedError(response.error);
        }
        else this.reject('Handle normalized reponse : nor result, nor error given');
      });
      return this;
    },

    handleNormalizedResult: function(result) {
      //to be overriden
      this.resolve();
    },

    handleNormalizedError: function(error) {
      this.reject('RETURN ERROR', error);
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
      var dst_id = this.getQueried().getID();

      // if the id of the destination peer is a fake (null), update _dst
      if (dst_id === null) {
        this._dst.setID(id);
      }
      else {
        if (id !== dst_id) {
          KadOH.log.warn('outdated id', this.getQueried(), id);
          return true;
        }
      }
      return false;
    }

  }).statics({

    parseQuery: function(query, quering_address) {
      var rpc = KadOH.rpc.object.RPC();
      rpc.handleNormalizedQuery(query, quering_address);
      return rpc;
    }
  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
