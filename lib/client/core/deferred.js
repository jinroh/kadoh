// Dep: [KadOH]/core/stateeventemitter

(function(exports) {

  var KadOH             = exports,
      StateEventEmitter = KadOH.core.StateEventEmitter;

  KadOH.core = KadOH.core || {};
  var Deferred = KadOH.core.Deferred = StateEventEmitter.extend({
    
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
          this.on('resolved', callback, context);
      }

      if (typeof progress === 'function') {
        this.on('progress', progress, context); 
      }

      if (typeof errback === 'function') {
        if (this.stateIs('rejected'))
          errback.apply(context, this.args);
        else
          this.on('rejected', errback, context);
      }
      
      return this;
    },

    resolve: function() {
      if (this.stateIsNot('progress')) 
        throw new Error('Already rejected or resolved');

      this.args = arguments;
      var args = Array.prototype.slice.call(arguments);
            
      this.setState('resolved', true, args);
      return this;
    },

    reject: function() {
      if (this.stateIsNot('progress')) 
        throw new Error('Already rejected or resolved');
        
      this.args = arguments;
      var args = Array.prototype.slice.call(arguments);

      this.setState('rejected', true, args);
      return this;
    },

    progress: function() {
      var args = Array.prototype.slice.call(arguments);
      this.setState('progress', true, args);

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

    /**
     * Inspired by when.js from Brian Cavalier
     */
    whenAtLeast: function(promises, toResolve) {
      var deferred = new Deferred();
      var resolved = 0;

      toResolve    = Math.max(1, Math.min(toResolve || 1, promises.length));
      promisesLeft = promises.length;

      var reject = function() {
        if (--promisesLeft === 0) {
          if (resolved >= toResolve) {
            deferred.resolve();
          } else {
            deferred.reject();
          }
        }
      };

      var resolve = function() {
        resolved++;
        reject();
      };

      for (var i = 0; i < promises.length; i++) {
        Deferred.when(promises[i]).then(resolve, reject, deferred.progress);
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
          Deferred.when(promises[i]).then(resolve, deferred.reject, deferred.progress);
        }
      }
      return deferred;
    },

    isPromise: function(promise) {
      return promise && typeof promise.then === 'function';
    }

  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
