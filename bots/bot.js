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
  var self = this;
  self.on('hook::ready', function() {
    try {
      self.emit('initialized', options);
      if (options.delay) {
        setTimeout(function() {
          self.k_connect();
          self.k_join();
        }, options.delay);
      }
    } catch(e) {
      self.emit('error::initialize', e);
    }
  });
};
util.inherits(Bot, Hook);

Bot.prototype.k_connect = function() {
  this.kadoh.connect(function() {
    this.emit('connected');
  }, this);
};

Bot.prototype.k_join = function() {
  this.once('bootstraps', function(bootstraps) {
  });
  this.emit('bootstraps');
};