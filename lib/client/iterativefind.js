// Dep: [KadOH]/peerarray
// Dep: [KadOH]/core/deferred
// Dep: [KadOH]/globals


(function(exports) {
  
  var KadOH = exports;
  var Deferred = KadOH.core.Deferred;
  var PeerArray = KadOH.PeerArray;
  var globals = KadOH.globals;

  var XORSortedPeerArray = KadOH.XORSortedPeerArray;

  KadOH.IterativeFind = Deferred.extend({

    initialize: function(nodeInstance, target, targetType) {
      this.supr();
      
      this._node = nodeInstance;
      this._target = target; //should be a Peer instance

      //TODO
      this._targetType = targetType || 'NODE'; // NODE or VALUE 

      this.HeardOf    = new XORSortedPeerArray().setRelativeNodeID(this._target.getID()); // Peers that we heard of
      this.Queried    = new XORSortedPeerArray().setRelativeNodeID(this._target.getID()); // Peers that we heard of and we've already queried 
      this.Reached    = new PeerArray(); // Peers queried that successfully responded
      this.NotReached = new PeerArray(); // Peers queried but failed to respond
      this.Trap       = new PeerArray(); // Peers queried but that appears unrelevant to query

      this.emit('init');
    },

    startWith: function(peers) {
      this.HeardOf.add(peers);
      this.sendFindRPC(peers);
      this.progress();
      return this;
    },

    handleNewHeardOf: function(newHeardOf) {
      this.emit('newHeardOf', newHeardOf.filterOut(this.HeardOf));

      this.HeardOf.add(newHeardOf);

      if (this.HeardOf.newClosest()) {
        var toQuery = this.HeardOf.pickOutFirst(globals.ALPHA);
        
        // move the pending requests to trash
        this.Trap.add(this.Queried.filterOut(toQuery)
                                  .filterOut(this.Reached)
                                  .filterOut(this.NotReached));

        toQuery.sendThemFindRPC(this);
      } else {
          this.HeardOf.pickOutFirst(    globals.K)
                     .filterOut(        this.Queried)       
                     .sendThemFindRPC(  this); 
      }
    },

    checkIfWeGotIt: function() {
      var closest_reached_peer;
      try {
        closest_reached_peer = this.Reached.getPeer(0);
      } catch(e) {}

      if (closest_reached_peer) 
        this.emit('closestReachedPeer', closest_reached_peer);

      if (closest_reached_peer && closest_reached_peer.equals(this._target)) {
        this.resolve(this.Reached);
        return true;
      }
      return false;
    },

    checkIfItsFinished: function() {
      //check before if we got it (optionnal : should not append)
      this.checkIfWeGotIt();

      var reached_and_not_reached = this.Reached
                                        .union(this.NotReached)
                                        .union(this.Trap);

      this.emit('requestsState', reached_and_not_reached.length(), this.Queried.length());

      if (this.Queried.equals(reached_and_not_reached)) {
        //no more waiting queries : finished
        this.resolve(this.Reached);
        return true;  
      }
      return false;
    },

    handleRPCFindComplete: function(fromPeer, response) {
      this.Reached.addPeer(fromPeer);
      this.NotReached.removePeer(fromPeer);
      this.Trap.removePeer(fromPeer);
      
      this.emit('Reached', fromPeer, response);

      if (this.checkIfWeGotIt()) {
        return;
      }
      this.handleNewHeardOf(response);
      this.progress();
      this.checkIfItsFinished();
    },

    handleRPCFindReject: function(fromPeer) {
      this.NotReached.addPeer(fromPeer);
      this.Reached.removePeer(fromPeer);
      this.Trap.removePeer(fromPeer);
      
      this.emit('NotReached', fromPeer);
      this.progress();
      this.checkIfItsFinished();
    },

    sendFindRPC: function(peers) {
      if (peers.length === 0 )
        return;

      var requests = this._node.reactor().sendRPCs(peers, 'FIND_NODE', this._target);

      this.Queried.add(peers);
      this.Trap.remove(peers);

      requests.forEach(function(request) {
        request.then(
          //callback
          function(response) {
            if (this.state === 'progress' && !this.Trap.contains(request.getDST()))
              this.handleRPCFindComplete(request.getDST(), response);
          },
          //errback
          function() {
            if (this.state === 'progress' && !this.Trap.contains(request.getDST()))
              this.handleRPCFindReject(request.getDST());
          });

      }, this);
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));

