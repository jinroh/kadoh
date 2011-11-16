var Bot = require(__dirname + '/bot.js');

var ReplyBot = module.exports = Bot.extend().methods({
  initialize: function(name, server) {
    this.supr('reply', name, server);
  },

  run : function() {
    var self = this;

    this.socket.listen(function(message) {
      var src = message.src;
      var msg = message.msg;
      self.socket.send(src, 'RE:'+msg);
    });
  }
});
