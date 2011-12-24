// Dep: [KadOH]/core/class
(function(exports) {
  
  var KadOH = exports,
      Class = KadOH.core.Class;

  KadOH.core = KadOH.core || {};

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
      this.state        = null;
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
      once  = once  || false;
      scope = scope || this;

      // Create the listener array if it does not exist yet
      if (!this._events.hasOwnProperty(type)) {
        this._events[type] = [];
      }

      // Push the new event to the array
      this._events[type].push({
        type     : type,
        scope    : scope,
        listener : listener,
        once     : once,
        ee       : this
      });

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
     * @param {Object} [scope = current {@link EventEmitter} instance] - Object that _this_ should be set to when the listener is called
     * @return {EventEmitter} The current EventEmitter instance to allow chaining
     */
    subscribe: function(listener, scope) {
      scope = scope || this;

      this._subscribers.push({
        scope    : scope,
        listener : listener,
        ee       : this
      });

      return this;
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
      return this.addListener(type, listener, scope, true);
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
        this._events[type].forEach(function(evt, index){
          if (evt.listener === listener) {
            evt.ee._events[type].splice(index,1);
          }
        });
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
      var i, l;

      l = this._subscribers.length;
      for (i = 0; i < l; i++) {
        var sub = this._subscribers[i];
        sub.listener.apply(sub.scope, arguments);
      }

      if (this._events.hasOwnProperty(type)) {
        var args   = Array.prototype.slice.call(arguments, 1);
        var events = this._events[type];
        l = events.length;
        for (i = 0; i < l; i++) {
          var evt = events[i];
          evt.listener.apply(evt.scope, args);
          
          if (evt.once) {
            evt.ee.removeListener(evt.type, evt.listener);
          }
        }
      }

      // Return the instance to allow chaining
      return this;
    }
  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
