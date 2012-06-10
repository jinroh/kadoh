var browserify = require('browserify'),
    tagify = require('tagify'),
    url   = require('url');

var lib = require('path').resolve(__dirname,'../lib');

module.exports = function(options) {
  options = options || {};
  return function(req, res, next) {
    u = url.parse(req.url, {parseQueryString : true});

    if (u.pathname === (options.mount || '/KadOH.js')) {
      var build, flags = [];

      //debug
      u.query.debug     = (u.query.debug === 'true');
      options.debug     = u.query.debug ||
                          options.debug ||
                          false;
      build = browserify({debug : options.debug});


      //transport
      options.transport = u.query.transport ||
                          options.transport ||
                          'xmpp';
      flags.push(options.transport);

      //storage
      options.storage   = u.query.storage ||
                          options.storage ||
                          'lawnchair';
      flags.push(options.storage);

      build.use(tagify.flags(flags));
      
      //entry
      options.entry      = options.entry ||
                           lib+'/index-browserify.js';
      build.addEntry(options.entry);
      
      res.statusCode = 200;
      res.setHeader('content-type', 'text/javascript');
      res.end(build.bundle());
    }
    else next();
  };
};