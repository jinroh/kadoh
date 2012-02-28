/**
  *
  *
  */
exports.listen = function(server, options) {
  var router = new Router(server, options);

  return router.io;
};

/**
  * @class Router
  * The router class
  */
var Router = exports.Router = (function () {
  
  /*!****************************************$
  *       Dependencies and Constants        $
  */
  
  /** @requires */
  var http = require('http')
    , sio = require('socket.io')
    , url = require('url')
    , path = require('path')
    , fs = require('fs');
  
  /** @constant */  
  var  _Events = [
        'newclient'
      , 'leaveclient'
      , 'listupdate'
    ]
    , _Handledfiles = [
        '/SimUDP.client.js'
      , '/SimUDP.client.min.js'
    ];
    
  
  /*!****************************************$
  *         Routing Messages                $
  */
  
  /** Send the `message` passed as parameter
    * @memberOf Router
    * @param {Message} message object
    * @example 
    * message = {
    *             dst : "ip:port"
    *           , src : "ip:port"
    *           , msg : "content"
    *            };
    * Router.send(message);`
    */
    
  var send = function(message) {
    this._routeMessage(message);
  };
  
  var broadcast = function(message) {
    this._sockets.emit('packet', message);
  };
  
  var _routeMessage = function(message) {
    if (!message.dst) {
      console.error("No dst in message");
      return;
    }
    else {
      try {
        var socket = this.getClientSocket(message.dst);
        socket.emit('packet', message);
      }
      catch(e) {
        // DROP THE PACKET
      }
    }
  };

  /*!****************************************$
  *         Managing clients                $
  */

  var getClients = function() {
    return this._clients;
  };
  
  var getClientSocket = function(ip_port) {
    if (typeof this._clients[ip_port] != 'undefined') {
      id = this._clients[ip_port];
      return this._getClientSocketbyId(id);
    }
    else {
      console.error("Client " + ip_port + " is not in list.");
      return false;
    }
  };
  
  var _getClientSocketbyId = function(id) {
    return this._sockets.socket(id);
  };
    
  var _registerClient = function(client) {
    var ip_port = _extractip_port(client);
    
    this._addClient(ip_port, client.id);
    
    var self = this;
    
    client.on('whoami', function() {
      client.emit('whoami',ip_port);
    });
    
    client.on('disconnect', function() {
      self._removeClient(ip_port);
    });
    
    client.on('packet', function(message){
      message.src = ip_port;
      self._routeMessage(message);
    });
  };
  
  var _addClient = function(ip_port, id) {
    if (!this._clients[ip_port]) {
      this._clients[ip_port] = id;

      this.log(ip_port + ' connected');
      
      this._callCallbacks("newclient", ip_port);
      this._callCallbacks("listupdate", ip_port);
    }
  };
  
  var _removeClient = function(ip_port) {
    delete this._clients[ip_port] ;
    this.log(ip_port + ' disconnected');
    
    this._callCallbacks("leaveclient", ip_port);
    this._callCallbacks("listupdate", ip_port);
  };
  
  var _extractip_port = function(client) {
    return client.handshake.address.address + ':' + client.handshake.address.port;
  };
  
  /*!****************************************$
  *         Serving client-side code        $
  */
  
  var _redirectRequests = function(server) {
    old_listeners =  server.listeners('request');
    server.removeAllListeners('request');
    
    var self = this;
    server.on('request', function(req, res) {
      if (_isRequestHandled(req)){
        _serveRequest(req, res);
      } else {
        for (var i = 0, l = old_listeners.length; i < l; i++) {
          old_listeners[i].call(server, req, res);
        }
      }
    });
  };
  
  var _isRequestHandled = function(req) {
    var pathname = path.normalize(url.parse(req.url).pathname);
    return (_Handledfiles.indexOf(pathname) != -1) ? true : false;
  };
  
  var _serveRequest = function(req, res) {
    var pathname = path.normalize(url.parse(req.url).pathname);
    
    fs.readFile(__dirname + '/../dist' +  pathname, 
    function(err, data) {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading ' + path);
      }

      this.log(pathname + ' served');
      res.writeHead(200);
      return res.end(data);
    });
  };
  
  /*!****************************************$
  *          Callbacks handling             $
  */
  
  var on = function(eventname, fn) {
    //check if eventname is accepted
    if (_Events.indexOf(eventname) != -1) {
      this._callbacks[eventname].push(fn);
    } else {
      console.error('the event ' + eventname + ' does NOT exist');
    }
  };
  
  var _initCallbacks = function() {
    var cb = {};
     for(var i in _Events) {
       cb[_Events[i]] = [];
     }
     return cb;
  };
  
  var _callCallbacks =  function(eventname, passed_arg) {
    //check if event exists
    if (typeof this._callbacks[eventname] === 'undefined') {
      console.error('the event ' + eventname + ' does NOT exist');
    } else {
      //extract callbacks associated to the event
      var eventcallbacks = this._callbacks[eventname];
      
      if (eventcallbacks.length !== 0) {
        //execute each callbacks by passing the argument
        for(var i in eventcallbacks) {
          eventcallbacks[i](passed_arg);
        }
      }
    }
  };
 
  var log = function(string) {
    console.log('[Router] ' + string); 
  }
  
  /*!****************************************$
  *         Constructor and prototype       $
  */
  
  var Router = function (server, options) {
    //if server is undefined or a number create one
    if (typeof server === 'undefined') {
      server = 8080;
    }

    if (typeof server === 'number') {
      var port = server;
      server = http.createServer();
      server.listen(port);
    }
    this._server = server;
    
    //then delegates requests concerning our client-side source files
//    var _old_listeners = {};
//    _redirectRequests(this._server);
      
    //start socket.io for our server
    this.io = sio.listen(this._server);
    this.io.set('log level', 1);
    
    //restricting to 'SimUDP' namespace
    this._io = this.io.of('/SimUDP');
    
    this._sockets = this._io;
      
    //start callbacks system
    this._callbacks = _initCallbacks();
      
    //start client management
    this._clients = {};
    var self = this;
    this._io.on('connection', function(client){
      self._registerClient(client);
    });
  };
  
  Router.prototype = {
    //Revealing public API
      version           :   "0.2"
    , constructor       :   Router
    , on                :   on
    , getClients        :   getClients
    , getClientSocket   :   getClientSocket
    , broadcast         :   broadcast
    , send              :   send
    , log               :   log
//    , listen            :   iolisten
    
    //Revealing private API
    , _routeMessage     :   _routeMessage
    
    , _getClientSocketbyId : _getClientSocketbyId
    , _registerClient   :   _registerClient
    , _addClient        :   _addClient
    , _removeClient     :   _removeClient
    
    , _callCallbacks    :   _callCallbacks
  };
  
  return Router;
  
}());