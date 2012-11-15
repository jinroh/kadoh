var connect = require('connect'),
    http    = require('http'),
    path    = require('path'),
    KadOH   = require('../build-middleware.js');

var static_dir = path.join(__dirname, 'static');
var app = connect.createServer()
                 .use('/', connect.static(static_dir))
                 .use(KadOH({
                              transport : 'simudp'
                            }))

var server = exports.server = http.createServer(app);

proxy = require('../../lib/server/udpproxy').listen(server);

if(require.main === module) {
  server.listen(8080);
  console.log('http://localhost:8080');
}
