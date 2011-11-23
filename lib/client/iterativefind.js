// Dep: [KadOH]/peerarray
// Dep: [KadOH]/core/defered
// Dep: [KadOH]/globals


(function(exports) {
  
  var KadOH = exports;
  var Defered = KadOH.core.Defered;
  var PeerArray = KadOH.PeerArray;
  var globals = KadOH.globals;

  var CustomPeerArray = PeerArray.extend({
    //Shortcuts for iterativeFind
    sendThemFindRPC : function(IterInsance) {
      IterInsance.sendFindRPC(this);

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

      this.HeardOf    = new CustomPeerArray(); // Peers that we heard of
      this.Queried    = new CustomPeerArray(); // Peers that we heard of and we've already queried 
      this.Reached    = new CustomPeerArray(); // Peers queried that successfully responded
      this.NotReached = new CustomPeerArray(); // Peers queried but failed to respond
      this.Trap       = new CustomPeerArray(); // Peers queried but that appears unrelevant to query

      this.emit('init');
    },

    startWith : function(peers) {
      this.HeardOf.add(peers).sortByDistanceTo(this._targetId);
      this.sendFindRPC(peers);

      return this;
    },

    handleNewHeardOf : function(newHeardOf) {
      this.emit('newHeardOf', newHeardOf.filterOut(this.HeardOf));
      // console.log('HeardOf : '+newHeardOf.filterOut(this.HeardOf)
      //                                    .getRawArray()
      //                                    .map(function(peer){
      //                                      return peer.getSocket();
      //                                    }));

      this.HeardOf.add(newHeardOf)
                  .sortByDistanceTo(this._targetId);

      if(this.HeardOf.sortMadeNewClosestTo(this._targetId)) {

        var toQuery = newHeardOf.sortByDistanceTo(  this._targetId)
                                .pickOutFirst(      globals._alpha);
        
        //move the pending requests to trash
        this.Trap.add(this.Queried.filterOut(toQuery));
        toQuery.sendThemFindRPC(this);

      } else {
        this.HeardOf.pickOutFirst(    globals._k)
                    .filterOut(       this.Reached)       
                    .sendThemFindRPC( this); 
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
      //console.log(reached_and_not_reached.length()+' / '+ this.Queried.length());
      this.emit('requestsState', reached_and_not_reached.length(), this.Queried.length());

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
      response = new CustomPeerArray(response);

      //console.log('Reached : '+fromPeer.getSocket());
      this.emit('Reached', fromPeer, response);
      
      this.Reached.add(fromPeer);

      if(this.checkIfWeGotIt()) {
        return;
      }
      this.handleNewHeardOf(response);
      this.checkIfItsFinished();
    },

    handleRPCFindReject : function(fromPeer) {
      //console.log('NotReached :'+fromPeer.getSocket());
      this.emit('NotReached', fromPeer);

      this.NotReached.add(fromPeer);
      this.checkIfItsFinished();
    },

    sendFindRPC : function(peers) {
      peers = (peers instanceof PeerArray) ? peers.getRawArray() : peers;

      if(peers.length === 0 )
        return;

      //console.log('Queried ' + peers.map(function(p) {return p.getSocket();}));
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

