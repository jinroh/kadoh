// Dep: [KadOH]/globals
// Dep: [KadOH]/peer
// Dep: [KadOH]/rpc/object/rpc

(function(exports) {

  var KadOH     = exports,
      globals   = KadOH.globals,
      Peer      = KadOH.Peer,
      RPC       = KadOH.rpc.object.RPC;

  KadOH.rpc        = KadOH.rpc || {};
  KadOH.rpc.object = KadOH.rpc.object || {};

  KadOH.rpc.object.KadOHRPC = RPC.extend({

    initialize: function(queried_peer, method, params) {
      if (arguments.length === 0) {
        this.supr();
      } else {
        this.supr(queried_peer, method, params);
        this.setQuerying(this.reactor.getMeAsPeer());
      }
    },

    _timeoutValue: globals.TIMEOUT_RPC,

    reactor: undefined,

    handleNormalizedQuery: function(query, querying_address) {
      this.setQueried(this.reactor.getMeAsPeer());

      this.supr(query, null, function(query) {
        var params = query.params[0];
        if (typeof params !== 'object') {
          KadOH.log.warn('Reactor','query with no parameters');
          this.reject();
        }
        else if (this._nonValidID(params.id)) {
          KadOH.log.warn('Reactor','query with non valid node id');
          this.reject();
        }
        else {
          this.setQuerying(new Peer(querying_address, params.id));
          this.handleNormalizedParams(params);
        }
      });
      return this;
    },

    // abstract
    handleNormalizedParams: function(params) {
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

    // abstract
    normalizeParams: function() {
      return {};
    },

    /**
     * Express the response associated to this RPC whithin a normalized form.
     *
     * @return {[type]}
     */
    normalizeResponse : function() {
      var res = {
        id     : this.getID(),
        method : this.method
      };

      if (this.isResolved()) {
        res.result    = this.normalizeResult();
        res.result.id = this.getQueried().getID();
      } else if (this.isRejected()) {
        res.error = this.normalizeError();
      } else {
        KadOH.log.warn('Reactor','try to normalize a response already completed');
        return null;
      }
      return res;
    },

    // abstract
    normalizeResult: function() {
      return {};
    },

    normalizeError: function() {
      return this.getError().toString();
    },

    handleNormalizedResponse : function(response, from) {

      // Antispoofing
      // To be improved...
      if (from !== this.getQueried().getAddress()) {
        KadOH.log.warn('Reactor',
                       'spoofing attack from ' + from + ' instead of ' + this.getQueried().getAddress());
        return this;
      }

      this.supr(response, null, function(response) {
        if (response.hasOwnProperty('result')) {
          var id = response.result.id;
          if (this._nonValidID(id)) {
            KadOH.log.warn('Reactor','non valid ID', id, response);
            this.reject();
          }
          // if the ID is outdated (not the same in the response and in the routing table)
          // call the ErrBack with the outdated event
          else if (this._outdatedID(id)) {
            KadOH.log.info('Reactor','outdated ID', this.getQueried(), id);
            this.reject('outdated', this.getQueried(), id);
          } else {
            this.handleNormalizedResult(response.result);
          }
        } else if (response.hasOwnProperty('error')) {
          this.handleNormalizedError(response.error);
        } else {
          this.reject();
        }
      });

      return this;
    },

    // abstract
    handleNormalizedResult: function(result) {
      this.resolve();
    },

    handleNormalizedError: function(error) {
      this.reject(new Error(error));
    },

    /**
     * Check if an id is given in the response.
     * @private
     * @param  {String} id ID to validated
     * @return {Boolean} True if and only if the ID is not valid
     */
    _nonValidID: function(id) {
      return (typeof id === 'string' && globals.REGEX_NODE_ID.test(id)) ? false : true;
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
      // peer is a bootstrap (with null id), update queried
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
