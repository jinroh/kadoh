//
// Bot
//

var Hook  = require('hook.io').Hook;
var KadOH = require(__dirname + '/../dist/KadOH.node.js');
var util  = require('util');

var Bot = exports.Bot = function(options) {
  options = options || {
    node : {},
    hook : {
      name : 'bot'
    },
    delay : undefined
  };
  Hook.call(this, options.hook);
  this.kadoh = new KadOH.Node(null, options.node);

  KadOH.log.setLevel('error');
  // KadOH.log.subscribeTo(this.kadoh);
  // KadOH.log.subscribeTo(this.kadoh._reactor);
  // KadOH.log.subscribeTo(this.kadoh._reactor._transport);

  var self = this;
  self.on('hook::ready', function() {
    self.emit('initialized', options);
    if (options.delay) {
      setTimeout(function() {
        console.log('connecting');
        self.k_connect();
      }, options.delay);
    }

    self.on('spawner::disconnect-nodes', function() {
      self.kadoh.disconnect();
    });
  });
};
util.inherits(Bot, Hook);

Bot.prototype.k_connect = function() {
  this.kadoh.connect(function() {
    this.emit('connected', this.kadoh.getAddress());
    this.k_join();
  }, this);
};

Bot.prototype.k_join = function() {
  var self = this;
  self.once('spawner::bootstraps', function(bootstraps) {
    console.log('join');
    self.kadoh.join(bootstraps, function(error) {
      self.emit('joined', self.kadoh._routingTable.howManyPeers());
    });
  });
  this.emit('bootstraps');
};