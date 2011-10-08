# Server-side
- run the server on specified port

```js
rt = require('router').listen(8080)
```
- have access to all logged clients

```js
rt.getClients(); // {ip:port,id} list
```
- register a callback to the clients list update

```js
rt.on('newclient', fn(clientid));
rt.on('leaveclient', fn(clientid));
rt.on('listupdate', fn(clientid));
//...
```
- get a client socket

```js
rt.getClientSocket(id or ip:port);
```
- broadcast to all clients

```js
rt.broadcast(message);
```
- a way to send to a client

```js
rt.send("ip:port", message);
```

# Client-side
- open a connection

```js
con = new SimUDP("server.com:port");
```
- send a message 

```js
con.send(message);
```
- receive messages

```js
con.listen(fn(message));
```

# Protocol spec.
```js
message = { dst : "ip:port",
				src : "ip:port",  //added by the server
				msg : 	....
			 };
```
