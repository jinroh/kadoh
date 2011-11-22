// Dep: [KadOH]/peerarray
// Dep: [KadOH]/core/defered
// Dep: [KadOH]/globals


(function(exports) {
  
  var KadOH = exports;
  var Defered = KadOH.core.Defered;
  var PeerArray = KadOH.PeerArray;
  var globals = KadOH.globals;


  KadOH.IterativeFind = Defered.extend({

    initialize : function(nodeInstance, targetId, targetType) {
      this.supr();
      
      this._node = nodeInstance;
      this._targetId = targetId;

      //TODO
      this._targetType = targetType || 'NODE'; // NODE or VALUE 

      var self = this;
      var CustomPeerArray = PeerArray.extend({
        //Shortcuts for iterativeFind
        sendThemFindRPC : function() {
          self.sendFindRPC(this);
        } 
      });

      this.HeardOf    = new CustomPeerArray(); // Peers that we heard of
      this.Queried    = new CustomPeerArray(); // Peers that we heard of and we've already queried 
      this.Reached    = new CustomPeerArray(); // Peers queried that successfully responded
      this.NotReached = new CustomPeerArray(); // Peers queried but failed to respond
    },

    startWith : function(peers) {
      this.HeardOf.add(peers).sortByDistanceTo(this._targetId);
      this.sendFindRPC(peer);

      return this;
    },

    handleNewHeardOf : function(newHeardOf) {
      this.HeardOf.add(newHeardOf)
                  .sortByDistanceTo(this._targetId);

      if(HeardOf.sortMadeNewClosestTo(this._targetId)) {

        newHeardOf.filterOut(         this.Queried)
                  .sortByDistanceTo(  this._targetId)
                  .pickOutFirst(      globals._alpha)
                  .sendThemFindRPC(   this); 
      } else {
        this.HeardOf.filerOut(        this.Queried)
                    .pickOutFirst(    globals._k)
                    .sendThemFindRPC( this); 
      }

      //notify progression
      this.progress();
    },

    checkIfWeGotIt : function() {
      var closest_reached_peer = this.Reached
                                     .sortByDistanceTo(this._targetId)
                                     .getPeer[0];

      if(closest_peer.getID() === this._targetId) {
        this.resolve(this.Reached
                         .sortByDistanceTo(this._targetId)
                         .clone()
                      );
      }
    },

    checkIfItsFinished : function() {
      //check before if we got it (optionnal : should not append)
      this.checkIfWeGotIt();

      var reached_and_not_reached = this.Reached
                                        .union(this.NotReached);

      if(this.Queried.equals(reached_and_not_reached)) {
        //no more waiting queries : finished
        this.reject(this.Reached
                         .sortByDistanceTo(this.targetId)
                         .clone()
                      );
        }
    },

    handleRPCFindComplete : function(fromPeer, response) {
      this.Reached.add(fromPeer);
      this.checkIfWeGotIt();
      this.handleNewHeardOf(new PeerArray(response));
      this.checkIfItsFinished();
    },

    handleRPCFindReject : function(fromPeer) {
      this.NotReached.add(fromPeer);
      this.checkIfItsFinished();
    },

    sendFindRPC : function(peers) {
      peers = (peers instanceof PeerArray) ? peers.getRawArray() : peers;

      var requests = this._node.reactor().sendRPCs(peers, 'FIND_NODE', [this._targetId]);
      this.Queried.add(peers).sortByDistanceTo(this._targetId);

      var self;
      requests.forEach(function(request) {
        request.then(
          //callback
          function(response) {
            self.handleRPCFindComplete(rpc.getDST(), response);
          },
          //errback
          function() {
            self.handleRPCFindReject(rpc.getDST());
          });

      });
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));

