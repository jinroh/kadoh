var Logger = require('./Logger');

var logger = new Logger();

var methods = ['info', 'debug', 'warn', 'error', 'fatal'];

module.exports = function(group) {
  group = group || 'main';
  var log = {};
  methods.forEach(function(i) {
    log[i] = function() {
      var args = Array.prototype.slice.call(arguments);
      return logger[i](group, args);
    };
  });
  return log;
};