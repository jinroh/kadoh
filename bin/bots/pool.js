/**
 * Pool which *instanciates* a given number of nodes and 
 * spawn a new pool when full
 */
var spawn = require('child_process').spawn;
var Bot   = require(__dirname + '/bot').Bot;

var Pool = module.exports = function(config) {
  this._id         = config.id;
  this._options    = config.bot;
  this._jid        = config.bot.reactor.transport.jid;
  this._port       = config.bot.reactor.transport.port;
  this._bootstraps = config.bot.bootstraps;
  this._lambda     = config.lambda;
  this._size       = config.size;
  this._activity   = config.activity || false;
  this._values     = config.values   || 10;
  this._reporter   = config.reporter || false;

  this._nodes      = [];
  this._launched   = false;
};

Pool.prototype._botConfig = function(number, delay) {
  var config = getCloneOfObject(this._options);
  config.reactor.transport.port = this._port + this._id * this._size + number;
  config.reactor.transport.resource = Math.random().toString().substr(2,4);
  config.bootstraps = [this._bootstraps[Math.floor(Math.random()*this._bootstraps.length)]];
  var regex = /\%d/;
  if (this._jid && regex.test(this._jid)) {
    config.reactor.transport.jid = this._jid.replace(regex, number);
  }
  return {
    node     : config,
    name     : 'bot-' + this._id + '-' + number,
    delay    : delay,
    activity : this._activity,
    values   : this._values,
    reporter : this._reporter
  };
};

Pool.prototype.start = function() {
  if (!this._launched) {
    console.log('new pool ' + this._id);
    var s = 0;
    for (n = 0; n < this._size; n++) {
      s += Math.floor((-Math.log(Math.random()) / this._lambda * 1000));
      this._nodes.push(new Bot(this._botConfig(n, s)));
    }
    this._nodes.map(function(bot) {
      bot.start();
    });
    this._launched = true;
  }
};

function getCloneOfObject(oldObject) {
  var tempClone = {};

  if (typeof(oldObject) == "object")
    for (var prop in oldObject) {
      if ((typeof(oldObject[prop]) == "object") &&
                      Array.isArray(oldObject[prop]))
        tempClone[prop] = oldObject[prop].slice();
      else if (typeof(oldObject[prop]) == "object")
        tempClone[prop] = getCloneOfObject(oldObject[prop]);
      else
        tempClone[prop] = oldObject[prop];
    }

  return tempClone;
}
