// Dep: [KadOH]/core/eventemitter

(function(exports) {

  var KadOH        = exports,
      EventEmitter = KadOH.core.EventEmitter;

  KadOH.core = KadOH.core || {};
  var Deferred = KadOH.core.StateEventEmitter = EventEmitter.extend({
    
    initialize: function() {
      this.supr();
      this.state = null;
      
    },

    /**
     * Set state of the object and, by default, emit the given state. 
     * 
     * You can avoid the emit of state by giving the silent argument as false.
     * 
     * @example
     * obj.setState('connecting', false);
     * 
     * You can also pass additional arguments that will be emited with the state.
     * 
     * @example
     * obj.setState('connecting', true, 'google.com'); 
     * //will do :
     * obj.emit('connecting', 'google.com');
     * 
     * @param {String}  state           the state to set
     * @param {Boolean} [silent=false]  if true, no event will be emitted
     * @param {*}       [add_args]      additionals arguments that will be passed in emit after the state
     *
     * @return {self}   this
     */
    setState: function(state, silent) {
      silent = silent || false;
      this.state = String(state);
      if(!silent) {
        var args = Array.prototype.slice.call(arguments);
        args.splice(1,1);
        this.emit.apply(this, arguments);
      }
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
      return !this.stateIs(state);
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
