// Dep: [KadOH]/rpc/object/rpc
// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/peerarray
// Dep: [KadOH]/util/crypto
// Dep: [KadOH]/core/deferred

(function(exports) {

  var KadOH     = exports,
      globals   = KadOH.globals,
      Peer      = KadOH.Peer,
      RPC       = KadOH.rpc.object.RPC,
      PeerArray = KadOH.PeerArray;

  KadOH.rpc        = KadOH.rpc || {};
  KadOH.rpc.object = KadOH.rpc.object || {};

  KadOH.rpc.object.KadOHRPC = RPC.extend({

    initialize: function(queried_peer, method, params) {
      //if no arguments, empty RPC that need to parsed from normalized query
      if(arguments.length === 0) {
        this.supr();
        return this;
      }

      this.supr(queried_peer, method, params);
      this.setQuerying(this.reactor.getMeAsPeer());
    },

    _timeoutValue: globals.TIMEOUT_RPC,

    reactor: undefined,

    handleNormalizedQuery: function(query, querying_address) {
      this.setQueried(this.reactor.getMeAsPeer());

      this.supr(query, null, function(query) {
        if(typeof query.params !== 'object') {
          this.setQuerying(new Peer(querying_address, null));
          KadOH.log.warn('Handle normalized query : no params');
          return this.reject('Handle normalized query : no params');
        }
        
        if(this._nonValidID(query.params[0].id)) {
          this.setQuerying(new Peer(querying_address, null));
          KadOH.log.warn('Handle normalized query : non valid node id');
          return this.reject('Handle normalized query : non valid node id');
        }

        this.setQuerying(new Peer(querying_address, query.params[0].id));

        this.handleNormalizedParams(query.params[0]);
      });
      return this;
    },

    handleNormalizedParams: function(params) {
      //to be overriden
      return this;
    },

    /**
     * Express the query associated to this RPC wihtin a normalized form.
     *
     * @return the normalized query
     */
    normalizeQuery : function() {
      var params = this.normalizeParams();
      params.id = this.getQuerying().getID();

      return {
        id     : this.getID(),
        method : this.method,
        params : [params]
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
      if(!(this.isRejected() || this.isResolved())) {
        KadOH.log.warn('try to normalize a response already completed');
        return null;
      }

      var res = {
        id     : this.getID(),
        method : this.method
      };

      if(this.isResolved()) {
        res.result    = this.normalizeResult();
        res.result.id = this.getQueried().getID();
      } else if(this.isRejected()) {
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

    handleNormalizedResponse : function(response, from) {
      //antispoofing
      if(from !== this.getQueried().getAddress()) {
        KadOH.log.warn('Reactor',
                       'spoofing attack from ' + from + ' instead of ' + this.getQueried().getAddress());
        return this;
      }

      this.supr(response, null, function(response) {
        if(response.hasOwnProperty('result')) {
          var id = response.result.id;

          // if the ID is not valid
          // call the errback with the RESPONSE ERROR event
          if (this._nonValidID(id)) {
            KadOH.log.warn('non valid ID', id, response);
            return this.reject('error', 'non valid id', response);
          }

          // if the ID is outdated (not the same in the response and in the routing table)
          // call the ErrBack with the outdated event
          if (this._outdatedID(id)) {
            KadOH.log.warn('outdated ID', this.getQueried(), id);
            return this.reject('outdated', this.getQueried(), id);
          }
          
          this.handleNormalizedResult(response.result);
        }
        else if(response.hasOwnProperty('error')) {
          this.handleNormalizedError(response.error);
        }
        else {
          this.reject();
        }
      });
      return this;
    },

    handleNormalizedResult: function(result) {
      //to be overriden
      this.resolve();
    },

    handleNormalizedError: function(error) {
      this.reject('error', error);
    },

    /**
     * Check if an id is given in the response.
     * @private
     * @param  {String} id ID to validated
     * @return {Boolean} True if and only if the ID is not valid
     */
    _nonValidID: function(id) {
      return globals.REGEX_NODE_ID.test(id) ? false : true;
    },

    /**
     * Check if the id responded if the same as the local one.
     * @private
     * @param  {String} id ID to check
     * @return {Boolean} True if and only if the ID is outdated
     */
    _outdatedID: function(id) {
      var queried_id = this.getQueried().getID();

      // if the id of the destination
      // peer is a fake (null), update queried
      if (queried_id === null) {
        this.getQueried().setID(id);
      }
      else if (id !== queried_id) {
        return true;
      }
      return false;
    }

  });
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
