var zombie = require('zombie')
  , assert = require('assert')
  , vows = require('vows')
  ;

//Start the server :::
var app = require('http').createServer(handler)
  , router = require('../lib/router').listen(app);


app.listen(8080, function() {
  var addr = app.address();
  console.log('listening on http://' + addr.address + ':' + addr.port);
});

function handler (req, res) {
    var data =  "<html>"
              + "<script src='/SimUDP.client.js'></script>"
              + "<body><h1>Hi Zombie</h1></body>"
              + "</html>";
                
    res.writeHead(200);
    res.end(data);
};

//Start the browser :::
browser = new zombie.Browser()
browser.visit("http://localhost:8080", { debug: true },
  function(err, browser, status) {
    if (err)
      throw(err.message);
    console.log("The page:", browser.html());
  }
);
