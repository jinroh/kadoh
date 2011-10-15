// Dependencies
var app = require('http').createServer(handler)
  , sio = require('socket.io').listen(app)
  , fs  = require('fs')
  , io = require('socket.io')
  , router = require('../lib/router').listen(app);


app.listen(8080, function() {
  var addr = app.address();
  console.log('listening on http://' + addr.address + ':' + addr.port);
});

var sio = io.listen(app);
router.on('newclient', function() {
  this.broadcast('clients-up');
});

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}