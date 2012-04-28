var klass = require('klass');

var Event = function(options) {
  this.callbacks   = [];
  this.stack       = [];
  this.args        = null;
  this.firing      = false;
  this.firingIndex = 0;
  this.firingStart = 0;
  this.disabled    = false;

  //
  // Config flags
  //
  this.memory = (options && options.memory) || false;
  this.once   = (options && options.once)   || false;
};

Event.prototype.addListener = function(listener, scope, once) {
  var length = this.callbacks.push({
    listener : listener,
    scope    : scope,
    once     : once
  });
  if (this.firing) {
    this.firingLength = length;
  } else if (this.args && this.args !== true) {
    this.firingStart = length - 1;
    this._fire(this.args);
  }
};

Event.prototype.removeListener = function(listener) {
  var i = this.callbacks.length - 1;
  for (; i >= 0; i--) {
    if (this.callbacks[i].listener === listener) {
      if (this.firing) {
        this.firingLength--;
        if (i <= this.firingIndex) {
          this.firingIndex--;
        }
      }
      this.callbacks.splice(i, 1);
    }
  }
};

Event.prototype.removeAllListeners = function() {
  this.callbacks = [];
};

Event.prototype.disable = function() {
  this.addListener = this.removeListener = this.fire = function() {};
  this.callbacks   = this.stack = null;
  this.disabled    = true;
};

Event.prototype.fired = function() {
  return !!this.args;
};

Event.prototype.fire = function(args) {
  if (this.firing) {
    if (!this.once) {
      this.stack.push(args);
    }
  }
  else if (!(this.once && this.args)) {
    this._fire(args);
  }
};

Event.prototype._fire = function(args) {
  this.args = !this.memory || args;
  if (this.callbacks.length) {
    this.firing = true;
    this.firingLength = this.callbacks.length;
    this.firingIndex  = this.firingStart || 0;
    for (; this.callbacks && this.firingIndex < this.firingLength; this.firingIndex++) {
      var callback = this.callbacks[this.firingIndex];
      if (callback.once && !this.once) {
        this.removeListener(callback.listener);
      }
      callback.listener.apply(callback.scope, args);
    }
    this.firing = false;
  }

  if (!this.once) {
    if (this.stack.length) {
      this.args = this.stack.shift();
      this.fire(this.args);
    }
  } else if (this.args === true) {
    this.disable(this);
  } else {
    this.callbacks = [];
  }
};

var EventEmitter = module.exports = klass(
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
   * Add a specific event
   * @param {String}   type          Name of the event
   * @paral {Function} [constructor] Constructor of the Event object
   * @param {Object}   [options]     Event options
   */
  addEvent: function(type, constructor, options) {
    if (this._events.hasOwnProperty(type)) {
      throw new Error(type + ' event already exists');
    } else {
      if (typeof constructor !== 'function') {
        options     = constructor;
        constructor = Event;
      }
      this._events[type] = new constructor(options);
    }
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
    var events, event;

    // handle multiple events object
    if (typeof type === 'object') {
      events = type;
      for (event in events) {
        if (events.hasOwnProperty(event)) {
          this.on(event, events[event], listener, scope);
        }
      }
      return this;
    }

    // add the new listener
    events = this._events;
    if (events.hasOwnProperty(type)) {
      event = events[type];
    } else {
      event = events[type] = new Event();
    }
    event.addListener(listener, scope || this, once || false);
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
   * Subscribe to all events fired. The listener function will be called with the name of the event as first argument.
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
      this._events[type].removeListener(listener);
    }
    return this;
  },

  /**
   * Removes all listeners for all or a specified event
   *
   * @param {String} [type] - The listeners' event type to be removed
   */
  removeAllListeners: function(type) {
    var events = this._events;
    if (!type) {
      for (var event in events) {
        if (events.hasOwnProperty(event)) {
          events[event].removeAllListeners();
        }
      }
    }
    else if (events.hasOwnProperty(type)) {
      events[type].removeAllListeners();
    }
  },

  /**
   * Unsubscribe a listener from all the events
   *
   * @param {Function} listener - Listener the event must have to be removed
   * @return {EventEmitter} The current EventEmitter instance to allow chaining
   */
  unsubscribe: function(listener) {
    var subscribers = this._subscribers;
    var i = subscribers.length - 1;
    for (; i >= 0; i--) {
      if (subscribers[i].listener === listener) {
        subscribers.splice(i, 1);
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

    if (!(exists && event.disabled)) {
      for (var i = 0; i < this._subscribers.length; i++) {
        var sub = this._subscribers[i];
        sub.listener.apply(sub.scope, arguments);
      }

      if (exists) {
        event.fire(Array.prototype.slice.call(arguments, 1));
      }
    }
    return this;
  },

  /**
   * Disable a particular event
   *
   * @param  {String|Event} event - The event to disable
   * @return {EventEmitter} The current EventEmitter instance to allow chaining
   */
  disable: function(event) {
    if (typeof event === 'string') {
      event = this._events[event];
    }
    event.disable();
    return this;
  },

  /**
   * Return wheter or not a given event has been fired
   *
   * @param  {String|Event} event - The given event
   * @return {Boolean}
   */
  fired: function(event) {
    if (typeof event === 'string') {
      event = this._events[event];
    }
    return event.fired();
  }

});