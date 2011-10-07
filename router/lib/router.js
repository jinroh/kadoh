var http = require('http')
  , sio = require('socket.io')
  , fs = require('fs');

exports.version = '0.1';

exports = module.exports = Router;

Router.handled_files = [
  '/SimUDP.client.js'
];

exports.listen = function(server, options) {
  return new Router(server, options);
};

function Router(server, options) {
  if (typeof server === 'undefined') {
    server = 8080;
  }
  
  if (typeof server === 'number') {
    var port = server;
    server = http.createServer();
    server.listen(port);
    console.log('The router is running and listening on port ' + server.address().address + ':' + server.address().port);
  }
  
  this.clients = {};
  
  this.server = server;
  this.sio = sio.listen(server);
  this.sockets = sio.sockets;
  
  this.old_listeners = server.listeners('request');
  server.removeAllListeners('request')
  
  var self = this;
  
  server.on('request', function (req, res) {
    self.requestHandler(req, res);
  });
  
  this.routing();
};


/**
 * Checks whether a request is about a static files
 */
Router.prototype.requestHandler = function(req, res) {
  var self = this;
  
  if (Router.handled_files.indexOf(req.url) != -1) {
    fs.readFile(__dirname + req.url, function(err, data) {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading ' + req.url);
      }

      console.log(req.url + ' served');
      res.writeHead(200);
      return res.end(data);
    });
  }
  else {
    for (var i = 0, l = this.old_listeners.length; i < l; i++) {
      this.old_listeners[i].call(this.server, req, res);
    }
  }
};

Router.prototype.routing = function() {
  var self = this;
  this.sio.sockets.on('connection', function(socket) {
    var addr = socket.handshake.address.address + ':' + socket.handshake.address.port;
    
    if(!self.clients[addr]) {
      self.clients[addr] = socket.id;
    }

    socket.on('message', function(msg) {
      self.send(msg);
    });

    socket.on('disconnect', function() {
      delete self.clients[addr];
    });
  });
}

Router.prototype.getClients = function() {
  return this.clients;
};

Router.prototype.getClientSocket = function(id) {
  return this.sockets.socket(id);
};

Router.prototype.broadcast = function(message) {
  this.sockets.emit('message', message.msg);
};

Router.prototype.send = function(message) {
  if(!this.clients[message.dst]) {
    console.error(message.dst + " does not exist");
    return;
  }
  
  message.src = src;
  
  this.sockets.socket(this.clients[message.dst]).emit('message', msg.msg);
};