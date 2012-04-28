var klass  = require('klass'),
    colors = require('colors');

var LOG_LEVEL = {
  debug : 0,
  info  : 1,
  warn  : 2,
  error : 3,
  fatal : 4
};

var make_title = function(ns, event) {
  var emit = (typeof event !== 'undefined') ? ' emits '+event.italic : '';
  return '['+ns.bold.underline+emit+']';
};

var ColorConsole = module.exports = klass({
  initialize: function(logemiter, level) {
    logemiter.onAny(function(level, log) {
      if(LOG_LEVEL[level] >= this.level && typeof this[level] !== 'undefined') {
        this[level](log);
      }
    }, this);
    this.setLevel(level || 'error');

  },

  setLevel : function(level) {
    //numeric level
    this.level = (typeof level === 'number') ? level : LOG_LEVEL[level];
  },

  debug : function(log) {
    var title = make_title(log.ns.toString(), log.event).grey;
    log.args.unshift(title);
    console.log.apply(console, log.args);
  },

  info : function(log) {
    var title = make_title(log.ns.toString(), log.event).green;
    log.args.unshift(title);
    console.log.apply(console, log.args);
  },

  warn : function(log) {
    var title = make_title(log.ns, log.event).yellow;
    log.args.unshift(title);
    console.log.apply(console, log.args);

  },

  error : function(log) {
    var title = make_title(log.ns.toString(), log.event).red;
    log.args.unshift(title);
    console.log.apply(console, log.args);
  },

  fatal : function(log) {
    var title = make_title(log.ns.toString(), log.event).red.inverse;
    log.args.unshift(title);
    console.log.apply(console, log.args);
  }
});