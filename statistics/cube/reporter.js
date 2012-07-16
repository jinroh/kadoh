var HEARTBEAT_INTERVAL = 55 * 1000;

var emitter  = require('./emitter')('cube');
var distance = require('../../lib/util/crypto').distance;

var mobile = false, bot = false;

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
  data = data || {};
  data.mobile = mobile;
  data.bot = bot;
  emitter.send({
    type : type,
    time : new Date().toISOString(),
    data : data || {}
  });
}

var Reporter = module.exports = function(node, _mobile, _bot) {
  mobile = _mobile === true ? true : false;
  bot = _bot === true ? true : false;
  this.node = node;
  this.ees  = {
    node : node,
    reactor : node._reactor
  };
};

Reporter.prototype.start = function(_emitter) {
  if (_emitter) emitter = _emitter;
  for (var name in this.ees) {
    if (events.hasOwnProperty(name)) {
      this.ees[name].on(events[name]);
    }
  }
  var self = this;
  function heartbeat() {
    var data = { id : self.node.getID() };
    if (self.node._store) {
      self.node._store.keys(function(keys) {
        data.keys = keys;
        if (self.node._reactor._rtts) {
          var rtts = self.node._reactor._rtts;
          var mean = rtts.reduce(function(prev, next) { return prev + next; }, 0) / rtts.length;
          data.rtts_mean = mean;
          mean = 0;
          var variance = 0;
          for (var i = 0; i < rtts.length; i++) {
            var _mean = mean;
            mean += (rtts[i] - _mean) / (i + 1);
            variance += (rtts[i] - _mean) * (rtts[i] - mean);
          }
          variance /= rtts.length;
          data.rtts_var = variance;
        }
        emit('heartbeat', data);
      });
    } else {
      emit('heartbeat', data);
    }
  }
  heartbeat();
  this.heart = setInterval(heartbeat, HEARTBEAT_INTERVAL);
};

Reporter.prototype.stop = function() {
  clearInterval(this.heartbeat);
  emitter.close();
};
