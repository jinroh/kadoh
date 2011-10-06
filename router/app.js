// Dependencies
var app = require('http').createServer(handler)
  , sio = require('socket.io').listen(app)
  , fs  = require('fs')
  , clients = {}

app.listen(8080, function() {
  var addr = app.address();
  console.log('listening on http://' + addr.address + ':' + addr.port);
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

sio.sockets.on('connection', function(socket) {
  var remote_addr = socket.handshake.address;
  // var id          = remote_addr.address + ':' + remote_addr.port;

  var id = 'foo';
  console.log(socket.remoteAddress);
  socket.set('id', id, function() {
    console.log(id);
    socket.emit('registered');
  });
  
  socket.on('message', function(socket) {
    console.log(socket.get('id'));
  });
  
  socket.on('disconnect', function() {
    
  })
});