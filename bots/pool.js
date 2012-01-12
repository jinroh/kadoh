var Hook         = require('hook.io').Hook;
var Zombie       = require('zombie');
var spawnProcess = require('child_process').spawn;

var bots = [];
var pool = new Hook({
  name: "pool"
});

pool.on('hook::ready', function() {

  pool.on('*::poisson-spawn', function(args) {
    console.log('Start spawning ' + nodes + ' nodes in poisson law with lambda=' + lambda);
    poissonSpawn.apply(null, args);
  });

  pool.on('*::spawn', function(args) {
    console.log('Start spawning a node');
    spawn.apply(null, args);
  });

});

pool.start();

function spawn(jid, resource, password, delay) {
  delay = delay || 0;
  var proc = spawnProcess('node', [__dirname + '/bot.js', jid, resource, password, delay]);
  bots.push({
    jid      : jid,
    resource : resource,
    password : password,
    delay    : delay,
    proc     : proc
  });
}

/**
 * To spawn nodes, we follow a poisson law so that
 * the spawning interval is equally distributed
 * @see http://en.wikipedia.org/wiki/Exponential_distribution
 *
 * @param  {Number} nodes  how many node to spawn
 * @param  {Number} lambda how many spawn per seconds
 * @return {Number[]} The times of spawning
 */
function poissonSpawn(jid, resource, password, nodes, lambda) {
  // The mean time of execution is nodes / lambda
  nodes  = nodes  || 100;
  lambda = lambda || 0.1;
  var times = [],
      n = 0,
      s = 0;
  for (; n < nodes; n++) {
    s += Math.floor((-Math.log(Math.random()) / lambda * 1000));
    spawn(jid, resource + '-' + n, password, s);
  }
}

process.on('exit', function() {
  for (var i = 0; i < bots.length; i++) {
    bots[i].proc.kill('SIGTERM');
  }
});