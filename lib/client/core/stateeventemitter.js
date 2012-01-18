// Dep: [KadOH]/core/eventemitter

(function(exports) {

  var KadOH        = exports,
      Event        = KadOH.core.Event,
      EventEmitter = KadOH.core.EventEmitter;

  KadOH.core = KadOH.core || {};
  var Deferred = KadOH.core.StateEventEmitter = EventEmitter.extend({
    
    initialize: function() {
      this.supr();
      this.state = null;
      this._events.statechange = new KadOH.core.Event(false, false); // !memory && !once
    },

    /**
     * Set state of the object and emit an event whose name is the given state. 
     * 
     * You can pass additional arguments that will be emited with.
     * 
     * @example
     * obj.setState('connecting', 'google.com'); 
     * //will do :
     * obj.emit('connecting', 'google.com');
     * 
     * @param {String}  state       the state to set
     * @param {*}       [add_args]  additionals arguments that will be passed in emit after the state
     *
     * @return {self}   this
     */
    setState: function(state) {
      if (this.state !== state) {
        this.setStateSilently(state);
        this.emit.apply(this, arguments);
      }
      return this;
    },

    /**
     * Set state but don't emit any event.
     * @param {String} state the state to set
     * 
     * @return {self} this
     */
    setStateSilently: function(state) {
      this.state = String(state);
      return this;
    },

    /**
     * Getter for the state of the object.
     * @return {String} state
     */
    getState: function() {
      return this.state;
    },

    /**
     * Match tester for the state of the object.
     * @param  {String} state state to be tested
     * @return {Booelean} result of the test
     */
    stateIs: function(state) {
      return this.state === state;
    },

    /**
     * Not match tester for the state of the object.
     * @param  {String} state state to be tested
     * @return {Booelean} result of the test
     */
    stateIsNot: function(state) {
      return this.state !== state;
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
