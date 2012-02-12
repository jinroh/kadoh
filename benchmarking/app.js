var connect = require('connect'),
    path    = require('path');

var server = connect.createServer()
             .use('/'      , connect.static(__dirname))
             .use('/dist'  , connect.static(path.join(__dirname, '../', 'dist')))

console.log('http://localhost:8080');
server.listen(8080);
