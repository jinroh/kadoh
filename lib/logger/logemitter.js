var EventEmitter = require('../util/eventemitter');

var LogEmitter = module.exports = EventEmitter.extend({

/**
 * Emit a debug level log event.
 *
 * @param  {String} ns   - namespace associated to this log = where does it come from ?
 * @param  {Array}  args - array of arguments to log
 * @param  {String} [event] - in case of the log comes from an event (@see #subscribeTo), specify the name of the event.
 */
  debug : function(ns, args, event) {
    this.emit('debug', {
      ns    : ns,
      args  : args,
      event : event
    });
    return this;
  },

/**
 * @see #debug
 */
  info : function(ns, args, event) {
    this.emit('info', {
      ns    : ns,
      args  : args,
      event : event
    });
    return this;
  },

/**
 * @see #debug
 */
  warn : function(ns, args, event) {
    this.emit('warn', {
      ns    : ns,
      args  : args,
      event : event
    });
    return this;
  },

/**
 * @see #debug
 */
  error : function(ns, args, event) {
    this.emit('error', {
      ns    : ns,
      args  : args,
      event : event
    });
    return this;
  },

/**
 * @see #debug
 */
  fatal : function(ns, args, event) {
    this.emit('fatal', {
      ns    : ns,
      args  : args,
      event : event
    });
    return this;
  },

 /**
  * Subscribe to an EventEmitter object. All events emitted by this object will be re-emited as log-event.
  *
  * @param  {Object} eventemitter   - the EventEmitter object to subscibe to.
  * @param  {[type]} [ns=null]      - namespace associate to these log events.
  * @param  {[type]} [level=debug]  - log level
  */
  subscribeTo : function(eventemitter, ns, level) {
      ns    = ns    || null ;
      level = level || 'debug';

      if (eventemitter instanceof EventEmitter ||
          typeof eventemitter.subscribe == 'function') {
        eventemitter.subscribe(function() {
          var args = Array.prototype.slice.call(arguments);
          var event = args.shift();
          this[level].call(this, ns, args, event);
        }, this);
      }
      return this;
    },

  /**
   * Returns an already namespaced logger shim.
   *
   * The returned object got all the log methods from the
   * logemiter (info, debug, warn, error, fatal) but already namespaced
   * according to the namespace passed as arguments.
   * The shimed methods, regular functions, can be called naturally.
   *
   * @example
   * var reactor_log = log_emitter.ns('Reactor');
   * reactor_log.debug('Does'nt work', 'why ?', 'don't know !');
   *
   * @param  {String} ns - the wanted namespace
   * @return {Object} objecy with info, debug, warn, error, fatal functions.
   */
  ns : function(ns) {
    ns = ns || null;
    var log = {};
    var emitter = this;

    ['info', 'debug', 'warn', 'error', 'fatal'].forEach(function(i) {
      log[i] = function() {
        var args = Array.prototype.slice.call(arguments);
        return emitter[i](ns, args);
      };
    });
    return log;
  }
});
