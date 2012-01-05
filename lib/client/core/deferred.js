// Dep: [KadOH]/core/stateeventemitter

(function(exports) {

  var KadOH             = exports,
      Event             = KadOH.core.Event,
      StateEventEmitter = KadOH.core.StateEventEmitter;

  KadOH.core = KadOH.core || {};
  var Deferred = KadOH.core.Deferred = StateEventEmitter.extend({
    
    initialize: function() {
      this.supr();

      this._events.rejected = new Event(true, true); // memory && once
      this._events.resolved = new Event(true, true); // memory && once
      this._events.progress = new Event(true);       // memory

      this.setState('progress');
    },

    //
    // Callbacks functions
    //

    then: function(callback, errback, progress) {
      var context = arguments[arguments.length - 1];

      if (typeof context === 'function')
        context = this;

      this.addCallback(callback, context)
          .addErrback(errback,   context)
          .addProgress(progress, context);

      return this;
    },

    addCallback: function(callback, context) {
      if (typeof callback === 'function')
        this.on('resolved', callback, context || this);
      return this;
    },

    addErrback: function(errback, context) {
      if (typeof errback === 'function')
        this.on('rejected', errback, context || this);
      return this;
    },

    addProgress: function(progress, context) {
      if (typeof progress === 'function')
        this.on('progress', progress, context || this);
      return this;
    },

    //
    // Firing functions
    //

    resolve: function() {
      this.disable('rejected');
      this._complete('resolved', arguments);
      return this;
    },

    reject: function() {
      this.disable('resolved');
      this._complete('rejected', arguments);
      return this;
    },

    _complete: function(state, args) {
      if (this.isResolved() || this.isRejected()) {
        KadOH.log.error('deferred already completed');
        return;
      }
      Array.prototype.splice.call(args, 0, 0, state);
      this.setState.apply(this, args);
    },

    progress: function() {
      if (!this.isCompleted()) {
        Array.prototype.splice.call(arguments, 0, 0, 'progress');
        this.emit.apply(this, arguments);
      }
      return this;
    },

    //
    // Helpers
    //

    getResolvePassedArgs: function() {
      if(!this.isResolved()) {
        throw new Error('not resolved');
      } else {
        return Array.prototype.slice.call(this._events.resolved.args, 1);
      }
    },

    getRejectPassedArgs: function() {
      if(!this.isRejected()) {
        throw new Error('not rejected');
      } else {
        return Array.prototype.slice.call(this._events.rejected.args, 1);
      }
    },

    isCompleted: function() {
      return (
        this.fired('resolved') ||
        this.fired('rejected')
      );
    },

    isResolved: function() {
      return this.stateIs('resolved');
    },

    isRejected: function() {
      return this.stateIs('rejected');
    },

    cancel: function() {
      this.disable('resolved');
      this.disable('rejected');
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

    //
    // Inspired by when.js from Brian Cavalier
    //
    whenAtLeast: function(promises, toResolve) {
      var deferred = new Deferred(),
          resolved = 0;

      toResolve    = Math.max(1, Math.min(toResolve || 1, promises.length));
      promisesLeft = promises.length;

      var failure = function() {
        if (--promisesLeft === 0) {
          if (resolved >= toResolve) {
            deferred.resolve();
          } else {
            deferred.reject();
          }
        }
      };

      var success = function() {
        resolved++;
        failure();
      };

      for (var i = 0; i < promises.length; i++) {
        Deferred.when(promises[i]).then(success, failure, deferred.progress);
      }
      return deferred;
    },
    
    whenAll: function(promises) {
      return Deferred.whenSome(promises, promises.length);
    },

    whenSome: function(promises, toResolve) {
      var results  = [],
          deferred = new Deferred();

      toResolve = Math.max(0, Math.min(toResolve, promises.length));
      var success = function() {
        var index = promises.indexOf(this);
        results[index] = Array.prototype.slice.call(arguments);
        if (--toResolve === 0) {
          deferred.resolve.apply(deferred, results);
        }
      };

      if (toResolve === 0) {
        deferred.resolve.apply(deferred, results);
      } else {
        for (var i = 0; i < promises.length; i++) {
          Deferred.when(promises[i])
                  .then(success.bind(promises[i]), deferred.reject, deferred.progress);
        }
      }
      return deferred;
    },

    whenMap: function(promises, map) {
      var results  = [],
          deferred = new Deferred(),
          total    = promises.length,
          success;
          
      success = function() {
        var index = promises.indexOf(this);
        results[index] = map.apply(this, arguments);
        if (--total === 0) {
          deferred.resolve(results);
        }
      };

      for (var i = 0, l = promises.length; i < l; i++) {
        Deferred.when(promises[i])
                .then(success.bind(promises[i]), deferred.reject, deferred.progress);
      }
      return deferred;
    },

    isPromise: function(promise) {
      return promise && typeof promise.then === 'function';
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
