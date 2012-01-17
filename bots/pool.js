/**
 * Pool which *instanciates* a given number of nodes and 
 * spawn a new pool when full
 */
var DEFAULT_SIZE = 50;
var LAMBDA       = 2;

var util  = require('util');
var Hook  = require('hook.io').Hook;
var spawn = require('child_process').spawn;
var Bot   = require(__dirname + '/bot').Bot;

var Pool = module.exports = function(size, options) {
  Hook.call(this, {
    name   : 'pool',
    silent : true
  });
  this._options  = options;
  this._sizeLeft = size || DEFAULT_SIZE;
  this._nodes    = [];
  this._launched = false;

  var self = this;
  this.on('hook::ready', function() {
    self.launch();
  });
};
util.inherits(Pool, Hook);

Pool.prototype.launch = function() {
  if (!this._launched) {
    var n = Math.min(DEFAULT_SIZE, this._sizeLeft) - 1,
        s = 0;
    for (; n >= 0; n--) {
      s += Math.floor((-Math.log(Math.random()) / LAMBDA * 1000));
      var config = this._options;
      config.reactor.transport.port += 1;
      config.reactor.transport.resource = s.toString();
      this._nodes.push(new Bot({
        node  : config,
        hook  : {
          name : 'bot',
          silent : true
        },
        delay : s
      }));
      this._sizeLeft--;
    }

    this._nodes.map(function(bot) {
      bot.start();
    });

    if (this._sizeLeft > 0) {
      setTimeout(function(self) {
        self._duplicate();
      }, (DEFAULT_SIZE / LAMBDA * 1000) * (1 + 3/10), this);
    } else {
      this.emit('pool::dht-launched');
    }
    this._launched = true;
  }
};

Pool.prototype._duplicate = function() {
  var opts = this._options;
  var args = [__filename, '--size=' + this._sizeLeft];
  if (opts.reactor.type === 'UDP') {
    args.push('--udp',
              '--port=' + (opts.reactor.transport.port + DEFAULT_SIZE));
  } else {
    args.push('--jid='  + opts.reactor.transport.jid,
              '--resource=' + opts.reactor.transport.resource,
              '--password=' + opts.reactor.transport.password);
  }
  spawn('node', args);
};
