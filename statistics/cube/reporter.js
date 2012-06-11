var HEARTBEAT_INTERVAL = 55 * 1000;

var emitter  = require('./emitter')('collector.kadoh.fr.nf');
var distance = require('../../lib/util/crypto').distance;

var events = {
  node : {
    iterativeFindNode: function(lookup) {
      var begin = new Date().getTime();
      lookup.always(function(reached) {
        lookupHandler(lookup, 'node', begin, reached);
      });
    },

    iterativeFindValue: function(lookup) {
      var begin = new Date().getTime();
      lookup.then(function(result, reached) {
        lookupHandler(lookup, 'value', begin, reached);
      }, function(reached) {
        lookupHandler(lookup, 'value', begin, reached);
      });
    }
  },

  reactor : {
    querying : function(rpc) {
      rpc.always(function() {
        var data = rpc.normalizeParams();
        data.queried  = rpc.getQueried().getID();
        data.querying = rpc.getQuerying().getID();
        data.rtt      = rpc.getRTT();
        data.rejected = rpc.isRejected();
        data.timeout  = rpc.isTimeout();
        switch (rpc.getMethod()) {
          case 'FIND_NODE':
          case 'FIND_VALUE':
            data.distance = distance(data.queried, rpc.getTarget());
          break;
          case 'STORE':
            data.distance = distance(data.queried, rpc.getKey());
          break;
          default:
          break;
        }
        emit(rpc.getMethod().toLowerCase(), data);
      });
    }
  }
};

function lookupHandler(lookup, type, begin, reached) {
  data = {
    type : 'node',
    time : new Date().getTime() - begin,
    reached  : reached.size(),
    queries  : lookup._mapped.length,
    closest  : reached.size() > 0 ? reached.getPeer(0).getDistanceTo(lookup._target) : -1,
    rejected : lookup.isRejected()
  };
  emit('iterative_find', data);
}

function emit(type, data) {
  emitter.send({
    type : type,
    time : new Date().getTime(),
    data : data || {}
  });
}

var Reporter = module.exports = function(node) {
  this.node = node;
  this.ees  = {
    node         : node,
    reactor      : node._reactor,
    transport    : node._reactor._transport,
    routingTable : node._routingTable,
    store        : node._store
  };
};

Reporter.prototype.start = function() {
  for (var name in this.ees) {
    if (events[name]) {
      this.ees[name].on(events[name]);
    }
  }
  var self = this;
  this.heartbeat = setInterval(function() {
    emit('heartbeat', {id : self.node.getID()});
  }, HEARTBEAT_INTERVAL);
};

Reporter.prototype.stop = function() {
  clearInterval(this.heartbeat);
  emitter.close();
};
