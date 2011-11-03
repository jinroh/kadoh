// var app = require('http').createServer(handler)
//   , fs  = require('fs')
//   , router = require('../lib/router').listen(app);
// 
// 
// app.listen(8080, function() {
//   var addr = app.address();
//   console.log('listening on http://' + addr.address + ':' + addr.port);
// });
// 
// function handler (req, res) {
//   fs.readFile(__dirname + '/index.html',
//   function (err, data) {
//     if (err) {
//       res.writeHead(500);
//       return res.end('Error loading index.html');
//     }
// 
//     res.writeHead(200);
//     res.end(data);
//   });
// }
// 
// router.on("listupdate", function(){
//   var list = router.getClients();
//   router._sockets.emit("clients-up", list);
// });

var app = require('http').createServer(handler)
   , fs  = require('fs')
   , router = require('../../lib/server/SimUDP/router').listen(app)
   , path = require('path');

app.listen(8080, function() {
  var addr = app.address();
  console.log('listening on http://' + addr.address + ':' + addr.port);
});

function handler (request, response) {
  console.log('request starting...');
  
  var filePath = '.' + request.url;

  if (filePath == './')
     filePath = './index.htm';

  var extname = path.extname(filePath);
  var contentType = 'text/html';

  switch (extname) {
     case '.js':
         contentType = 'text/javascript';
         break;
     case '.css':
         contentType = 'text/css';
         break;
  }
  
  console.log(filePath);
  
  path.exists(filePath, function(exists) {
   if (exists) {
      console.log(filePath);
       fs.readFile(filePath, function(error, content) {
           if (error) {
               response.writeHead(500);
               response.end();
           }
           else {
               response.writeHead(200, { 'Content-Type': 'text/html' });
               response.end(content, 'utf-8');
           }
       });
   }
   else {
       response.writeHead(404);
       response.end();
   }
 });
}

router.on("listupdate", function() {
  var list = router.getClients();
  router._sockets.emit("clients-up", list);
});

