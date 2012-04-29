var DOC_DIR     = __dirname + '/doc/jsdoc/';
var LIB_DIR     = __dirname + '/lib/';
var DIST_DIR    = __dirname + '/dist/';
var JsDoc3_CONF = __dirname + '/doc/JsDocConf.json';
var JsDoc3_EXEC = __dirname + '/doc/jsdoc3/jsdoc';

var BUILD_CONF_FILE = __dirname + '/build.json';

var UI_FILES = {
  mainline : {
    conf  : __dirname + '/apps/proxy/mainline/UIconf.json',
    index : __dirname + '/apps/proxy/mainline/index.html',
    app   : __dirname + '/apps/proxy/mainline/app.js'
  },
  udp : {
    conf  : __dirname + '/apps/proxy/udp/UIconf.json',
    index : __dirname + '/apps/proxy/udp/index.html',
    app   : __dirname + '/apps/proxy/udp/app.js'
  },
  xmpp : {
    conf  : __dirname + '/apps/xmpp/UIconf.json',
    index : __dirname + '/apps/xmpp/index.html',
    app   : __dirname + '/apps/xmpp/app.js'
  }
};

var FS     = require('fs');
var PATH   = require('path');
var PROC   = require('child_process');
var COLORS = require('colors');
var UI     = require(__dirname + '/UI/generator');

// ------------ DEFAULT ------------
desc('Say Hello to Kadoh');
task('default', [], function() {
  var logo =
    '                                                        \n' +
    '      _/    _/                  _/    _/_/    _/    _/  \n' +
    '     _/  _/      _/_/_/    _/_/_/  _/    _/  _/    _/   \n' +
    '    _/_/      _/    _/  _/    _/  _/    _/  _/_/_/_/    \n' +
    '   _/  _/    _/    _/  _/    _/  _/    _/  _/    _/     \n' +
    '  _/    _/    _/_/_/    _/_/_/    _/_/    _/    _/      \n' +
    '                                                        ';
  console.log(logo.yellow);
});

// ------------ TESTS ------------
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

// ------------ DOC ------------
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

  var cmd = JsDoc3_EXEC+' --recurse '+LIB_DIR +' --destination '+DOC_DIR +' -c '+JsDoc3_CONF;
  console.log(cmd);

  PROC.exec(cmd, function (error, stdout, stderr) {
    console.log('[Doc] ' + stdout);
    console.error('[Doc] Error :' + stderr);
    if (error !== null) {
      console.error('[Doc] Error : ' + error);
    }
  });
});

// ------------ BUILD ------------
desc('Building and minifing the embedded code');
task('build', ['default'], function() {
  jake.Task['build:xmpp'].execute();
  jake.Task['build:simudp'].execute();
});

namespace('build', function() {

  desc('Building the brower-side code with xmpp configuration');
  task('xmpp', ['default'], function() {
    console.log('Building the brower-side code with xmpp configuration');

    var build = require('./lib/server/build.js')({
      debug : false,
      transport : 'xmpp'
    });

    fs.writeFileSync(
      DIST_DIR+'KadOH.xmpp.js',
      build.bundle()
    );
    console.log("OK");
  });

  desc('Building the brower-side code with simudp configuration');
  task('simudp', ['default'], function() {
    console.log('Building the brower-side code with simudp configuration');

    var build = require('./lib/server/build.js')({
      debug : false,
      transport : 'simudp'
    });

    fs.writeFileSync(
      DIST_DIR+'KadOH.simudp.js',
      build.bundle()
    );
    console.log("OK");
  });
});

// ------------ UI GENERATE ------------

namespace('generate', function() {
  
  desc('Generate the mainline proxy app UI');
  task('mainline', ['default'], function() {
    fs.writeFileSync(
      UI_FILES.mainline.index,
      UI.generate(UI_FILES.mainline.conf)
    );
    console.log('UI index generated successfully !');
  });

  desc('Generate the udp proxy app UI');
  task('udp', ['default'], function() {
    fs.writeFileSync(
      UI_FILES.udp.index,
      UI.generate(UI_FILES.udp.conf)
    );
    console.log('UI index generated successfully !');
  });

  desc('Generate the xmpp app UI');
  task('xmpp', ['default'], function() {
    fs.writeFileSync(
      UI_FILES.xmpp.index,
      UI.generate(UI_FILES.xmpp.conf)
    );
    console.log('UI index generated successfully !');
  });
});

// ------------ RUN SERVER ------------

namespace('run', function() {
  
  desc('Run the mainline proxy app server');
  task('mainline', ['generate:mainline'], function(port) {
    port = parseInt(port, 10) || 8080 ;
    require(UI_FILES.mainline.app).server.listen(port);
    console.log('http://localhost:'+port);
  });

  desc('Run the udp proxy app server');
  task('udp', ['generate:udp'], function(port) {
    port = parseInt(port, 10) || 8080 ;
    require(UI_FILES.udp.app).server.listen(port);
    console.log('http://localhost:'+port);
  });

  desc('Run the xmpp app server');
  task('xmpp', ['generate:xmpp'], function(port) {
    port = parseInt(port, 10) || 8080 ;
    require(UI_FILES.xmpp.app).server.listen(port);
    console.log('http://localhost:'+port);
  });
});