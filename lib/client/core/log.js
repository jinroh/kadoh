// Dep: [KadOH]/core/eventemitter
// Dep: [KadOH]/globals

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

    initialize: function(config) {
      this.supr();

      config = config || {};

      this.options = {
        level: this.LogLevel.info
      };
  
      this._loggers = {};

      for (var key in config) {
        this.options[key] = config[key];
      }
    },

    level: function(level) {
      return this.LogLevel.hasOwnProperty(level) ?
                            this.LogLevel[level] : 
                            level;
    },

    addLogger: function(name, logger) {
      if (KadOH.loggers.hasOwnProperty(name))
        logger = KadOH.loggers[name];

      var listener = function(type) {
        if (typeof this[type] === 'function') {
          this[type].apply(this, Array.prototype.slice.call(arguments, 1));
        }
      };
      this.subscribe(listener, logger);
      this._loggers[name] = listener;
      return this;
    },

    subscribeTo: function(eventemitter) {
      if (eventemitter instanceof EventEmitter) {
        eventemitter.subscribe(function(type) {
          var args = Array.prototype.slice.call(arguments);
          args.unshift('info');
          this.print.apply(this, args);
        }, this);
      }
    },

    removeLogger: function(name) {
      if (this._loggers.hasOwnProperty(name)) {
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

    print: function(level) {
      if (this.level(level) < this.options.level) return;
      return this.emit.apply(this, arguments);
    },

    debug: function(msg) {
      return this.print('debug', msg);
    },

    info: function (msg) {
      return this.print('info', msg);
    },

    warn: function (msg) {
      return this.print('warn', msg);
    },

    error: function (msg) {
      return this.print('error', msg);

    },

    fatal: function (msg) {
      return this.print('fatal', msg);
    }

  });

  KadOH.loggers = KadOH.loggers || {};

  var ConsoleLogger = function() {
    if (!(window.console && window.console.log)) {
      throw new Error('no console');
    }

    this.name    = 'ConsoleLogger';
    this.console = window.console;
  };

  ConsoleLogger.prototype = {
    debug: function() {
      this.console.debug.apply(this.console, arguments);
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
    }
  };

  var jQueryLogger = function(console) {
    if (!(window.jQuery)) {
      throw new Error('no jquery');
    }

    this.name    = 'jQueryLogger';
    this.console = console || "#console";
  };

  jQueryLogger.prototype = {
    append: function(type, args) {
      var html = 
        '<div class="log ' + type + '">' +
        '<span class="' + type + '">' + type.toUpperCase() + '</span>';
      
      args = Array.prototype.slice.call(args);
      for (var i = 0; i < args.length; i++) {
        html += '<pre>' + this.stringify(args[i]) + '</pre>';
      }
      
      html += '</div>';
      jQuery(this.console).append(html);
    },

    debug: function() {
      this.append('debug', arguments);
    },

    info: function() {
      this.append('info', arguments);
    },
    
    warn: function() {
      this.append('warn', arguments);
    },
    
    error: function() {
      this.append('error', arguments);
    },
    
    fatal: function() {
      this.append('fatal', arguments);
    },

    stringify: function(object) {
      if (typeof object !== 'string' && !(object instanceof String)) {
        try {
          var json = JSON.stringify(object, null, 2);
          return json;
        }
        catch(e) {}
      }
      return object.toString();
    }
  };

  KadOH.loggers.ConsoleLogger = new ConsoleLogger();
  KadOH.loggers.jQueryLogger  = new jQueryLogger();

  KadOH.log = new KadOH.Log();

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
