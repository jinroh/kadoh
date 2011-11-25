// Dep: [KadOH]/core/class
// xDep: [KadOH]/util/when
// Dep: [KadOH]/core/eventemitter

(function(exports) {

  var KadOH = exports;
  KadOH.core = KadOH.core || {};

  //var Class = KadOH.core.Class;
  //var when = KadOH.util.when;
  var EventEmitter = KadOH.core.EventEmitter;

  KadOH.core.Deferred = EventEmitter.extend({
    
    initialize: function() {
      this.supr();

      this.state = 'progress';
      this.args = undefined;
    },

    then: function(callback, progress, errback) {
      if(arguments.length === 2) {
        errback = progress;
        progress = undefined;
      }

      if(typeof callback === 'function') {
        if(this.state === 'resolved')
          callback.apply(this, this.args);
        else
          this.on('resolve', callback);
      }

      if(typeof progress === 'function') {
        this.on('progress', progress); 
      }

      if(typeof errback === 'function') {
        if(this.state === 'rejected')
          errback.apply(this, this.args);
        else
          this.on('reject', errback);
      }
      
      return this;
    },

    resolve: function() {
      if(this.state !== 'progress') 
        throw new Error('Already rejected or resolved');

      this.state = 'resolved';
      this.args = arguments;

      var args = Array.prototype.slice.call(arguments);
      args.unshift('resolve');
      this.emit.apply(this, args);


      return this;
    },

    reject: function() {
      if(this.state !== 'progress') 
        throw new Error('Already rejected or resolved');
        
      this.state = 'rejected';
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
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
