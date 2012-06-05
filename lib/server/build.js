var browserify = require('browserify');

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
  var flags = [];

  flags.push(options.transport);
  flags.push(options.storage);

  build.use(require('tagify').flags(flags));

  build.addEntry(options.entry);
  
  return build;
};