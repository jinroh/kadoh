// Dep: [KadOH]/peerarray
// Dep: [KadOH]/core/defered
// Dep: [KadOH]/globals

(function(exports) {
  
  var KadOH = exports;
  var Defered = KadOH.core.Defered;
  var PeerArray = KadOH.PeerArray;
  var XORSortedPeerArray = KadOH.XORSortedPeerArray;
  var globals = KadOH.globals;

  var CustomPeerArray = PeerArray.extend({
    sendThemFindRPC : function(iter_lookup) {
      iter_lookup.sendFindRPC(this);
      return this;
    }
  });

  KadOH.IterativeFind = Defered.extend({
    
    initialize : function(nodeInstance, targetId, targetType) {
      this.supr();
      
      this._node = nodeInstance;
      this._targetId = targetId;

      //TODO
      this._targetType = targetType || 'NODE'; // NODE or VALUE

      this._requests = [];

      this.HeardOf = new XORSortedPeerArray().setRelativeNodeId(this._targetId);
      this.Reached = new XORSortedPeerArray().setRelativeNodeId(this._targetId);
      this.Queried = new CustomPeerArray();
      this.NotReached = new CustomPeerArray();
      this.Trap = new CustomPeerArray();
    },

    startWith: function(peers) {
      this.HeardOf.add(peers).sendThemFindRPC(this);
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
      else if (this._bottleneck()) {
        this.HeardOf.filterOut(this.Queried)
                    .pickOutFirst(KadOH.globals._k)
                    .sendThemFindRPC(this);
      }
      else {
        this.HeardOf.pickOutFirst(KadOH.globals._alpha)
                    .filterOut(this.Queried)
                    .sendThemFindRPC(this);
      }
      this.progress();
    },

    _handleError: function(request, error) {
      this._requests.splice(this._requests.indexOf(request), 1);
      this.NotReached.addPeer(request.getDST());

      if (this._lookupFailed()) {
        try {
          this.reject(this.Reached);
        } catch(e) {}
      }
      this.progress();
    },

    _lookupSucceeded: function() {
      return (this.Reached.getPeer(0).getId() === this._targetId) ||
             (!this.HeardOf.sortMadeNewClosestTo() && this.Reached.length() >= globals._k);
    },

    _lookupFailed: function() {
      return this._requests.length === 0;
    },

    _bottleneck: function() {
      return (!this.HeardOf.sortMadeNewClosestTo() && this._requests.length === 0);
    },

    sendFindRPC: function(peers) {
      if (peers.length() === 0)
        return;
      
      var new_requests = this._node.reactor().sendRPCs(
        peers.getRawArray(),
        this._targetType,
        [this._targetId]
      );

      var self = this;
      new_requests.forEach(function(request) {
        request.then(
          function(response) {
            if (self.state === 'progress')
              self._handleResponse(request, response);
          },
          function(error) {
            if (self.state === 'progress')
              self._handleError(request, error);
          }
        );
      });

      this._requests = this._requests.concat(new_requests);
      this.Queried.add(peers);
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
