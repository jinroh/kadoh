// Dep: [KadOH]/peerarray
// Dep: [KadOH]/core/defered
// Dep: [KadOH]/globals


(function(exports) {
  
  var KadOH = exports;
  var Defered = KadOH.core.Defered;
  var PeerArray = KadOH.PeerArray;
  var globals = KadOH.globals;

  var XORSortedPeerArray = KadOH.XORSortedPeerArray;

  KadOH.IterativeFind = Defered.extend({

    initialize : function(nodeInstance, targetId, targetType) {
      this.supr();
      
      this._node = nodeInstance;
      this._targetId = targetId;

      //TODO
      this._targetType = targetType || 'NODE'; // NODE or VALUE 

      this.HeardOf    = new XORSortedPeerArray().setRelativeNodeId(this._targetId); // Peers that we heard of
      this.Queried    = new XORSortedPeerArray().setRelativeNodeId(this._targetId); // Peers that we heard of and we've already queried 
      this.Reached    = new XORSortedPeerArray().setRelativeNodeId(this._targetId); // Peers queried that successfully responded
      this.NotReached = new XORSortedPeerArray().setRelativeNodeId(this._targetId); // Peers queried but failed to respond
      this.Trap       = new XORSortedPeerArray().setRelativeNodeId(this._targetId); // Peers queried but that appears unrelevant to query

      this.emit('init');
    },

    startWith : function(peers) {
      this.HeardOf.add(peers).sortByDistanceTo(this._targetId);
      this.sendFindRPC(peers);
      return this;
    },

    handleNewHeardOf : function(newHeardOf) {
      this.emit('newHeardOf', newHeardOf.filterOut(this.HeardOf));

      this.HeardOf.add(newHeardOf)
                  .sortByDistanceTo(this._targetId);

      if(this.HeardOf.sortMadeNewClosestTo(this._targetId)) {

        var toQuery = this.HeardOf.sortByDistanceTo(  this._targetId)
                                .pickOutFirst(      globals._alpha);
        
        //move the pending requests to trash
        this.Trap.add(this.Queried.filterOut(toQuery)
                                  .filterOut(this.Reached)
                                  .filterOut(this.NotReached));
        toQuery.sendThemFindRPC(this);

      } else {
         // this.HeardOf.pickOutFirst(    globals._k)
         //            .filterOut(       this.Reached)       
         //            .sendThemFindRPC( this); 
      }
    },

    checkIfWeGotIt : function() {
      var closest_reached_peer = this.Reached
                                     .sortByDistanceTo(this._targetId)
                                     .getPeer(0);

      this.emit('closestReachedPeer', closest_reached_peer);

      if(closest_reached_peer && closest_reached_peer.getId() === this._targetId) {
        this.resolve(this.Reached
                         .sortByDistanceTo(this._targetId)
                         .clone()
                      );
        return true;
      }
      return false;
    },

    checkIfItsFinished : function() {
      //check before if we got it (optionnal : should not append)
      this.checkIfWeGotIt();

      var reached_and_not_reached = this.Reached
                                        .union(this.NotReached)
                                        .union(this.Trap);

      this.emit('requestsState', reached_and_not_reached.length(), this.Queried.length());
      this.HeardOf.sortByDistanceTo(this._targetId);

      if(this.Queried.equals(reached_and_not_reached)) {
        //no more waiting queries : finished
        this.resolve(this.Reached
                         .sortByDistanceTo(this._targetId)
                         .clone()
                         .getRawArray()
                      );
        return true;  
      }
      return false;
    },

    handleRPCFindComplete : function(fromPeer, response) {
      response = new XORSortedPeerArray(response, this._targetId);


      this.Reached.addPeer(fromPeer);
      this.NotReached.removePeer(fromPeer);
      this.Trap.removePeer(fromPeer);
      

      this.emit('Reached', fromPeer, response);

      if(this.checkIfWeGotIt()) {
        return;
      }
      this.handleNewHeardOf(response);
      this.checkIfItsFinished();
      this.progress();

    },

    handleRPCFindReject : function(fromPeer) {
      this.NotReached.addPeer(fromPeer);
      this.Reached.removePeer(fromPeer);
      this.Trap.removePeer(fromPeer);
      
      this.emit('NotReached', fromPeer);
      this.checkIfItsFinished();
      this.progress();

    },

    sendFindRPC : function(peers) {
      peers = (peers instanceof PeerArray) ? peers.getRawArray() : peers;

      if(peers.length === 0 )
        return;

      var requests = this._node.reactor().sendRPCs(peers, 'FIND_NODE', [this._targetId]);

      this.Queried.add(peers).sortByDistanceTo(this._targetId);
      this.Trap.remove(peers);

      var self = this;
      requests.forEach(function(request) {
        request.then(
          //callback
          function(response) {
            if(self.state === 'progress' && !self.Trap.contains(request.getDST()))
              self.handleRPCFindComplete(request.getDST(), response);
          },
          //errback
          function() {
            if(self.state === 'progress' && !self.Trap.contains(request.getDST()))
              self.handleRPCFindReject(request.getDST());
          });

      });
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));

