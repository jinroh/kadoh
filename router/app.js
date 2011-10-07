// Dependencies
var app = require('http').createServer(handler)
  , sio = require('socket.io').listen(app)
  , fs  = require('fs')

app.listen(5858, function() {
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

var clients = {};
sio.sockets.on('connection', function(socket) {
  var addr = socket.handshake.address.address + ':' + socket.handshake.address.port;
	socket.registered = false;
  
  socket.on('register', function() {
    socket.registered = true;
    if(!clients[addr]) {
      clients[addr] = socket.id;
      socket.emit('clients-up', clients);
      socket.broadcast.emit('clients-up', clients);
    }
  });
  
  socket.on('message', function(msg) {
    msg.src = addr;
    
    if(!clients[msg.dst]) {
      console.error(msg.dst + " does not exist");
    }
    console.log(clients[msg.dst], msg);
    sio.sockets.socket(clients[msg.dst]).emit('message', msg);
  });
  
  socket.on('disconnect', function() {
    delete clients[addr];
    socket.broadcast.emit('clients-up', clients);
  });
});