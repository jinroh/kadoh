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

