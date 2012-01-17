/**
 * Spawning Pool
 * Starts node in a *new process*
 */
var Hook   = require('hook.io').Hook;
var spawn  = require('child_process').spawn;

var BOT = __dirname + '/bot.js';

var bots = [];
var pool = new Hook({
  name: 'spawning-pool'
});

pool.on('hook::ready', function() {

  pool.on('*::poisson-spawn', function(args) {
    poissonSpawn.apply(null, args);
  });

  pool.on('*::spawn', function(args) {
    if (args && args.length > 2) {
      spawnXMPPBot.apply(null, args);
    } else {
      spawnUDPBot.apply(null, args);
    }
  });

});

pool.start();

function spawnBot() {
  var args = [BOT];
      args.push.apply(args, arguments[0]);
  console.log(args);
  var bot  = spawn('node', args);
  bots.push(bot);
  return bot;
}

function spawnXMPPBot(jid, resource, password, delay) {
  delay = parseInt(delay, 10) || 0;
  var args = ['--jid=' + jid, '--resource=' + resource, '--password=' + password, '--delay=' + delay];
  return spawnBot(args);
}

function spawnUDPBot(port, delay) {
  delay = parseInt(delay, 10) || 0;
  var args = ['--udp', '--port=' + port, '--delay=' + delay];
  return spawnBot(args);
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
function poissonSpawn(nodes, lambda, jid, resource, password) {
  console.log('Start spawning ' + nodes + ' nodes in poisson law with lambda=' + lambda);
  // The mean time of execution is nodes / lambda
  var udp = !jid;
  nodes   = nodes  || 100;
  lambda  = lambda || 0.1;
  var times = [],
      n = 0,
      s = 0;
  var proc = udp ? spawnUDPBot : spawnXMPPBot;
  for (; n < nodes; n++) {
    s += Math.floor((-Math.log(Math.random()) / lambda * 1000));
    proc(udp, s, jid, resource + n, password);
  }
}

process.on('exit', function() {
  for (var i = 0; i < bots.length; i++) {
    bots[i].kill('SIGTERM');
  }
});