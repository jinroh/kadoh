var build = require('./build.js'),
    url   = require('url');

module.exports = function(options) {
  options = options || {};
  return function(req, res, next) {
    u = url.parse(req.url, {parseQueryString : true});

    if (u.pathname === (options.mount || '/KadOH.js')) {
      options.debug =     (typeof u.query.debug !== 'undefined') ? (u.query.debug === 'true') : options.debug;
      options.transport =  u.query.transport || options.transport;
      options.storage   =  u.query.storage   || options.storage;  
      options.iterativefind   =  Number(u.query.iterativefind) || options.iterativefind;  

      var b = build(options);

      res.statusCode = 200;
      res.setHeader('content-type', 'text/javascript');
      res.end(b.bundle());
    }
    else next();
  };
};