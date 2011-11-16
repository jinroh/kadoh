var Bot = require(__dirname + '/bot.js');

var ReactorBot = module.exports = Bot.extend().methods({
  initialize: function(name, server) {
    this.supr('reactor', name, server);
  },

  run : function() {
  }
});

var reactor = new ReactorBot('myname');
reactor.connect();
reactor.run();
