// Dep: [KadOH]/peerarray
// Dep: [KadOH]/core/deferred
// Dep: [KadOH]/globals

(function(exports) {
  
  var KadOH = exports;
  var Deferred = KadOH.core.Deferred;
  var globals = KadOH.globals;

  var XORSortedPeerArray = KadOH.XORSortedPeerArray;
  var PeerArray = KadOH.PeerArray;

  KadOH.IterativeFind = Deferred.extend({
    
    initialize : function(node_instance, target, target_type) {
      this.supr();
      
      this._node = node_instance;
      this._target = target; //shoul be a peer

      //TODO
      this._targetType = target_type || 'NODE'; // NODE or VALUE

      this._requests = [];

      this.HeardOf = new XORSortedPeerArray().setRelativeNodeId(this._target.getID());
      this.Reached = new XORSortedPeerArray().setRelativeNodeId(this._target.getID());
      this.Queried = new PeerArray();
      this.NotReached = new PeerArray();
      this.Trap = new PeerArray();
    },

    startWith: function(peers) {
      this.HeardOf.add(peers).sendThemFindRPC(this);
      this.progress();
      return this;
    },

    _handleResponse: function(request, response) {
      this._requests.splice(this._requests.indexOf(request), 1);

      this.Reached.addPeer(request.getDST());
      this.HeardOf.add(response);

      if (this._lookupSucceeded()) {
        this.Trap.add(this._requests.map(function(request) {
          return request.getDST();
        }));
        this.resolve(this.Reached);
        return;
      }

      if (this._lookupStaled())
        this._staleProtection();
      else
        this.HeardOf.pickOutFirst(KadOH.globals.ALPHA)
                    .filterOut(this.Queried)
                    .sendThemFindRPC(this);
      
      this.progress();
    },

    _handleError: function(request, error) {
      this._requests.splice(this._requests.indexOf(request), 1);
      this.NotReached.addPeer(request.getDST());

      if (this._requests.length === 0) {
        if (this._lookupFailed()) {
          this.reject(this.Reached);
        } else {
          this._staleProtection();
        }
      }
      this.progress();
    },

    _staleProtection: function() {
      this.HeardOf.filterOut(this.Queried)
                  .pickOutFirst(KadOH.globals.K)
                  .sendThemFindRPC(this);
    },

    _lookupSucceeded: function() {
      return (
        this.Reached.getPeer(0).getId() === this._target.getID() ||
        (
          !this.HeardOf.newClosest() &&
          this.Reached.length() >= globals.K
        )
      );
    },

    _lookupFailed: function() {
      return (
        this._requests.length === 0 &&
        this.HeardOf.length() === this.Queried.length()
      );
    },

    _lookupStaled: function() {
      return (
        !this.HeardOf.newClosestIndex() > globals.ALPHA &&
        this._requests.length === 0 &&
        this.Reached.length() < globals.K
      );
    },

    sendFindRPC: function(peers) {
      if (peers.length() === 0)
        return;
      
      var new_requests = this._node.reactor().sendRPCs(
        peers,
        'FIND_NODE',
        this._target
      );

      var self = this;
      new_requests.forEach(function(request) {
        request.then(
          function(response) {
            (self.state !== 'progress') || self._handleResponse(request, response);
          },
          function(error) {
            (self.state !== 'progress') || self._handleError(request, error);
          }
        );
      });

      this._requests = this._requests.concat(new_requests);
      this.Queried.add(peers);
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
