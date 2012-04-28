var EventEmitter = require('./eventemitter');

var StateEventEmitter = module.exports = EventEmitter.extend({
  
  initialize: function() {
    this.supr();
    this.addEvent('state_change');
    this.state = null;
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
      this.emit('state_change', state);
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
  },

  /**
   * Call a function when the state change. The callback
   * function willl be called with the state as parameter.
   * @param  {Function} cb  The function to be called when state changes
   * @param  {Object}   [ctx] Context in which the callback function willl be called
   * @return {self} this
   */
  onStateChange: function(cb, ctx) {
    this.on('state_change', cb, ctx);
    return this;
  }

});