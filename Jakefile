var DOC_DIR     = __dirname + '/doc/jsdoc/';
var LIB_DIR     = __dirname + '/lib/';
var DIST_DIR    = __dirname + '/dist/';
var JsDoc3_CONF = __dirname + '/doc/JsDocConf.json';
var JsDoc3_EXEC = __dirname + '/doc/jsdoc3/jsdoc';

var UI_FILES = {
  mainline : {
    conf  : __dirname + '/apps/mainline/conf.json',
    index : __dirname + '/apps/mainline/index.html',
    app   : __dirname + '/apps/mainline/app.js'
  },
  udp : {
    conf  : __dirname + '/apps/udp/conf.json',
    index : __dirname + '/apps/udp/index.html',
    app   : __dirname + '/apps/udp/app.js'
  },
  xmpp : {
    conf  : __dirname + '/apps/xmpp/conf.json',
    index : __dirname + '/apps/xmpp/index.html',
    app   : __dirname + '/apps/xmpp/app.js'
  },
  boilerplate : {
    app   : __dirname + '/apps/boilerplate/app.js'
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
  task('node', ['default'], function(reporter) {
    reporter = reporter || 'dot'
    var mocha = PROC.spawn('mocha', ['--colors', '--reporter', reporter]);
    mocha.stdout.pipe(process.stdout, { end: false });
    mocha.stderr.pipe(process.stderr, { end: false });
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

var checked = ' done ✓'.green + '\n';

desc('Building and minifing the embedded code');
task('build', ['default'], function() {
  jake.Task['build:xmpp'].execute();
  jake.Task['build:simudp'].execute();
});

namespace('build', function() {

  function build(type, debug) {
    return function() {
      var browserify = require('browserify');
      var tagify = require('tagify');

      process.stdout.write('Building '+type);

      var build = browserify({debug : debug});
      build.use(tagify.flags([type, 'lawnchair']));
      build.addEntry(LIB_DIR+'index-browserify.js');

      fs.writeFileSync(
        DIST_DIR+'KadOH.'+type+'.js',
        build.bundle()
      );

      process.stdout.write(checked);
    };
  }

  desc('Building the brower-side code with xmpp configuration');
  task('xmpp', ['default'], build('xmpp', false));

  desc('Building the brower-side code with simudp configuration');
  task('simudp', ['default'], build('simudp', false));
});

// ------------ UI GENERATE ------------

namespace('generate', function() {
  
  function generate(type) {
    return function() {
      process.stdout.write('Creating '+type+' UI');
      fs.writeFileSync(
        UI_FILES[type].index,
        UI.generate(UI_FILES[type].conf)
      );
      process.stdout.write(checked);
    }
  }

  desc('Generate the mainline proxy app UI');
  task('mainline', ['default'], generate('mainline'));

  desc('Generate the udp proxy app UI');
  task('udp', ['default'], generate('udp'));

  desc('Generate the xmpp app UI');
  task('xmpp', ['default'], generate('xmpp'));
});

// ------------ RUN SERVER ------------

namespace('run', function() {
  
  function run(type) {
    return function(port) {
      port = parseInt(port, 10) || 8080 ;
      require(UI_FILES[type].app).server.listen(port);
      console.log('Server running on http://localhost:'+port);
    }
  }

  desc('Run the mainline proxy app server');
  task('mainline', ['generate:mainline'], run('mainline'));

  desc('Run the udp proxy app server');
  task('udp', ['generate:udp'], run('udp'));

  desc('Run the xmpp app server');
  task('xmpp', ['generate:xmpp'], run('xmpp'));

  desc('Run the boilerplate app server');
  task('boilerplate', run('boilerplate'));
});