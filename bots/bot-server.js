var express = require('express');

var app = module.exports = express.createServer();
app.use(express.bodyParser());
app.use(express.logger('[BotServer] :method :url >> :status'));

var BOTS = {};

/**
 * Register the given bot and return the registration object with, among others, the id.
 * @param  {String} botType Type of bot given during registration
 * @param  {String} ip_port Ip:Port of the registered bot
 * @return {Object} bot.id attributed id
 * @return {Object} bot.type
 * @return {Object} bot.ip_port
 * 
 * @throws {Error} If registration fails.
 */
var registerBot = function(type, ip_port) {
  BOTS[type] = BOTS[type] || [];
  var bot = {
    type : type,
    ip_port : ip_port,
    id : BOTS[type].length
  };
  BOTS[type].push(bot);
  console.log('[BotServer] Register bot '+bot.type+'('+bot.id+') on '+bot.ip_port);
  return bot; 
};

/**
 * Retrieve bots by botetype. If id is given, retrieve this specific bot.
 * @param  {String} type 
 * @param  {Integer} id    
 * @return {Bot | [Bot]} An array of bot, or the requested bot
 * 
 * @throws {Error} If bot(s) not found (error.name = 'NOT_FOUND')
 */
var getBot = function(type, id) {
  if(! BOTS[type]) 
    throw {name : 'NOT_FOUND', description : 'type '+type+' doesn\'t exist'};
  if(!id)
    return BOTS[type];
  else {
    if(!BOTS[type][id]) {
      throw {name : 'NOT_FOUND', description : 'bot '+type+'('+id+') doesn\'t exist'};
    }
    else
      return BOTS[type][id];
  }
};

/**
 * REST Routes :
 * 
 * GET  : /bot/[bottype]/[id] >> associated ip:port of the bot
 * GET  : /bot/[bottype]    >> list of ip-port of the bots corresponding
 * POST : /bot {type, ip_port}  >> register the given bot
 * ****DELETE : /bot/[bottype]/[id]   >> Delete the bot*****   
 */

app.get('/bot/:type', function(req, res) {
  var type = req.params.type;
  try {
    var bot = getBot(type);
    res.json(bot);
    return;
  } catch(e) {
    if(e.name === 'NOT_FOUND')
      res.send(404);
    else
      res.send(500);
  }
});

app.get('/bot/:type/:id', function(req, res) {
  var type  = req.params.type;
  var id    = req.params.id;
  if(!type) {
    res.send(400); 
    return;
  } 
  try {
    var bot = getBot(type, id);
    res.json(bot); 
    return;
  } catch(e) {
    if(e.name === 'NOT_FOUND') {
      res.send(404); 
      return;
    }
    else {
      res.send(500); 
      return;
    }
  }
});

app.post('/bot', function(req, res) {
  var type  = req.body.type;
  var ip_port = req.body.ip_port;
  if(! type || ! ip_port) {
    res.send(400); 
    return;
  }
  try {
    var bot = registerBot(type, ip_port);
    res.json(bot); 
  } catch(e) {
    console.log('[BotServer] ', e);
    res.send(500);
  }
});

if(!module.parent) {
  app.listen(3000);
  console.log('[BotServer] running on http://localhost:3000');
}