var Deferred           = require('../../util/deferred'),
    PeerArray          = require('../../util/peerarray'),
    XORSortedPeerArray = require('../../util/xorsorted-peerarray'),
    globals            = require('../../globals'),
    Peer               = require('../peer');

var IterativeFind2 = module.exports = Deferred.extend({
  
  initialize: function(node_instance, target, target_type) {
    this.supr();
    
    this._node   = node_instance;
    this._target = (target instanceof Peer) ? target.getID() : target;

    this._targetType = target_type || 'NODE'; // NODE or VALUE

    this._requests = [];

    this.HeardOf    = new XORSortedPeerArray().setRelative(this._target);
    this.Reached    = new XORSortedPeerArray().setRelative(this._target);
    this.Queried    = new PeerArray();
    this.NotReached = new PeerArray();
    this.Trap       = new PeerArray();
  },

  startWith: function(peers) {
    this.HeardOf.add(peers);
    this._startIteration();
    this.progress();
    return this;
  },

  //
  // Resolvers
  //

  fail: function(result) {
    this.Trap.add(this._requests.map(function(request) {
      request.cancel();
      return request.getQueried();
    }));

    this.reject(result);
  },

  succeed: function(result) {
    this.Trap.add(this._requests.map(function(request) {
      request.cancel();
      return request.getQueried();
    }));

    this.resolve(result, this.Reached);
  },

  //
  // Handlers
  //

  _handleResponse: function(request, response, found) {
    this._requests.splice(this._requests.indexOf(request), 1);
    this.Reached.addPeer(request.getQueried());

    if (found) {
      this.succeed(response);
      return;
    }

    this.HeardOf.add(response);
    if (this._lookupSucceeded()) {
      if (found === false) {
        this.fail(this.Reached);
      } else {
        this.succeed(this.Reached);
      }
      return;
    }

    if (this._lookupStaled()) {
      this._staleProtection();
    } else {
      this._startIteration();
    }
    
    this.progress();
  },

  _handleError: function(request, error) {
    this._requests.splice(this._requests.indexOf(request), 1);
    this.NotReached.addPeer(request.getQueried());

    if (this._lookupFailed()) {
      this.fail(this.Reached);
      return;
    }
    else if (this._requests.length === 0) {
      this._staleProtection();
    }
    this.progress();
  },

  //
  // Iteration starters
  //

  _startIteration: function() {
    this.HeardOf.first(KadOH.globals.ALPHA)
                .difference(this.Queried)
                .sendThemFindRPC(this);
  },

  _staleProtection: function() {
    this.HeardOf.difference(this.Queried)
                .first(KadOH.globals.K)
                .sendThemFindRPC(this);
  },

  //
  // Testers
  //

  _lookupSucceeded: function() {
    return this.Reached.getPeer(0).getID() === this._target ||
           this.Reached.size() >= globals.K                 &&
           !this.HeardOf.newClosest();
  },

  _lookupFailed: function() {
    return this._requests.length === 0 &&
           this.HeardOf.size() === this.Queried.size();
  },

  _lookupStaled: function() {
    return this._requests.length === 0       &&
           this.Reached.size() < globals.K &&
           this.HeardOf.newClosestIndex() >= globals.ALPHA;
  },

  sendFindRPC: function(peers) {
    if (peers.size() === 0)
      return;
    
    var new_requests = this._node._reactor.sendRPCs(
      peers,
      'FIND_' + this._targetType,
      this._target
    );

    var self = this;
    new_requests.forEach(function(request) {
      request.then(
        function() {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(request);
          self._handleResponse.apply(self, args);
        },
        function() {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(request);
          self._handleError.apply(self, args);
        }
      );
    });
    this._requests.push.apply(this._requests, new_requests);
    this.Queried.add(peers);
  }

});