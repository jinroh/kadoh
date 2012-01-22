// Dep: [KadOH]/core/class
(function(exports) {
  
  var KadOH = exports,
      Class = KadOH.core.Class;

  KadOH.core = KadOH.core || {};

  var Event = KadOH.core.Event = function(memory, once) {
    return {
      callbacks   : [],
      stack       : [],
      args        : null,
      firing      : false,
      firingIndex : 0,
      firingStart : 0,
      disabled    : false,

      //
      // Config flags
      // 
      memory      : memory || false,
      once        : once   || false
    };
  };

  KadOH.core.EventEmitter = Class(
      /** @lends EventEmitter# */
    {
    /**
     * Return an instance of EventEmitter
     * @class Ready to be extended to make object able to emit events.
     *
     * Inspiration : {@link https://github.com/Wolfy87/EventEmitter/blob/master/src/EventEmitter.js}
     * @constructs
     * @return {EventEmitter} The current EventEmitter instance to allow chaining
     */
    initialize: function() {
      this._events      = {};
      this._subscribers = [];
    },

    /**
     * Adds an event listener for the specified event
     *
     * @param {String} type - Event type name
     * @param {Function} listener - Function to be called when the event is fired
     * @param {Object} [scope = current {@link EventEmitter} instance] - Object that _this_ should be set to when the listener is called
     * @param {Boolean} [once = false] - If true then the listener will be removed after the first call
     * @return {EventEmitter} The current EventEmitter instance to allow chaining
     */
    on: function(type, listener, scope, once) {
      var event;

      // handle multiple events object
      if (typeof type === 'object') {
        var events = type;
        for (event in events) {
          if (events.hasOwnProperty(event)) {
            this.on(event, events[event], listener, scope);
          }
        }
        return this;
      }

      once  = once  || false;
      scope = scope || this;

      // Create the listener array if it does not exist yet
      if (!this._events.hasOwnProperty(type)) {
        this._events[type] = new Event();
      }

      event = this._events[type];

      if (!event.disabled) {
        // Push the new event to the callbacks array
        var length = event.callbacks.push({
          type     : type,
          scope    : scope,
          listener : listener,
          once     : once
        });

        if (event.firing) {
          event.firingLength = length;
        } else if (event.args && event.args !== true) {
          event.firingStart = length - 1;
          this._fire(event, event.args);
        }
      }

      // Return the instance to allow chaining
      return this;
    },

    /**
     * Alias for {@link EventEmitter#on} method : adds an event listener for the specified event.
     *
     * @param {String} type - Event type name
     * @param {Function} listener - Function to be called when the event is fired
     * @param {Object} [scope = current {@link EventEmitter} instance] - Object that _this_ should be set to when the listener is called
     * @param {Boolean} [once = false] - If true then the listener will be removed after the first call
     * @return {EventEmitter} The current EventEmitter instance to allow chaining
     */
    addListener: function() {
      return this.on.apply(this, arguments);
    },

    /**
     * Subscribe to all events fired
     *
     * @param {Function} listener - Function to be called when any event is fired
     * @param {Object} [context = current {@link EventEmitter} instance] - Object that _this_ should be set to when the listener is called
     * @return {EventEmitter} The current EventEmitter instance to allow chaining
     */
    subscribe: function(listener, scope) {
      this._subscribers.push({
        scope    : scope || this,
        listener : listener
      });
      return this;
    },

    forward: function(type, ee, scope, once) {
      if (typeof ee.emit !== 'function')
        throw TypeError('forward only to an eventemitter');
      
      this.on(type, function() {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(type);
        ee.emit.apply(ee, args);
      }, scope, once);
      return this;
    },

    /**
     * Alias for {@link EventEmitter#subscribe}
     */
    onAny: function() {
      return this.subscribe.apply(this, arguments);
    },

    /**
     * Alias for {@link EventEmitter#on} method, but will remove the event after the first use
     *
     * @param {String} type - Event type name
     * @param {Function} listener - Function to be called when the event is fired
     * @param {Object} [scope = current {@link EventEmitter} instance] - Object that _this_ should be set to when the listener is called
     * @return {EventEmitter} The current EventEmitter instance to allow chaining
     */
    once: function(type, listener, scope) {
      return this.on(type, listener, scope, true);
    },

    /**
     * Removes the a listener for the specified event
     *
     * @param {String} type - Event type name the listener must have for the event to be removed
     * @param {Function} listener - Listener the event must have to be removed
     * @return {EventEmitter} The current EventEmitter instance to allow chaining
     */
    removeListener: function(type, listener) {
      if (this._events.hasOwnProperty(type)) {
        var event = this._events[type];
        if (!event.disabled) {
          var callbacks = this._events[type].callbacks;
          for (var i = 0; i < callbacks.length; i++) {
            if (callbacks[i].listener === listener) {
              if (event.firing) {
                event.firingLength--;
                if (i <= event.firingIndex) {
                  event.firingIndex--;
                }
              }
              callbacks.splice(i, 1);
            }
          }
        }
      }
      return this;
    },

    /**
     * Unsubscribe a listener from all the events
     *
     * @param {Function} listener - Listener the event must have to be removed
     * @return {EventEmitter} The current EventEmitter instance to allow chaining
     */
    unsubscribe: function(listener) {
      var l = this._subscribers.length;
      for (var i = 0; i < l; i++) {
        if (this._subscribers[i].listener === listener) {
          this._subscribers.splice(i, 1);
          break;
        }
      }
      return this;
    },

    /**
    * Emits an event executing all appropriate listeners.
    *
    * All values passed after the type will be passed as arguments to the listeners.
    *
    * @param {String} type - Event type name to run all listeners from
    * @param {*} args - Numerous arguments of any kind to be passed to the listener.
    * @return {EventEmitter} The current EventEmitter instance to allow chaining
    */
    emit: function(type) {
      var exists = this._events.hasOwnProperty(type),
          event  = this._events[type];

      if (exists && event.disabled) {
        return this;
      }

      for (var i = 0; i < this._subscribers.length; i++) {
        var sub = this._subscribers[i];
        sub.listener.apply(sub.scope, arguments);
      }

      if (exists) {
        if (event.firing) {
          if (!event.once) {
            event.stack.push(arguments);
          }
        } else if (!(event.once && event.args)) {
          this._fire(event, arguments);
        }
      }
      return this;
    },

    _fire: function(event, args) {
      event.args = !event.memory || args;

      if (event.callbacks.length) {
        args = Array.prototype.slice.call(args, 1);

        event.firing = true;
        event.firingLength = event.callbacks.length;
        event.firingIndex  = event.firingStart || 0;
        for (; event.callbacks && event.firingIndex < event.firingLength; event.firingIndex++) {
          var callback = event.callbacks[event.firingIndex];
          if (!event.once) {
            if (callback.once) {
              this.removeListener(callback.type, callback.listener);
            }
          }
          callback.listener.apply(callback.scope, args);
        }
        event.firing = false;
      }

      if (!event.once) {
        if (event.stack.length) {
          event.args = event.stack.shift();
          this.emit(event.args);
        }
      }
      else if (event.args === true) {
        this.disable(event);        
      } else {
        event.callbacks = [];
      }
    },

    disable: function(event) {
      if (typeof event === 'string') {
        event = this._events[event];
      }
      event.callbacks = event.stack = event.args = null;
      event.disabled  = true;
      return this;
    },

    fired: function(event) {
      if (typeof event === 'string') {
        event = this._events[event];
      }
      return !!event.args;
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
