// Dep: [KadOH]/core/class

(function(exports) {

  var KadOH = exports,
      Class = KadOH.core.Class;

  KadOH.storage = KadOH.storage || {};

  /*
   * Basic Storage class. Used in Node.js when lawnchair is not defined.
   * Imitate the API of lawnchair but is not persistant.
   */

  KadOH.storage.BasicStorage = Class({

    initialize: function(config, cb) {
      cb = cb || function(){};
      this.config = config; //could be usefull
      this._index = {};
      cb.call(this, this);
    },

    save: function(kv, cb) {
      cb = cb || function(){};
      this._index[kv.key] = kv;
      cb.call(this, kv);
      return this;
    },

    get: function(key, cb) {
      cb = cb || function(){};
      if(typeof this._index[key] == 'undefined') {
        cb.call(this, null);
        return this;
      }
      cb.call(this, this._index[key]);
      return this;
    },

    exists: function(key, cb) {
      if(typeof this._index[key] == 'undefined') {
        cb.call(this, false);
        return this;
      }
      cb.call(this, true);
      return this;

    },

    remove: function(key, cb) {
      cb = cb || function(){};
      if(typeof this._index[key] == 'undefined') {
        cb.call(this);
        return this;
      }
      delete this._index[key];
      cb.call(this);
      return this;
    },

    nuke: function(cb) {
      cb = cb || function(){};
      this._index = {};
      cb.call(this);
    },

    each: function(cb) {
      for(var obj in this._index) {
        cb.call(this, obj);
      }
    }
  });


})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));