/**
 * Pool which *instanciates* a given number of nodes and 
 * spawn a new pool when full
 */
var DEFAULT_SIZE = 20;
var LAMBDA       = 1;

var spawn = require('child_process').spawn;
var Bot   = require(__dirname + '/bot').Bot;

var Pool = module.exports = function(size, bootstraps, options) {
  this._options    = options;
  this._sizeLeft   = size || DEFAULT_SIZE;
  this._nodes      = [];
  this._launched   = false;
  this._bootstraps = bootstraps;
};

Pool.prototype.start = function() {
  if (!this._launched) {

    console.log('');
    console.log('-- New pool (~' + this._sizeLeft + ' bots left)');
    console.log('');

    var n = Math.min(DEFAULT_SIZE, this._sizeLeft) - 1,
        s = 0;
    for (; n >= 0; n--) {
      s += Math.floor((-Math.log(Math.random()) / LAMBDA * 1000));
      var config = this._options;
      config.reactor.transport.port += 1;
      config.reactor.transport.resource = Math.random().toString();
      this._nodes.push(new Bot({
        node  : config,
        delay : s,
        name  : 'bot-' + this._sizeLeft,
        bootstraps : this._bootstraps
      }));
      this._sizeLeft--;
    }

    this._nodes.map(function(bot) {
      bot.start();
    });

    if (this._sizeLeft > 0) {
      setTimeout(function(self) {
        self._duplicate();
      }, (DEFAULT_SIZE / LAMBDA * 1000) * 1.1, this);
    }
    this._launched = true;
  }
};

Pool.prototype._duplicate = function() {
  var opts = this._options;
  var args = [__dirname + '/bin/pool', '--size=' + this._sizeLeft, '--bootstraps=' + this._bootstraps.join(',')];
  if (opts.reactor.type === 'UDP') {
    args.push('--udp',
              '--port=' + (opts.reactor.transport.port + DEFAULT_SIZE));
  } else {
    args.push('--jid='  + opts.reactor.transport.jid,
              '--password=' + opts.reactor.transport.password);
  }
  spawn('node', args).stdout.on('data', function(data) {
    process.stdout.write(String(data));
  });
};
