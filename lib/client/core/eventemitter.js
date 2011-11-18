// Dep: [KadOH]/core/class
(function(exports) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;

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
    initialize : function() {
      this._events = {};
    },


    /**
    * Adds an event listener for the specified event
    *
    * @param {String} type - Event type name
    * @param {Function} listener - Function to be called when the event is fired
    * @param {Object} [scope = this] - Object that this should be set to when the listener is called
    * @param {Boolean} [once = false] - If true then the listener will be removed after the first call
    * @return {EventEmitter} The current EventEmitter instance to allow chaining
    */
    on : function(type, listener, scope, once) {
      once = once || false;
      scope = scope || this;

      // Create the listener array if it does not exist yet
      if(!this._events.hasOwnProperty(type)) {
        this._events[type] = [];
      }

      // Push the new event to the array
      this._events[type].push({
        type : type,
        scope : scope,
        listener : listener,
        once : once,
        ee : this
      });

      // Return the instance to allow chaining
      return this;
    },

   /**
    * Alias for {@link EventEmitter#on} method : adds an event listener for the specified event. 
    *
    * @param {String} type - Event type name
    * @param {Function} listener - Function to be called when the event is fired
    * @param {Object} [scope = this] - Object that this should be set to when the listener is called
    * @param {Boolean} [once = false] - If true then the listener will be removed after the first call
    * @return {EventEmitter} The current EventEmitter instance to allow chaining
    */
    addListener : function() {
      this.on.apply(this, arguments);
    },

    /**
    * Alias for {@link EventEmitter#on} method, but will remove the event after the first use
    *
    * @param {String} type - Event type name
    * @param {Function} listener - Function to be called when the event is fired
    * @param {Object} [scope = this] - Object that this should be set to when the listener is called
    * @return {EventEmitter} The current EventEmitter instance to allow chaining
    */
    once : function(type, listener, scope) {
      return this.addListener(type, listener, scope, true);
    },

    /**
    * Removes the a listener for the specified event
    *
    * @param {String} type - Event type name the listener must have for the event to be removed
    * @param {Function} listener - Listener the event must have to be removed
    * @return {EventEmitter} The current EventEmitter instance to allow chaining
    */
    removeListener : function(type, listener) {
      if(this._events.hasOwnProperty(type)) {
        this._events[type].forEach(function(evt, index){
          if(evt.listener === listener) {
            evt.ee._events[type].splice(index,1);
          }
        });
      }
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
    emit : function(type) {
    
      var args = [],
      i = null;

      for(i = 1; i < arguments.length; i += 1) {
      args.push(arguments[i]);
      }

      if(this._events.hasOwnProperty(type)) {
        this._events[type].forEach(function(evt) {
          evt.listener.apply(evt.scope, args);
          
          if(evt.once) {
            evt.ee.removeListener(evt.type, evt.listener);
          }
        });
      }
      // Return the instance to allow chaining
      return this;
  }
    

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
