var path = require('path');
var express = require('express');
var uagent  = require('express-useragent');
var _ = require('underscore');

var app = express.createServer();

app.use(express.static(path.join(__dirname, '../../..')))
   .use(express.static(path.join(__dirname, '../public')))
   .use(express.bodyParser())
   .register('.haml', require('hamljs'))
   .set('view engine', 'haml')
   .set('views', __dirname + '/views')
   .use(uagent.express())

app.get('/', function(req, res) {
  res.render('index', { layout: false });
});

app.get('/monitor', function(req, res) {
  res.render('monitor', { layout: false });
});

app.post('/results', function(req, res) {
  var infos = {
    user_agent : [req.useragent.Browser, req.useragent.OS].join(','),
    mobile : req.useragent.isMobile,
    dht_size
  }
  _.extend(req.body, infos);
  ////////////TBC
  console.log(req.body);
})

app.listen(8080);
