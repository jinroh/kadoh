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
      this._isSortedByDistance = false;
      this._newClosest = false;

      this._parentNodeId = undefined;

    },

    setParentNodeId : function(nodeId) {
      this._parentNodeId = nodeID;
    },

    isSorted : function() {
      return this._isSortedByDistance;
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

    contains : function(peer) {
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

    _removeOne : function (peer) {
      rmPeer = (peer instanceof Peer) ? peer : new Peer(peer);

      var self = this;
      this.forEach(function(peer, index) {
        if(rmPeer.equals(peer)) {
          self._PEERS.splice(self._PEERS.indexOf(peer), 1);
        }
      });
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

    forEach: function() {
      Array.prototype.forEach.apply(this._PEERS, arguments);
      return this;
    },

    sort : function() {
      Array.prototype.sort.apply(this._PEERS, arguments);
      return this;
    },

    sortByDistance : function(relativeNodeId) {
      relativeNodeId = relativeNodeId || this._parentNodeId;
      if(! relativeNodeId)
        throw new Error('no NodeId to sort by distance');
      if(! this.isSorted()) {
        this._newClosest = false;  
        var prev_closest = this.get(0);

        var compare = Crypto.compareBytes;
        this.sort(function(a, b) {
          a = Crypto.XOR(a.getId(), relativeNodeId);
          b = Crypto.XOR(b.getId(), relativeNodeId);
          return compare(a, b);
        });

        var new_closest = this.get(0);
        if(! new_closest.equals(prev_closest))
          this.newClosest = true;
      }
      this._isSortedByDistance = true;
      return this;
    },

    sortMadeNewClosest : function() {
      if(! this.isSorted) 
        throw new Error('PeerArray not sorted');

      return this.newClosest;
    },

//NON-TRANSFORMing methods : these methodes return a new instance of PeerArray (no)
    clone : function() {
      var n = new PeerArray(this);
      n.setParentNodeId(this._parentNodeId);
      n._isSortedByDistance = this.isSorted();
      return n;
    },
    
    filterOut : function(peers) {
      var clone = this.clone();
      clone.remove(peers);
    } ,

    pickOutFirst : function(number) {
      var clone = this.clone();
      clone.sortByDistance();

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
