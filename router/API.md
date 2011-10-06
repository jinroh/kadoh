# Server-side
- run the server on specified port
	rt = new Router(8080)
- start/stop the router
	rt.start();
	rt.stop();
- have access to all logged clients
	rt.getClients(); // {ip:port,id} list
- register a callback to the clients list update
	rt.on('newclient', fn(clientid));
	rt.on('leaveclient', fn(clientid));
	rt.on('listupdate', fn(clientid));
	//...
- get a client socket
	rt.getClientSocket(id or ip:port);
- broadcast to all clients
	rt.broadcast(message);
- a way to send to a client
	rt.send("ip:port", message);

# Client-side
- open a connection
	con = new Connection("server.com:port");
- send a message 
	con.send(message);
- receive messages
	con.listen(fn(message));

# Protocol spec.
	message = { dst : "ip:port",
					src : "ip:port",  //added by the server
					msg : 	....
				 };
