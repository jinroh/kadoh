var connect = require('connect'),
    http    = require('http'),
    path    = require('path'),
    KadOH   = require('../build-middleware.js');

var app = connect.createServer()
                 .use('/'      , connect.static(__dirname))
                 .use(KadOH({
                              transport : 'simudp',
                              storage   : 'basic'
                            }))
                 .use('/UI'    , connect.static(path.join(__dirname, '../..', 'UI')));

var server = exports.server = http.createServer(app);

proxy = require('../../lib/server/mainlineproxy').listen(server);

if(require.main === module) {
  server.listen(8080);
  console.log('http://localhost:8080');
}
