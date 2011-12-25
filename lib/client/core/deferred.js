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
      this._resolveWith('resolved', arguments);
      return this;
    },

    reject: function() {
      this._resolveWith('rejected', arguments);
      return this;
    },

    _resolveWith: function(state, args) {
      if (this.isResolved() || this.isRejected()) {
        KadOH.log.error('deferred already ' + state, this);
        return;
      }

      args = [state]
             .concat(Array.prototype.slice.call(args));
      this.setState.apply(this, args);
    },

    progress: function() {
      if (!this.isCompleted()) {
        var args = ['progress']
                   .concat(Array.prototype.slice.call(arguments));
        this.emit.apply(this, args);
      }
      return this;
    },

    //
    // Helpers
    //

    isCompleted: function() {
      return (
        this._fired('resolved') ||
        this._fired('rejected')
      );
    },

    isResolved: function() {
      return this.stateIs('resolved');
    },

    isRejected: function() {
      return this.stateIs('rejected');
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
      var deferred = new Deferred();
      var resolved = 0;

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
    
    whenEvery: function(promises) {
      return Deferred.whenSome(promises, promises.length);
    },

    whenSome: function(promises, toResolve) {
      var results  = [];
      var deferred = new Deferred();

      toResolve = Math.max(0, Math.min(toResolve, promises.length));
      var resolve = function() {
        results.push(Array.prototype.slice.call(arguments));
        if (--toResolve === 0) {
          deferred.resolve(results);
        }
      };

      if (toResolve === 0) {
        deferred.resolve(results);
      } else {
        for (var i = 0; i < promises.length; i++) {
          Deferred.when(promises[i])
                  .then(resolve, deferred.reject, deferred.progress);
        }
      }
      return deferred;
    },

    isPromise: function(promise) {
      return promise && typeof promise.then === 'function';
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
