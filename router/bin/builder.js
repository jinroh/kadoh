
var fs = require('fs')
  , builder = require('socket.io-client').builder;
  
var path = __dirname + '/../lib/SimUDP.client.js'
  
//read the content of SimUDP.client.js
var code = [];

fs.readFile(path, function(err, content) {
  code.push(content);
  if(err) console.log(err);
});

builder({minify : false, custom : code}, function(err,content) { 
  if (err) return console.error(err);

  fs.write(
      fs.openSync(__dirname + '/../dist/SimUDP.client.js', 'w')
    , content
    , 0
    , 'utf8'
  );
  console.log('Successfully generated the development build: SimUDP.client.js');
});  


builder({minify : true, custom : code}, function(err,content) { 
  if (err) return console.error(err);

  fs.write(
      fs.openSync(__dirname + '/../dist/SimUDP.client.min.js', 'w')
    , content
    , 0
    , 'utf8'
  );
  console.log('Successfully generated the production build: SimUDP.client.min.js');
});