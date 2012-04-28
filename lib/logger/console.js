var EventEmitter = require('../util/eventemitter');

var _add_brackets = function(str) {
  return '['+str+']';
};

var Logger = module.exports = EventEmitter.extend({
  warn : function(group, args) {
    args.unshift(_add_brackets(group));
    console.warn.apply(console, args);
  },
  info : function(group, args) {
    args.unshift(_add_brackets(group));
    console.info.apply(console, args);
  },
  debug : function(group, args) {
    args.unshift(_add_brackets(group));
    console.log.apply(console, args);
  },
  error : function(group, args) {
    args.unshift(_add_brackets(group));
    console.error.apply(console, args);
  },
  fatal : function(group, args) {
    args.unshift(_add_brackets(group));
    console.error.apply(console, args);
  }
});