// Dep: [KadOH]/peerarray
// Dep: [KadOH]/core/deferred
// Dep: [KadOH]/globals

(function(exports) {
  
  var KadOH              = exports,
      Deferred           = KadOH.core.Deferred,
      globals            = KadOH.globals,
      Peer               = KadOH.Peer,
      PeerArray          = KadOH.PeerArray,
      XORSortedPeerArray = KadOH.XORSortedPeerArray;

  KadOH.IterativeFind = Deferred.extend({
    
    initialize: function(node_instance, target, target_type) {
      this.supr();
      
      this._node   = node_instance;
      this._target = (target instanceof Peer) ? target.getID() : target;

      this._targetType = target_type || 'NODE'; // NODE or VALUE

      this._requests = [];

      this.HeardOf = new XORSortedPeerArray().setRelativeNodeID(this._target);
      this.Reached = new XORSortedPeerArray().setRelativeNodeID(this._target);
      this.Queried = new PeerArray();
      this.NotReached = new PeerArray();
      this.Trap = new PeerArray();
    },

    startWith: function(peers) {
      this.HeardOf.add(peers);
      this._startIteration();
      this.progress();
      return this;
    },

    //
    // Resolvers
    //

    fail: function(result) {
      this.Trap.add(this._requests.map(function(request) {
        request.cancel();
        return request.getQueried();
      }));

      this.reject(result);
    },

    succeed: function(result) {
      this.Trap.add(this._requests.map(function(request) {
        request.cancel();
        return request.getQueried();
      }));

      this.resolve(result);
    },

    //
    // Handlers
    //

    _handleResponse: function(request, response, found) {
      this._requests.splice(this._requests.indexOf(request), 1);
      this.Reached.addPeer(request.getQueried());

      if (found) {
        this.succeed(response);
        return;
      }

      this.HeardOf.add(response);
      if (this._lookupSucceeded()) {
        if (found === false) {
          this.fail(this.Reached);
        } else {
          this.succeed(this.Reached);
        }
        return;
      }

      if (this._lookupStaled()) {
        this._staleProtection();
      } else {
        this._startIteration();
      }
      
      this.progress();
    },

    _handleError: function(request, error) {
      this._requests.splice(this._requests.indexOf(request), 1);
      this.NotReached.addPeer(request.getQueried());

      if (this._lookupFailed()) {
        this.fail(this.Reached);
        return;
      }
      else if (this._requests.length === 0) {
        this._staleProtection();
      }
      this.progress();
    },

    //
    // Iteration starters
    //

    _startIteration: function() {
      this.HeardOf.pickOutFirst(KadOH.globals.ALPHA)
                  .filterOut(this.Queried)
                  .sendThemFindRPC(this);
    },

    _staleProtection: function() {
      this.HeardOf.filterOut(this.Queried)
                  .pickOutFirst(KadOH.globals.K)
                  .sendThemFindRPC(this);
    },

    //
    // Testers
    //

    _lookupSucceeded: function() {
      return this.Reached.getPeer(0).getID() === this._target ||
             this.Reached.length() >= globals.K                 &&
             !this.HeardOf.newClosest();
    },

    _lookupFailed: function() {
      return this._requests.length === 0 &&
             this.HeardOf.length() === this.Queried.length();
    },

    _lookupStaled: function() {
      return this._requests.length === 0       &&
             this.Reached.length() < globals.K &&
             this.HeardOf.newClosestIndex() >= globals.ALPHA;
    },

    sendFindRPC: function(peers) {
      if (peers.length() === 0)
        return;
      
      var new_requests = this._node.reactor().sendRPCs(
        peers,
        'FIND_' + this._targetType,
        this._target
      );

      var self = this;
      new_requests.forEach(function(request) {
        request.then(
          function() {
            Array.prototype.splice.call(arguments, 0, 0, request);
            self._handleResponse.apply(self, arguments);
          },
          function() {
            Array.prototype.splice.call(arguments, 0, 0, request);
            self._handleError.apply(self, arguments);
          }
        );
      });
      this._requests.push.apply(this._requests, new_requests);
      this.Queried.add(peers);
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
