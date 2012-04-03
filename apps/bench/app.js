var path    = require('path'),
    express = require('express'),
    nconf   = require('nconf'),
    Sequelize = require('sequelize'),
    hamljs   = require('hamljs');

// nconf.argv()
//      .env()
//      .file({ file: __dirname + '/../config.json' });

app = express.createServer();


app
  //serve statics
   .use(express.static(path.join(__dirname, '/../..')))
   .use(express.static(path.join(__dirname, '/public')))

  //views rendering
   .register('.haml', hamljs)
   .set('view engine', 'haml')
   .set('view options', {layout: false})
   .set('views', __dirname + '/app/views')

  //set database
   .set('db', new Sequelize('database', 'root', null, {
      dialect: 'sqlite',
      storage: __dirname + '/db/test.db',
      sync: { force: true },
      define : {underscored: true} //column created_at instead of createdAt
    }))

  //app variables
   .set('dht', {size : 1000});

   require(__dirname+'/app/controller.js');

  
app.listen(8080);
