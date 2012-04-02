var express = require('express'),
    uagent  = require('express-useragent'),
    _       = require('underscore');

var Result = app.settings.db.import(__dirname+'/models/result.js');

app.use(express.bodyParser())
   .use(uagent.express());

app.get('/', function(req, res) {
  res.render('index', { layout: false });
});

app.get('/monitor', function(req, res) {
  res.render('monitor', { layout: false });
});

app.post('/results', function(req, res) {
  var infos = {
    user_agent : [req.useragent.Browser, req.useragent.OS].join(','),
    mobile     : req.useragent.isMobile,
    dht_size   : app.settings.dht.size,
    created_at : Date.now()
  };

  _.each(req.body, function(r) {
    Result.create(_.extend(r, infos));
  });
  res.send();
});

app.get('/results', function(req, res) {
  res.send('This is a bad 404...', 404);
});