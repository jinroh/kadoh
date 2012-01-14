// Dep: [KadOH]/core/eventemitter

(function(exports) {

  var KadOH        = exports,
      globals      = KadOH.globals,
      EventEmitter = KadOH.core.EventEmitter;

  KadOH.Log = EventEmitter.extend({

    LogLevel : {
      debug : 0,
      info  : 1,
      warn  : 2,
      error : 3,
      fatal : 4
    },

    initialize: function(options) {
      this.supr();

      this.config = {
        level: 'info',
        groups : []
      };
      for (var key in options) {
        this.config[key] = options[key];
      }
  
      this._loggers = {};
      this._group   = 'main';
    },

    level: function(level) {
      return this.LogLevel.hasOwnProperty(level) ?
                            this.LogLevel[level] : 
                            level;
    },

    setLevel: function(level) {
      if (this.LogLevel.hasOwnProperty(level)) {
        this.config.level = level;
      }
    },

    addLogger: function(name, logger) {
      if (KadOH.loggers.hasOwnProperty(name))
        logger = KadOH.loggers[name];

      var listener = function(type) {
        if (typeof logger[type] === 'function') {
          logger[type].apply(logger, Array.prototype.slice.call(arguments, 1));
        }
      };
      this.subscribe(listener);
      this._loggers[name] = listener;
      return this;
    },

    subscribeTo: function(eventemitter, group) {
      if (eventemitter instanceof EventEmitter) {
        eventemitter.subscribe(function() {
          group = group || 'main';
          this.print.call(this, 'debug', group, arguments);
        }, this);
      }
      return this;
    },

    removeLogger: function(name) {
      if (this._loggers.hasOwnProperty(name)) {
        this.unsubscribe(this._loggers[name]);
        delete this._loggers[name];
      }
      return this;
    },

    removeAllLoggers: function() {
      for (var name in this._loggers) {
        this.unsubscribe(this._loggers[name]);
        delete this._loggers[name];
      }
      return this;
    },

    group: function(name) {
      return this.emit('group', name);
    },

    groupEnd: function(name) {
      return this.emit('groupEnd');
    },

    print: function(level, group, args) {
      if (this.level(level) < this.level(this.config.level)) return;

      if (!group || group === 'main') {
        var scope = args[0];
        if (typeof scope === 'string' &&
            this.config.groups.indexOf(scope) >= 0) {
          Array.prototype.splice.call(args, 0, 1);
          group = scope;
        }
      }
      group = group || 'main';

      if (this._group !== group) {
        this.groupEnd();
        if (group !== 'main') {
          this.group(group);
        }
        this._group = group;
      }

      Array.prototype.splice.call(args, 0, 0, level);
      return this.emit.apply(this, args);
    },

    debug: function() {
      return this.print('debug', 'main', arguments);
    },

    info: function () {
      return this.print('info', 'main', arguments);
    },

    warn: function () {
      return this.print('warn', 'main', arguments);
    },

    error: function () {
      return this.print('error', 'main', arguments);

    },

    fatal: function () {
      return this.print('fatal', 'main', arguments);
    }

  });

  var ConsoleLogger = function() {
    this.name    = 'ConsoleLogger';
    this.console = console;
  };

  ConsoleLogger.prototype = {
    debug: function() {
      if (typeof console.log.debug === 'function') {
        this.console.debug.apply(this.console, arguments);
      } else {
        this.console.log.apply(this.console, arguments);
      }
    },

    info: function() {
      this.console.log.apply(this.console, arguments);
    },
    
    warn: function() {
      this.console.warn.apply(this.console, arguments);
    },
    
    error: function() {
      this.console.error.apply(this.console, arguments);
    },
    
    fatal: function() {
      this.console.error.apply(this.console, arguments);
    },

    group: function(name) {
      if (typeof this.console.group === 'function') {
        this.console.group(name);
      }
    },

    groupEnd: function() {
      if (typeof this.console.groupEnd === 'function') {
        this.console.groupEnd();
      }
    }
  };

  KadOH.loggers = KadOH.loggers || {};
  KadOH.log = new KadOH.Log({
    groups : [
      'Node',
      'RoutingTable',
      'Transport',
      'Reactor',
      'ValueManagement'
    ]
  });

  if (typeof console !== 'undefined' && console.log) {
    KadOH.loggers.ConsoleLogger = new ConsoleLogger();
    KadOH.log.addLogger('ConsoleLogger');
  }

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
