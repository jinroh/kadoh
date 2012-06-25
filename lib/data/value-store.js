var EventEmitter      = require('../util/eventemitter'),
    globals           = require('../globals'),
    Deferred          = require('../util/deferred'),
    Crypto            = require('../util/crypto'),

    //@browserify-alias[lawnchair] ./storage/lawnchair -r
    //@browserify-alias[basic]     ./storage/basic     -r
    PersistentStorage = require('./storage'),

    log               = require('../logging').ns('ValueStore');

var ValueStore = module.exports = EventEmitter.extend({

  /**
   * Instanciate a new value management.
   *
   * @constructs
   * @param  {Object} name  A unique name of the store
   * @param  {Object} [options] Some configuration options..
   * @param  {Boolean} [options.recover = true] If true, try to recover the last session that
   *                                    coresponds to the address/nodeID. If false, session is
   *                                    destructed and a new one is created.
   */
  initialize: function(name, options) {
    this.supr();
    
    var config = this.config = {
      recover    : true,
      delayedRep : true
    };
    for (var option in options) {
      config[option] = options[option];
    }

    var self = this;
    this._store = new PersistentStorage({
      name   : name,
      record : 'KeyValue'
    }, function() {});

    log.debug('initializing' + ((options && options.recover) ? ' with recover' : ''));
    if (config.recover) {
      this._recover();
    } else {
      this._store.nuke();
    }
    this._RepTimeouts = {};
    this._ExpTimeouts = {};

    this.emit('initialized');
  },

  /**
   * Stop the value management instance.
   *  - clear all timeouts
   * @return {this}
   */
  stop : function() {
    for(var i in this._RepTimeouts) {
      clearTimeout(this._RepTimeouts[i]);
      delete this._RepTimeouts[i];
    }
    for(var j in this._ExpTimeouts) {
      clearTimeout(this._ExpTimeouts[j]);
      delete this._ExpTimeouts[j];
    }
    return this;
  },

  /**
   * Store the given key/value in the storage. Provide an expirimation time.
   * Return ta deferred object representig the state of the store (resolved : OK, rejected : not OK).
   *
   * In the background, timers for republish and expiration are started.
   * For the xpiration time : negative value or not set : no expiration.
   *
   * Key/value are stored as object with properties :
   *   key   - the key
   *   value - the value that coresspond to the key (null if not found)
   *   exp   - expiration date (null or negative if unlimited)
   *   rep   - next republish date
   *
   * @public
   * @see  Deferred
   *
   * @param  {String}   key   the key associated to the value
   * @param  {*}        value the value of the key value
   * @param  {Integer}  [exp = -1]   timestamp for the expiration date (UTC in ms). If negative value or not set : no expiration.
   * @return {Deferred} a deferred object representing the state of the store
   */

  save: function(key, value, exp) {
    var def = new Deferred();

    var KeyValue = {
      key   : key,
      value : value
    };

    var now = new Date().getTime();

    //set republish date
    KeyValue.rep =  now + this._repTime;

    //check expiration time : negative value means infinite.
    KeyValue.exp = exp || -1;

    if( KeyValue.exp > 0 && KeyValue.exp <= now) {
      KeyValue.now = now;
      log.warn('save failed : key-value already expired', KeyValue);
      def.reject('key-value already expired');
      return def;
    }

    //set the timers
    this._setRepTimeout(KeyValue, this._repTime);
    this._setExpTimeout(KeyValue, KeyValue.exp - now);

    //and save
    this._store.save(KeyValue, function(obj) {
      def.resolve(obj);
    });

    //inform the rest of the world
    this.emit('save', KeyValue);

    return def;
  },

  /**
   * Retrieve the value of the key.
   *
   * To catch the result, there is 2 ways :
   *    - provide a callback function that will be called with value and
   *    expiration date as arguments.
   *    - handle the defered object that is returned, by this methods. If
   *    result, value and expiration date are passed to the success calback
   *    and if no result, the errback is called.
   *
   * Are passed as arguments of the callbak functions:
   *   value - the value that coresspond to the key (null if not found)
   *   exp   - expiration date (null or negative if unlimited)
   *
   * @see  Deferred
   * @public
   *
   * @param  {String}   key      the key associated to the value
   * @param  {Function} [callback] callback function
   * @param  {Object}   [scope = this ValueStore obejct] the scope to apply to the callback function (by default : the instance of ValueManagement)
   * @return {Deferred} a deferred object representing the state of the retrieve
   */

  retrieve: function(key, callback, scope) {
    var def = new Deferred();

    scope = scope || this;
    this._store.get(key, function(obj) {
      if(obj === null) {
        if (callback) callback.call(scope, null);
        def.reject();
      }
      else {
        if (callback) callback.call(scope, obj.value, obj.exp);
        def.resolve(obj.value, obj.exp);
      }
    });
    return def;
  },

  /**
   * Get the keys currently stored.
   * The callback will be called with the keys.
   *
   * @param  {Function} cb - callback called with result
   * @return {Deferred} a deferred object.
   */
  keys: function(cb, scope) {
    var def = new Deferred();
    this._store.keys(function(keys) {
      if(cb) cb.call(scope, keys);
      def.resolve(keys);
    });
    return def;
  },

  /**
   * Recover the last stored session.
   *
   * @private
   */
  _recover: function() {
    var now = new Date().getTime();
    var self = this;

    this._store.each(function(kv){
      try {
        if(kv.exp >= 0 && kv.exp <= now) {
          self._store.remove(kv.key);
          return;
        }
        self._setExpTimeout(kv,kv.exp - now);
        
        if(typeof kv.rep == 'undefined' || kv.exp <= now) {
          self._republish(kv);
          kv.rep =  now + self._repTime;
          self._store.save(kv);
        }
         
        self._setRepTimeout(kv, kv.rep - now);
        
      } catch(e) {
        self._store.remove(kv.key);
      }
    });
  },

  /**
   * Reset a timeout for republish of the given Key/Value
   *
   * @private
   * @param {[type]} kv      Key/Value
   * @param {[type]} timeout the timeout
   */
  _setRepTimeout: function(kv, timeout) {
    if(this._RepTimeouts[kv.key]) {
        clearTimeout(this._RepTimeouts[kv.key]);
        delete this._RepTimeouts[kv.key];
      }

    if(this.config.delayedRep) {
      timeout = Math.floor(timeout*(1+(2*Math.random()-1)*this._repWindow));
    }

    var TOiD = setTimeout(function(kv, self) {
      if(typeof kv == 'undefined') return; //in case of
      
      //check if it has already expired or if the timer is an old one
      var now = new Date().getTime();
      var hasExp = (typeof kv.exp == 'undefined' || kv.exp === null || kv.exp <0) ? false : (kv.exp <= now);
      if(hasExp) return;
      self._republish(kv);
    }, timeout, kv, this);

    this._RepTimeouts[kv.key] = TOiD;
    return this;
  },

  /**
   * Time between 2 republish processes of a stored value.
   * By default, the value is the TIMEOUT_REPUBLISH global constant.
   *
   * @private
   * @type {Integer}
   */
  _repTime : globals.TIMEOUT_REPUBLISH,

  /**
   * Percentage on republish timeout definong the window in whicch the repiublishs will occure.
   * By default, the value is the TIMEOUT_REPUBLISH_WINDOW global constant.
   * 
   * @private
   * @type {Integer}
   */
  _repWindow : globals.TIMEOUT_REPUBLISH_WINDOW,

  /**
   * Make a key/value being republished by calling the `republish` method of node instance.
   *
   * Before it checks if key/value is still existing. Reset a new timer.
   *
   * @param  {Object} kv the key/value object to republish
   * @return {Object} this
   */
  _republish: function(kv) {
    var self = this;
    //check before if the key/value still exists
      this._store.exists(kv.key, function(exists) {
        if(exists) {
          //reset republish date
          var now = new Date().getTime();
          kv.rep = now + self._repTime;

          //reset a timer
          self._setRepTimeout(kv, self._repTime);
          
          //sore it
          self._store.save(kv);

          //call node's republish method
          self.emit('republish', kv.key, kv.value, kv.exp);
        }
      });
    return this;
  },

  /**
   * Reset a timeout for expiration of the given Key/Value.
   * If the Key/Value has a negative expiration date (infinite), nothing is done.
   *
   * @private
   * @param {[type]} kv      Key/Value
   * @param {[type]} timeout the timeout
   * @return this
   */
  _setExpTimeout: function(kv, timeout) {
    if(kv.exp >= 0) {
      if(this._ExpTimeouts[kv.key]) {
        clearTimeout(this._ExpTimeouts[kv.key]);
        delete this._ExpTimeouts[kv.key];
      }

      var TOiD = setTimeout(function(kv, self) {
        if(typeof kv == 'undefined') return; //in case of

        //check if it has already expired (old timer)
        var now = new Date().getTime();
        var hasExp = (typeof kv.exp == 'undefined' || kv.exp === null || kv.exp <0) ? false : (kv.exp <= now);
        if(! hasExp) return;
        
        self._expire(kv);
      }, timeout, kv, this);

      this._ExpTimeouts[kv.key] = TOiD;
    }
    return this;
  },

  /**
   * Make a key/value expire. Before check if stil exists.
   *
   * @private
   * @param  {Object} kv the key/value to make expire
   * @return {Object} this
   */
  _expire: function(kv) {
    var self = this;
    //check before if the key/value still exists
      this._store.exists(kv.key, function(exists) {
        if(exists) {
          self._store.remove(kv.key);
          self.emit('expire', kv);
        }
      });
    return this;
  }
});