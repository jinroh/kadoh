var Zombie  = require('zombie');
var address = 'http://localhost:8000/bot.html';

var node = new Zombie();
node.visit(address, function() {
  node.pressButton('Join', function() {
    console.log('joining');
  });
});