var app = require('http').createServer(handler)
  , fs  = require('fs')
  , router = require('../lib/router').listen(app);


app.listen(8080, function() {
  var addr = app.address();
  console.log('listening on http://' + addr.address + ':' + addr.port);
});

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading fucking index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

router.on("listupdate", function(){
  var list = router.getClients();
  router._sockets.emit("clients-up", list);
});
