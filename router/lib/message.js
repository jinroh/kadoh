exports = module.exports = Message;

Message = function(args) {
  if (typeof args === 'string') {
    this.msg = args;
  }
  else {
    for (var key in args) {
      this[key] = arg[key];
    }
  }
}
var scktregex = /[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\:[0-9]+/
Message.prototype.__defineSetter__('src', function(src, port) {
  if (typeof port != 'undefined') {
    src = src + ':' + port;
  }
  
  if (typeof src === 'string') {
    
    this.src = src;
    return;
  }
  
  console.error('unable to set ' + src + ' as the souce socket address');
});

Message.prototype.__defineSetter__('dst', function(dst) {
  
});