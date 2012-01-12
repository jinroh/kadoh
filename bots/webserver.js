var Webserver = require('hook.io-webserver').Webserver;

var webserver = new Webserver({
  name: 'hook.io-webserver',
  webroot: './'
});

webserver.start();