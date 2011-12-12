// Dep: [KadOH]/core/eventemitter

(function(exports) {

  var KadOH        = exports,
      EventEmitter = KadOH.core.EventEmitter;

  KadOH.core = KadOH.core || {};
  var Deferred = KadOH.core.Deferred = EventEmitter.extend({
    
    initialize: function() {
      this.supr();

      this.setState('progress');
      this.args = undefined;
    },

    then: function(callback, progress, errback, context) {
      var args = Array.prototype.slice.call(arguments, 0);
      if ('object' === args[args.length-1]) {
        context = args[args.length-1];
        args.splice(args.length-1,1);
      } else {
        context = this;
      }

      if (args.length === 2) {
        errback = progress;
        progress = undefined;
      }

      if (typeof callback === 'function') {
        if (this.stateIs('resolved'))
          callback.apply(context, this.args);
        else
          this.on('resolve', callback, context);
      }

      if (typeof progress === 'function') {
        this.on('progress', progress, context); 
      }

      if (typeof errback === 'function') {
        if (this.stateIs('rejected'))
          errback.apply(context, this.args);
        else
          this.on('reject', errback, context);
      }
      
      return this;
    },

    resolve: function() {
      if (this.stateIsNot('progress')) 
        throw new Error('Already rejected or resolved');

      this.setState('resolved');
      this.args = arguments;

      var args = Array.prototype.slice.call(arguments);
      args.unshift('resolve');
      this.emit.apply(this, args);

      return this;
    },

    reject: function() {
      if (this.stateIsNot('progress')) 
        throw new Error('Already rejected or resolved');
        
      this.setState('rejected');
      this.args = arguments;
      
      var args = Array.prototype.slice.call(arguments);
      args.unshift('reject');
      this.emit.apply(this, args);

      return this;
    },

    progress: function() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('progress');
      this.emit.apply(this, args);      

      return this;
    }

  });

  Deferred.statics({
    
    /**
     * Static function which accepts a promise object
     * or any kind of object and returns a promise.
     * If the given object is a promise, it simply returns
     * the same object, if it's a value it returns a
     * new resolved deferred object
     * 
     * @param  {Object} promise Promise or value
     * @return {Deferred}
     */
    when: function(promise) {
      if (this.isPromise(promise))
        return promise;
      return new Deferred().resolve(promise);
    },

    isPromise: function(promise) {
      return promise && typeof promise.then === 'function';
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
