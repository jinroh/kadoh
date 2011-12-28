var DOC_DIR     = __dirname + '/doc/jsdoc/';
var JsDoc3_CONF = __dirname + '/doc/JsDocConf.json';
var JsDoc3_EXEC = __dirname + '/doc/jsdoc3/jsdoc';

var BUILD_CONF_FILE = __dirname + '/build.json';

var FS = require('fs');
var PATH = require('path');
var PROC = require('child_process');
var CICADA = require('jsCicada');

//**************DEFAULT********************
desc('Say Hello to Kadoh');
task('default', [], function() {
  var exec  = require('child_process').exec;

  exec('cowsay -f moofasa Hello KadOH', function(error, stdout, stderr) {
    if(stderr)
      console.log('Hello KadOH');
    else
      console.log(stdout);
    complete();
  });

}, true);

///*********************TEST***********************

namespace('test', function() {
  desc('Testing in node');
  task('node', ['default'], function() {
    jake.Task['build:node'].execute();

    var jasmine = PROC.spawn('jasmine-node', ['spec']);

    jasmine.stdout.on('data', function (data) {
      process.stdout.write(String(data));
    });

    jasmine.stderr.on('data', function (data) {
      process.stderr.write(data);
    });

    jasmine.on('exit', function (code) {
      process.exit(code);
    });
  }, true);

  desc('Testing in the browser');
  task('browser', ['default'], function() {
    jake.Task['build:test'].execute();

    var jasmine = require('jasmine-runner');
    jasmine.run({
      command : 'mon' ,
      cwd     : __dirname ,
      args    : []
    });
  });
});

//****************BOTS**************
namespace('bot', function(){
  desc('Start bot server + SimUDP');
  task('server', ['default'], function() {
    var bot_server = require('./bots/bot-server.js');
    var SimUDP = require('./lib/server/router.js').listen(bot_server);
    bot_server.listen(3000);
  });

  desc('Start reply-bots');
  task('reply', ['default'], function(number, server) {
    number = number || 1;
    server = server || 'http://localhost:3000';

    console.log('Sarting '+number+' reply-bot, registration on '+server);

    var reply_bot = require('./bots/reply-bot.js');
    var bots = [];

    for(var i = 0; i<number; i++) {
      try {
        var bot = new reply_bot('replyBot'+i, server);
        bot.run();
      } catch(e) {
        console.error('Bot '+i+' starting failed.');
      }
    }
  });

});

//****************DOC**************
desc('Generate documentation using JsDoc3');
task('doc', ['default'], function(){
  console.log('[Doc] Purging the doc folder');
  var rm = 'rm -rf '+DOC_DIR;
  console.log(rm);
  PROC.exec(rm, function (error, stdout, stderr) {
    console.log('[Doc] ' + stdout);
    console.error('[Doc] Error :' + stderr);
    if (error !== null) {
      console.error('[Doc] Error : ' + error);
    }
  });

  console.log('[Doc] Generating documentation..');

  var cmd = JsDoc3_EXEC+' --recurse '+LIB_DIR.kadoh+' --destination '+DOC_DIR +' -c '+JsDoc3_CONF;
  console.log(cmd);

  PROC.exec(cmd, function (error, stdout, stderr) {
    console.log('[Doc] ' + stdout);
    console.error('[Doc] Error :' + stderr);
    if (error !== null) {
      console.error('[Doc] Error : ' + error);
    }
  });
});

//**************BUILD****************
desc('Building and minifing the embedded code');
task('build', ['default'], function() {
  b = new CICADA.builder(BUILD_CONF_FILE);
  b.build(['normal', 'mini', 'node']);
});

namespace('build', function() {

  desc('Building the code');
  task('normal', ['default'], function() {
    b = new CICADA.builder(BUILD_CONF_FILE);
    b.build('normal');
  });

  desc('Minifying the embedded code');
  task('min', ['default'], function() {
    b = new CICADA.builder(BUILD_CONF_FILE);
    b.build('min');
  });

  desc('Building code for test');
  task('test', [], function(){
    b = new CICADA.builder(BUILD_CONF_FILE);
    b.build('test');
  });

  desc('Building the code for node');
  task('node', ['default'], function() {
    b = new CICADA.builder(BUILD_CONF_FILE);
    b.build('node');
  });

});