var DOC_DIR     = __dirname + '/doc/jsdoc/';
var JsDoc3_CONF = __dirname + '/doc/JsDocConf.json';
var JsDoc3_EXEC = __dirname + '/doc/jsdoc3/jsdoc';

var BUILD_CONF_FILE = __dirname + '/build.json';

var FS = require('fs');
var PATH = require('path');
var PROC = require('child_process');
var CICADA = require('jsCicada');
var COLORS = require('colors');

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

// ------------ BUILD ------------
desc('Building and minifing the embedded code');
task('build', ['default'], function() {
  var builder = new CICADA.builder(BUILD_CONF_FILE);
  builder.build(['normal', 'node', 'bootstrap', 'min']);
});

namespace('build', function() {
  var builder = new CICADA.builder(BUILD_CONF_FILE);
  desc('Building the code');
  task('normal', ['default'], function() {
    builder.build('normal');
  });

  desc('Minifying the embedded code');
  task('min', ['default'], function() {
    builder.build('min');
  });

  desc('Building code for test');
  task('test', [], function(){
    builder.build('test');
  });

  desc('Building the code for node');
  task('node', ['default'], function() {
    builder.build('node');
  });

  desc('Building the code for a node bootstrap');
  task('bootstrap', ['default'], function() {
    builder.build('bootstrap');
  });
});