var connect = require('connect'),
    http    = require('http'),
    path    = require('path');


var app = connect.createServer()
                 .use('/'      , connect.static(__dirname))
                 .use('/dist'  , connect.static(path.join(__dirname, '../../..', 'dist')))
                 .use('/jquery', connect.static(path.join(__dirname, '../../..', 'lib/ext/jquery')))
             //  .use('/benchmark', connect.static(path.join(__dirname, '../../..', 'benchmarking')))
                 .use('/UI'    , connect.static(path.join(__dirname, '../../..', 'UI')));

var server = exports.server = http.createServer(app);

proxy = require('../../../lib/server/udpproxy').listen(server);

server.listen(8080);
