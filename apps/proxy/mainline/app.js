var connect = require('connect'),
    path    = require('path');


var server = exports.server = connect.createServer()
             .use('/'      , connect.static(__dirname))
             .use('/dist'  , connect.static(path.join(__dirname, '../../..', 'dist')))
             .use('/jquery', connect.static(path.join(__dirname, '../../..', 'lib/ext/jquery')))
            // .use('/benchmark', connect.static(path.join(__dirname, '../../..', 'benchmarking')))
             .use('/UI'    , connect.static(path.join(__dirname, '../../..', 'UI')));

proxy = require('../../../lib/server/mainlineproxy').listen(server);

if(require.main === module) {
  server.listen(8080);
  console.log('http://localhost:8080');
}
