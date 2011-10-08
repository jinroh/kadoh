var http = require('http')
  , sio = require('socket.io')
  , url = require('url')
  , path = require('path')
  , fs = require('fs');

exports.version = '0.1';

exports = module.exports = Router;

Router.handled_files = [
  '/SimUDP.client.js'
, '/SimUDP.client.min.js'
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
  }
  
  this.clients = {};
  
  this.server = server;
  this.io = sio.listen(server);
  this.sockets = this.io.sockets;
  
  this.old_listeners = server.listeners('request');
  server.removeAllListeners('request')
  
  var self = this;
  
  server.on('request', function (req, res) {
    self.requestHandler(req, res);
  });
  
  this.routing();
  console.log('The router is running and listening on port ' + server.address().address + ':' + server.address().port);
};


/**
 * Checks whether a request is about a static files
 */
Router.prototype.requestHandler = function(req, res) {
  var self = this;
  
  var pathname = path.normalize(url.parse(req.url).pathname);
  
  if (Router.handled_files.indexOf(pathname) != -1) {
    fs.readFile(__dirname + '/../dist' +  pathname, 
    function(err, data) {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading ' + path);
      }

      console.log(pathname + ' served');
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
  this.sockets.on('connection', function(client) {
    client.address.socket = client.handshake.address.address + ':' + client.handshake.address.port;
    
    if(!self.clients[addr]) {
      self.clients[addr] = client.id;
    }

    client.on('message', function(message) {
      message.src = client.address.socket;
      self.send(message);
    });

    client.on('disconnect', function() {
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
  
  this.getClientSocket(this.clients[message.dst]).emit('message', message);
};