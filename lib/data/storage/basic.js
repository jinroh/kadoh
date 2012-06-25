var klass = require('klass');
/*
 * Basic Storage class. Used in Node.js when lawnchair is not defined.
 * Imitate the API of lawnchair but is not persistant.
 */

var BasicPersistentStorage = module.exports = klass({

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
  },

  keys: function(cb) {
    var keys = [];
    for(var key in this._index) {
     if(this._index.hasOwnProperty(key))
      keys.push(key);
    }
    cb(keys);
  }
});