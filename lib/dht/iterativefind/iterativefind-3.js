var Deferred           = require('../../util/deferred'),
    PeerArray          = require('../../util/peerarray'),
    XORSortedPeerArray = require('../../util/xorsorted-peerarray'),
    globals            = require('../../globals'),
    Peer               = require('../peer');


var IterativeFind3 = module.exports = Deferred.extend({
  
  initialize: function(node, target, target_type) {
    this.supr();
    
    this._node   = node;
    this._target = (target instanceof Peer) ? target.getID() : target;
    this._targetType = 'FIND_' + (target_type || 'NODE'); // FIND_NODE or FIND_VALUE
    this._newClosest = null;

    this.Requests = [];

    this.HeardOf    = new XORSortedPeerArray().setRelative(this._target);
    this.Reached    = new XORSortedPeerArray().setRelative(this._target);
    this.Querying   = new PeerArray();
    this.Queried    = new PeerArray();
    this.NotReached = new PeerArray();
    this.Trap       = new PeerArray();
  },

  startWith: function(peers) {
    this.HeardOf.add(peers);
    this._startIteration();
    return this;
  },

  //
  // Resolvers
  //

  fail: function() {
    this.cancelAllRequests();
    this.reject(this.Reached);
  },

  succeed: function(result) {
    this.cancelAllRequests();
    this.resolve(result, this.Reached);
  },

  //
  // Handlers
  //

  _handleResponse: function(queried, response, found) {
    this.Querying.removePeer(queried);
    this.Reached.addPeer(queried);
    if (found === true) {
      this.succeed(response);
    } else if (queried.getID() === this._target) {
      this.succeed(queried);
    } else {
      this.HeardOf.add(response);
      this._newClosest = this.HeardOf.newClosestIndex();
      if (this._lookupStaled()) {
        this._staleProtection();
      } else if (this._lookupFinished()) {
        this.fail();
      } else {
        this._startIteration();
      }
    }
  },

  _handleError: function(queried, error) {
    this.Querying.removePeer(queried);
    this.HeardOf.removePeer(queried);
    this.NotReached.addPeer(queried);
    this._newClosest = null;
    if (this._lookupStaled()) {
      this._staleProtection();
    } else if (this._lookupFinished()) {
      this.fail();
    } else {
      this.progress();
    }
  },

  //
  // Iteration starters
  //

  _startIteration: function() {
    this.HeardOf.first(globals.ALPHA)
                .difference(this.Queried)
                .sendThemFindRPC(this);
    this.progress();
  },

  _staleProtection: function() {
    var peers = this.HeardOf.difference(this.Queried);
    if (peers.empty()) {
      this.fail();
    } else {
      peers.first(globals.K)
           .sendThemFindRPC(this);
      this.progress();
    }
  },

  //
  // Stop conditions
  //

  _lookupFinished: function() {
    var finished = (this.Querying.empty() && this.Reached.size() >= globals.K);
    if (this._newClosest !== null) {
      finished = finished && (this._newClosest < globals.ALPHA && this._newClosest >= 0);
    }
    return finished;
  },

  _lookupStaled: function() {
    var staled = (this.Querying.empty() && this.Reached.size() < globals.K);
    if (this._newClosest !== null) {
      staled = staled && (this._newClosest >= globals.ALPHA || this._newClosest < 0);
    }
    return staled;
  },

  sendFindRPC: function(peers) {
    var new_requests = this._node._reactor.sendRPCs(peers, this._targetType, this._target);
    new_requests.forEach(function(request) {
      request.then(
        this._handleResponse.bind(this, request.getQueried()),
        this._handleError.bind(this, request.getQueried())
      );
    }, this);
    this.Requests.push.apply(this.Requests, new_requests);
    this.Querying.add(peers);
    this.Queried.add(peers);
  },

  cancelAllRequests: function() {
    this.Trap.add(this.Querying);
    for (var i = this.Requests.length - 1; i >= 0; i--) {
      this.Requests[i].cancel();
    }
  }

});