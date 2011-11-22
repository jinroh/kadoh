// Dep: [KadOH]/core/class
// Dep: [KadOH]/peer
// Dep: [KadOH]/util/crypto

(function(exports) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  var Peer = KadOH.Peer;
  var Crypto = KadOH.util.Crypto;


  KadOH.PeerArray = Class({

    initialize: function(peers) {
      this._PEERS = [];

      if(peers) 
        this.add(peers);

      this._isPeerArray = true;
      this._newClosest = false;

      this._isSortedByDistance = false;
      this._relativeNodeId = undefined;

    },

    setRelativeNodeId : function(nodeId) {
      this._relativeNodeId = nodeID;
    },

    isSortedByDistanceTo : function(relativeNodeId) {
      return (this._relativeNodeId === relativeNodeId) && this._isSortedByDistance;
    },

    getRawArray : function() {
      return this._PEERS;
    },

    getPeer : function(index) {
      return this._PEERS[index];
    },

    length : function() {
      return this._PEERS.length;
    },

// TRANSFORMing methods : these methods applly on the instance
    add : function(peers, silent) {
      if(peers instanceof PeerArray || (peers instanceof Array && peers.length !==0 && (peers[0] instanceof Array || peers[0] instanceof Peer))) {
        var self = this;
        peers.forEach(function(peer){
          self._addOne(peer, silent);
        });
      } else {
        this._addOne(peers, silent);
      }
      return this;
    },

    _addOne : function(peer, silent) {
      peer = (peer instanceof Peer) ? peer : new Peer(peer);

      if(this.contains(peer)) {
        return this;
      } else {
        this._PEERS.push(peer);
        
        if(silent) 
          this._isSortedByDistance = false;

        return this;
      }
    },


    remove : function(peers) {
      if(peers instanceof PeerArray || (peers instanceof Array && peers.length !==0 && (peers[0] instanceof Array || peers[0] instanceof Peer))) {
        var self = this;
        peers.forEach(function(peer){
          self._removeOne(peer);
        });
      } else {
        this._removeOne(peers);
      }
      return this;
    },

    _removeOne : function (peer) {
      rmPeer = (peer instanceof Peer) ? peer : new Peer(peer);

      var self = this;
      this.forEach(function(peer, index) {
        if(rmPeer.equals(peer)) {
          self._PEERS.splice(self._PEERS.indexOf(peer), 1);
        }
      });
    },

    contains : function(peers) {
      if(peers instanceof PeerArray || (peers instanceof Array && peers.length !==0 && (peers[0] instanceof Array || peers[0] instanceof Peer))) {
        var contains = true;
        peers.forEach(function(peer) {
          contains = contains && this._containsOne(peer);
        });
        return contains;
        
      } else {
        return this._containsOne(peers);
      }
    },

    _containsOne : function(peer) {
      lookPeer = (peer instanceof Peer) ? peer : new Peer(peer);

      var found = false;
      var self = this;
      this.forEach(function(peer) {
        if(lookPeer.equals(peer)) {
            found = true;
        }
      });

      return found;
    },

    equals : function(peers) {
      peers = (peers instanceof PeerArray) ? peers : (new PeerArray(peers));

      return this.contains(peers) && peers.contains(this);
    },

    forEach: function() {
      Array.prototype.forEach.apply(this._PEERS, arguments);
      return this;
    },

    sort : function() {
      Array.prototype.sort.apply(this._PEERS, arguments);
      return this;
    },

    sortByDistanceTo : function(relativeNodeId) {
      if(! this.isSortedByDistanceTo(relativeNodeId)) {

        this._newClosest = false;  
        var prev_closest = this.get(0);

        var compare = Crypto.compareBytes;
        this.sort(function(peerA, peerB) {
          a = peerA.getXORWith(relativeNodeId);
          b = peerB.getXORWith(relativeNodeId);
          return compare(a, b);
        });

        var new_closest = this.get(0);
        if(! new_closest.equals(prev_closest))
          this.newClosest = true;
      }

      this._isSortedByDistance = true;
      this.setRelativeNodeId(relativeNodeId);

      return this;
    },

    sortMadeNewClosestTo : function(relativeNodeId) {
      if(! this.isSortedByDistanceTo(relativeNodeId)) 
        throw new Error('PeerArray not sorted by distance to '+relativeNodeId);

      return this._newClosest;
    },

//NON-TRANSFORMing methods : these methodes return a new instance of PeerArray c
    clone : function() {
      var n = new PeerArray(this);
      n.setParentNodeId(this._parentNodeId);
      n._isSortedByDistance = this.isSorted();
      return n;
    },

    union : function(peers) {
      var clone = this.clone();
      clone.add(peers);
      return clone;
    },
    
    filterOut : function(peers) {
      var clone = this.clone();
      clone.remove(peers);
      return clone;
    } ,

    pickOutFirst : function(number) {
      var clone = this.clone();
      clone.sortByDistanceTo();

      var to_pop = clone.length() - n;

      if(to_pop > 0) {
        for(var i = 0; i<to_pop; i++) {
          clone.pop();
        }
      }
      
      return clone; 
    }
  });
  
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
