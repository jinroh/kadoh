//
// Bot
//
var Node = require(__dirname + '/../../lib/node');
var SHA1 = require(__dirname + '/../../lib/util/crypto').digest.SHA1;
var Reporter = require(__dirname + '/../../statistics/cube/reporter');
var logging = require(__dirname + '/../../lib/logging');
var ConsoleLogger = require(__dirname + '/../../lib/logger/reporter/color-console')

new ConsoleLogger(logging, 'error');

var Bot = exports.Bot = function(options) {
  options = this._options = options || {
    node       : {},
    delay      : undefined,
    name       : 'bot',
    activity   : false,
    values     : 10,
    reporter   : false
  };
  options.node.reactor = options.node.reactor || {};
  options.node.reactor.transport = options.node.reactor.transport || {};
  options.node.reactor.transport.reconnect = true;
  this.kadoh = new Node(null, options.node);
  if (options.reporter)
    this.reporter = new Reporter(this.kadoh);
};

Bot.prototype.start = function() {
  setTimeout(function(self) {
    console.log(self._options.name + ' connecting');
    self.connect();
  }, this._options.delay || 1, this);
};

Bot.prototype.connect = function() {
  var self = this;
  this.kadoh.connect(function() {
    self.join();
    if (self.reporter)
      self.reporter.start();
  });
};

Bot.prototype.join = function() {
  var self = this;
  console.log(self._options.name + ' joining');
  this.kadoh.join(function(error) {
    console.log(self._options.name + ' joined', self.kadoh._routingTable.howManyPeers());
    if (self._options.activity) {
      self.randomActivity();
    }
  });
};

Bot.prototype.randomActivity = function() {
  var timeout = Math.floor((-Math.log(Math.random()) / this._options.activity * 60000));
  var self = this;
  setTimeout(function() {
    var random = Math.floor(Math.random() * 2);
    var value  = String(Math.floor(Math.random() * self._options.values));
    switch(random) {
      case 0:
        self.kadoh.get(SHA1(value), function(){});
        break;
      case 1:
        self.kadoh.put(null, value);
        break;
    }
    self.randomActivity();
  }, timeout);
};