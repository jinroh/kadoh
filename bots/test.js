var bot = require(__dirname+'/simple-bot.js').Bot;

var bi = new bot('hi');

bi.run();

bi.register('test');