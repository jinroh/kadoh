/**
 * Pool which *instanciates* a given number of nodes and 
 * spawn a new pool when full
 */
var DEFAULT_SIZE = 50;
var LAMBDA       = 3;

var spawn = require('child_process').spawn;
var Bot   = require(__dirname + '/bot').Bot;

var Pool = module.exports = function(config) {
  this._options    = config.bot;
  this._sizeLeft   = config.size       || DEFAULT_SIZE;
  this._bootstraps = config.bootstraps || [];
  this._activity   = config.activity   || false;
  this._values     = config.values     || 10

  this._nodes      = [];
  this._launched   = false;
};

Pool.prototype._botConfig = function(name, delay) {
  var config = this._options;
  config.reactor.transport.port += 1;
  config.reactor.transport.resource = name;
  return {
    node  : config,
    name  : name,
    delay : delay,
    bootstraps : this._bootstraps,
    activity   : this._activity,
    values     : this._values
  }
}

Pool.prototype.start = function() {
  if (!this._launched) {
    console.log('');
    console.log('-- New pool (~' + this._sizeLeft + ' bots left)');
    console.log('');

    var n = Math.min(DEFAULT_SIZE, this._sizeLeft) - 1,
        s = 0;
    for (; n >= 0; n--) {
      s += Math.floor((-Math.log(Math.random()) / LAMBDA * 1000));
      this._nodes.push(new Bot(this._botConfig('bot-' + this._sizeLeft, s)));
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
  var args = [
    __dirname + '/bin/pool',
    '--size='       + this._sizeLeft,
    '--bootstraps=' + this._bootstraps.join(','),
    '--activity='   + this._activity,
    '--values='     + this._values
  ];

  if (opts.reactor.type === 'UDP') {
    args.push('--udp',
              '--port=' + (opts.reactor.transport.port + DEFAULT_SIZE));
  } else {
    args.push('--jid='  + opts.reactor.transport.jid,
              '--password=' + opts.reactor.transport.password);
  }

  var dup = spawn('node', args)
  dup.stdout.on('data', function(data) {
    process.stdout.write(String(data));
  });
  dup.stderr.on('data', function(data) {
    process.stderr.write(String(data));
  });
  dup.on('exit', function(error) {
    process.stderr.write(String(error));
  });
};
