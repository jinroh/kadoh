
/*! SimUDP.client 
*/

window.SimUDP = (function(global) {
  
	//Dependencies
	var io  //=....socketio
	//private
	  , Constructor;

  //TODO : loading socket.io.client
  io = global.io;
  
  /**
    * Constructor - initilization
    * USE : 
    * con = new SimUDP("server.com:port");
    *
    */
  Constructor = function(host, details) {
    var socket = io.connect(host, details);
    socket.on('connect', function() {
      socket.emit('register');
    });
    
    this.socket = socket;
  }
	
	//Prototype - public API
	Constructor.prototype.constructor = window.SimUDP;
	
	/**
    * Send a message
    * USE : 
    * con.send({dst : "ip:port"
    *         , msg : "message"
    *          });
    *
    */
	Constructor.prototype.send = function(message) {
	  //TODO : check message
	  this.socket.emit('message', message);
	};
	
	/**
    * Listen for message and callback fn
    * USE : 
    * con.listen(fn(message));
    *
    */
	Constructor.prototype.listen = function(fn) {
	  //TODO
	  var f = fn;
	  this.socket.on('message', function(msg) {
	    f(msg);
	  });
	};
		
		return Constructor;
}(this));

