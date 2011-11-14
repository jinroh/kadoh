var bot = require(__dirname+'/reply-bot.js').Bot;

var bi = new bot('hi');

bi.run();

bi.register('test');