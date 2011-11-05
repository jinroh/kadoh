var SimUDP = require(__dirname+'/../../lib/client/transport/simudp.js').transport.SimUDP;

var socket = new SimUDP('http://0.0.0.0:8080');

socket.listen(function(message){
  var src = message.src;
  var msg = message.msg;
  
  socket.send(src, 'Reply : '+msg);
  
  });

//}, 30000);

wait = require(__dirname+'/wait/wait.js').wait;
wait();
