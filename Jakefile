var DIST_DIR  = __dirname + '/dist/';
var SPEC_DIST = __dirname + '/spec/dist/';

var DOC_DIR     = __dirname + '/doc/jsdoc/';
var JsDoc3_CONF = __dirname + '/doc/JsDocConf.json';
var JsDoc3_EXEC = __dirname + '/doc/jsdoc3/jsdoc';

var LIB_DIR = {
  'kadoh'            : __dirname + '/lib/client',
  'socket.io-client' : __dirname + '/node_modules/socket.io-client/dist',
  'jquery'           : __dirname + '/lib/ext/jquery'
};

var NODE_BUILD_EXCLUDE = [
  '[socket.io-client]/*',
  '[jQuery]/*'
  ];

var ENTRY_FILES = [
  'node'
];

var FS = require('fs');
var PATH = require('path');
var PROC = require('child_process');

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
    Build(DIST_DIR + 'KadOH.node.js', false, {exclude : NODE_BUILD_EXCLUDE});

    var bot_server = require('./bots/bot-server.js');
    var SimUDP = require('./lib/server/router.js').listen(bot_server);
    bot_server.listen(3000);

    var bot = require('./bots/reply-bot.js').Bot;
    reply_bot = new bot('reply_bot');
    reply_bot.run('http://localhost:3000').register('reply','http://localhost:3000');

    setTimeout(function() {
      var jasmine = PROC.spawn('jasmine-node', ['spec']);

      jasmine.stdout.on('data', function (data) {
        process.stdout.write(String(data));
      });

      jasmine.stderr.on('data', function (data) {
        process.stderr.write(data);
      });

      jasmine.on('exit', function (code) {
        console.warn('Jasmine-node exited with code ' + code);
      });

    }, 1000);
  }, true);

  desc('Testing in the browser');
  task('browser', ['default'], function() {
    Build(SPEC_DIST + 'KadOH.js', false);

    var bot_app = require('./bots/bot-server.js');
    var SimUDP = require('./lib/server/router.js');

    //bot_app.listen(8124);
    var jasmine = require('jasmine-runner');

    jasmine.run({
      command : 'mon' ,
      cwd     : __dirname ,
      args    : [],
      server  : bot_app,
      provided_io : SimUDP
    });

    //Start bot :
    setTimeout(function() {
      var bot = require('./bots/reply-bot.js').Bot;
      reply_bot = new bot('reply_bot');
      reply_bot.run('http://localhost:8124').register('reply','http://localhost:8124');
    }, 200);
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

    var reply_bot = require('./bots/reply-bot.js').Bot;
    var bots = [];

    for(var i = 0; i<number; i++) {
      try{
        var bot = new reply_bot('replyBot'+i);
        bot.run(server).register('reply', server);
      } catch(e) {
        cosnole.log('Bot '+i+' starting failed.');
      }
    }
  });

});

//****************DOC**************
desc('Generate documentation using JsDoc3');
task('doc', ['default'], function(){
  console.log('Generating documentation..');

  var cmd = JsDoc3_EXEC+' --recurse '+LIB_DIR.kadoh+' --destination '+DOC_DIR +' -c '+JsDoc3_CONF;
  console.log(cmd);

  PROC.exec(cmd, function (error, stdout, stderr) {
    console.log('[Generating Doc] ' + stdout);
    console.error('[Generating Doc] Error :' + stderr);
    if (error !== null) {
      console.error('[Generating Doc] Error : ' + error);
    }
  });
});

//**************BUILD****************
desc('Building and minifing the embedded code');
task('build', ['default'], function() {
  Build(DIST_DIR + 'KadOH.js', false);
  Build(DIST_DIR + 'KadOH.min.js', true);
  Build(DIST_DIR + 'KadOH.node.js', false, {exclude : NODE_BUILD_EXCLUDE});
});

namespace('build', function() {

  desc('Building the code');
  task('normal', ['default'], function() {
    Build(DIST_DIR + 'KadOH.js', false);
  });

  desc('Minifying the embedded code');
  task('min', ['default'], function() {
    Build(DIST_DIR + 'KadOH.min.js', true);
  });

  desc('Building code for test');
  task('test', [], function(){
    Build(SPEC_DIST + 'KadOH.js', false);
  });

  desc('Building the code for node');
  task('node', ['default'], function() {
    Build(DIST_DIR + 'KadOH.node.js', false, {exclude : NODE_BUILD_EXCLUDE});
  });

});

//*************UTIL*********************
var Build = function(where, mini, options) {
  mini = mini || false;
  console.log('[Build] START' + (mini ? ' with mignify' : '') + (options && options.exclude ? ' excluding '+options.exclude : ''));

  var dep = new Dependencies(options);
  ENTRY_FILES.forEach(function(file) {
    dep.addFile(PATH.join(LIB_DIR.kadoh,file));
  });

  FS.writeFileSync(where, buildCode(dep.Stack, mini), 'utf-8');
  console.log('[Build] OK : building ' + PATH.basename(where) + ' complete');
};

var buildCode = function(files, mini) {
  mini = mini || false;
  var code = [];
  var results = {success : [], fail : []};

  for(var i in files) {
    path = files[i];
    try {
      var content = FS.readFileSync(path, 'utf-8');
      if(mini) {
        var ugly = require('uglify-js');

        var ast = ugly.parser.parse(content);
        ast = ugly.uglify.ast_mangle(ast);
        ast = ugly.uglify.ast_squeeze(ast);
        content = ugly.uglify.gen_code(ast);
      }
      code.push(content);
      results.success.push( PATH.basename(path));
    }
    catch(err) {
      results.fail.push( PATH.basename(path));
    }
  }

  console.log('[Build] OK : '+results.success.join(', '));
  if(results.fail.length)
    console.log('[Build] read FAIL : '+results.fail.join(', '));

  return code.join('\n');
};

var Dependencies = function(options) {
  if(options && options.exclude) {
    options.exclude = (Array.isArray(options.exclude))? options.exclude : [options.exclude];
    this.exclude = options.exclude.map(function(exclusion) {
      var results = Dependencies.prototype.matchDepLine('// Dep : '+ exclusion);
      return {lib : results.lib, path: results.path};
    });
  } else {
    this.exclude = [];
  }

  this.Stack = [];
};

Dependencies.prototype.isExcluded = function(matchDepLineResult) {
  if(this.exclude.length === 0)
    return false;

  var result = this.exclude.some(function(exclusion) {


    if(exclusion.lib !== matchDepLineResult.lib)
      return false;

    if(exclusion.path === null)
      return true;

    if(exclusion.path === matchDepLineResult.path)
      return true;

    return false;
  });

  return result;
};

Dependencies.prototype.matchDepLine = function(line) {
  var results = {match : false};
  var extracted;

  extracted = /\s*\/\/\s*Dep\s*:\s*\[(.*)\](\S*)\s*.*/gi.exec(line);
  if(extracted) {
    results.match = true;
    results.lib   = extracted[1] .toLowerCase();
    results.path  = (extracted[2] === '' || extracted[2] === '/*')? null : extracted[2];

    return results;
  }
  extracted = /\s*\/\/\s*Dep\s*:\s*(\S*)\s*.*/gi.exec(line);
  if(extracted) {
    results.match = true;
    results.lib   = null;
    results.path  = extracted[1];

    return results;
  }

  return results;

};

Dependencies.prototype.extractDep= function(code, filepath) {

  var originpath = PATH.dirname(filepath);
  var dep = [];

  var self = this;
  code.split('\n').forEach(function(line) {
    var results = self.matchDepLine(line);

    if (results.match && !self.isExcluded(results)) {
      var path     = (PATH.extname(results.path) === "") ? results.path + ".js" : results.path;
      var rootpath = (results.lib !== null) ? LIB_DIR[results.lib] : originpath;

      dep.push(PATH.join(rootpath,path));
    }
  });
  return dep;
};



Dependencies.prototype.addFile = function(filepath) {
  filepath = (PATH.extname(filepath) === "") ? filepath + ".js" : filepath;
  var code;
  try {
    code = FS.readFileSync(filepath, 'utf-8');
  } catch(e) {
    console.log('[Build] read FAIL : ' + PATH.basename(filepath) + ' not found.');
    return;
  }

  var dep = this.extractDep(code, filepath);

  if(this.Stack.indexOf(filepath) == -1)
    this.Stack.unshift(filepath);

  for (var i in dep) {
    var index = this.Stack.indexOf(dep[i]);
    if (index == -1) {
      this.addFile(dep[i]);
    }
    else {
      this.Stack.splice(index,1);
      this.addFile(dep[i]);
    }
  }
};
