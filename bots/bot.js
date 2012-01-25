//
// Bot
//

var Hook  = require('hook.io').Hook;
var KadOH = require(__dirname + '/../dist/KadOH.node.js');
var util  = require('util');

KadOH.log.setLevel('error');

var Bot = exports.Bot = function(options) {
  options = this._options = options || {
    node : {},
    hook : {
      name   : 'bot',
      silent : true
    },
    delay : undefined
  };

  Hook.call(this, options.hook);
  this.kadoh = new KadOH.Node(null, options.node);

  var self = this;
  self.on('hook::ready', function() {
    self.emit('initialized', options);
    
    self.on('spawner::disconnect-nodes', function() {
      self.kadoh.disconnect();
    });

    self.kLaunch();
  });
};
util.inherits(Bot, Hook);

Bot.prototype.kLaunch = function() {
  setTimeout(function(self) {
    console.log(self.name + ' connecting');
    self.kConnect();
  }, this._options.delay || 1, this);
};

Bot.prototype.kConnect = function() {
  this.kadoh.connect(function() {
    this.emit('connected', this.kadoh.getAddress());
    this.kJoin();
  }, this);
};

Bot.prototype.kJoin = function() {
  var self = this;
  this.once('spawner::bootstraps', function(bootstraps) {
    console.log(self.name + ' joining');
    self.kadoh.join(bootstraps, function(error) {
      self.emit('joined', self.kadoh._routingTable.howManyPeers());      
    });
  });
  this.emit('bootstraps');
};