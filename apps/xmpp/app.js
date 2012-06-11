var connect = require('connect'),
    path    = require('path'),
    KadOH   = require('../build-middleware.js');

var server = exports.server = connect.createServer()
             .use('/'      , connect.static(__dirname))
             .use(KadOH({
                          transport : 'xmpp'
                        }))
             .use('/UI'    , connect.static(path.join(__dirname, '../..', 'UI')));


if(require.main === module) {
  server.listen(8080);
  console.log('http://localhost:8080');
}
