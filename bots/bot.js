//
// Bot
//
var KadOH = require(__dirname + '/../dist/KadOH.node.js');
KadOH.log.setLevel('error');

var Bot = exports.Bot = function(options) {
  options = this._options = options || {
    node : {},
    delay : undefined,
    name : 'bot',
    bootstraps : []
  };
  options.node.reactor = options.node.reactor || {};
  options.node.reactor.transport = options.node.reactor.transport || {};
  options.node.reactor.transport.reconnect = true;
  this.kadoh = new KadOH.Node(null, options.node);
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
  });
};

Bot.prototype.join = function() {
  var self = this;
  console.log(self._options.name + ' joining');      
  this.kadoh.join(this._options.bootstraps, function(error) {
    console.log(self._options.name + ' joined', self.kadoh._routingTable.howManyPeers());      
  });
};