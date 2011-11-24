// Dep: [KadOH]/peerarray
// Dep: [KadOH]/core/defered
// Dep: [KadOH]/globals

(function(exports) {
  
  var KadOH = exports;
  var Defered = KadOH.core.Defered;
  var PeerArray = KadOH.PeerArray;
  var globals = KadOH.globals;

  var CustomPeerArray = PeerArray.extend({
    sendThemFindRPC : function(iter_lookup) {
      iter_lookup.sendFindRPC(this);
      return this;
    }
  });

  KadOH.IterativeFind2 = Defered.extend({
    
    initialize : function(nodeInstance, targetId, targetType) {
      this.supr();
      
      this._node = nodeInstance;
      this._targetId = targetId;

      //TODO
      this._targetType = targetType || 'NODE'; // NODE or VALUE 

      this._requests = [];

      this.HeardOf = new XORSortedPeerArray().setRelativeNodeId(this.targetId);
      this.Reached = new XORSortedPeerArray().setRelativeNodeId(this.targetId);
      this.Queried = new CustomPeerArray();
      this.NotReached = new CustomPeerArray();
    },

    startWith: function(peers) {
      this.HeardOf.add(peers).sendThemFindRPC();
    },

    _handleResponse: function(request, response) {
      this._requests.splice(this._requests.indexOf(request), 1);

      this.Reached.addPeer(request.getDST());
      this.HeardOf.add(response);

      if (this._lookupSucceeded()) {
        this.resolve(this.Reached);
        return;
      }
      else if (this._bottleneck()) {
        this.HeardOf.remove(this.Queried)
                    .pickOutFirst(KadOH.globals._k)
                    .sendThemFindRPC();
      }
      else {
        this.HeardOf.pickOutFirst(KadOH.globals._alpha)
                    .remove(this.Queried)
                    .sendThemFindRPC();
      }
      this.progress();
    },

    _handleError: function(request, error) {
      this._requests.splice(requests.indexOf(this), 1);
      this.NotReached.push(request.getDST());

      if (this._lookupFailed()) {
        response.reject(this.Reached);
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
      
      var new_requests = this._node.reactor().sendRPCs(peers.getRawArray());

      var self = this;
      new_requests.forEach(function(request) {
        request.then(
          function(response) {
            self._handleResponse(request, response);
          },
          function(error) {
            self._handleError(request, error);
          }
        );
      });

      this._requests.push(new_requests);
      this.Queried.add(peers);
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
