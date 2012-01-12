var Hook  = require('hook.io').Hook;
var KadOH = require(__dirname + '/../dist/KadOH.node.js');
var util  = require('util');

//
// Bot
//

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
      self.emit('initialized');
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
  this.kadoh.join(['foo@bar.org'], function() {
    this.emit('joined');
  }, this);
};

//
// CLI
// 

if (process.argv.length > 2) {
  var argv  = require('optimist')
              .usage('Usage: $0 --protocol xmlrpc --transport UDP -j foo@bar -r kadoh -p azerty -d 1000')
              .alias('j', 'jid')
              .alias('r', 'resource')
              .alias('p', 'password')
              .alias('d', 'delay')
              .argv;

  var debug     = !!argv.debug,
      delay     = argv.d,
      protocol  = argv.protocol  || 'node_xmlrpc',
      type      = argv.transport || 'NodeXMPP',
      transport = {
        jid      : argv.j,
        resource : argv.r,
        password : argv.p
      };

  var config = {
    hook : {
      name: 'bot'
    },
    node : {
      reactor : {
        protocol  : protocol,
        type      : type,
        transport : transport
      }
    },
    delay : delay
  };

  var bot = new Bot(config);
  bot.start();

  if (debug) {
    bot.on('hook::ready', function() {
      KadOH.log.setLevel('debug');
      KadOH.log.subscribeTo(bot.kadoh);
      KadOH.log.subscribeTo(bot.kadoh._reactor);
      KadOH.log.subscribeTo(bot.kadoh._reactor._transport);
    });
  }
}

// hook.on('*::')
// node.connect();
// node.join(['67.215.242.139:6881', '67.215.242.138:6881']);