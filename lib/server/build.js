browserify = require('browserify'),
ignorify   = require('ignorify');

var lib = require('path').resolve(__dirname,'..');

/**
 * Options are :
 *  - {String}  entry         (lib/index-browserify.js) : entry point for the build
 *  - {Boolean} debug         (false)    : debug mode
 *  - {String}  transport     (xmpp)     : transport to use
 *  - {String}  storage       (lawnchair): storage strategy
 *  - {Integer} iterativefind (1)        : iterativefind algorithm
 */

module.exports = function(options) {
  options.entry         = options.entry         || lib+'/index-browserify.js';
  options.debug         = options.debug         || false;
  options.transport     = options.transport     || 'xmpp';
  options.storage       = options.storage       || 'lawnchair';

  var build = browserify({debug : options.debug});
  build.use(require('ignorify'));

  var transport_file = (options.transport === 'simudp') ? 'simudp.js' : 'strophe.js';
  var storage_file = options.storage+'.js';

  //be carefull : successive calls to ignore cause flushing ignore list
  build.ignore(['./transport','./storage']);
  
  build.alias('/network/transport/index.js','/network/transport/'+transport_file);
  build.alias('/data/storage/index.js'     ,'/data/storage/'+storage_file);

  build.require('./transport/'+transport_file    ,{basedir : lib+'/network', root : lib});
  build.require('./storage/'+storage_file        ,{basedir : lib+'/data',    root : lib});

  build.addEntry(options.entry);
  
  return build;
};