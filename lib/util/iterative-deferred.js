var Deferred  = require('./deferred');

var IterativeDeferred = module.exports = Deferred.extend({
  initialize: function(to_map) {
    this.supr();
    this.to_map = to_map;
    this._started = false;

    this._reduceBuffer = [];
    this._endShouldBeLaunched = false;
  },

  /**
   * Functional programming: easy setter for the map function.
   * @see #mapFn
   *
   * @param  {Function} mapFn [description]
   */
  map: function(mapFn) {
    this.mapFn = mapFn;

    //directly start if anything to map
    if(this.to_map)
      this.start();
    return this;
  },

  /**
   * The map function, to be defined: should map a key to a deferred object.
   *
   * Should return a deferred object that will be registered: the iterative
   * process won't stop until all registered deferred are completed or a
   * manual intervention.
   *
   * If the key has already been mapped, the mapping will be ignored. To test
   * equality between key, @see #equalTestFn.
   *
   * @param  {object} key - key to map to a Deferred
   * @return {undefined | Deferred} mapped Deferred
   */
  //mapFn: function(key) {
  //},

  /**
   * Set itinial reduce value.
   *
   * @param  {*} init_value
   */
  init: function(init_value) {
    this._currentReduceResult = init_value;
    return this;
  },

  /**
   * Functional programming: easy setter for the reduce function.
   * @see #reduceFn
   *
   * @param  {function} reduceFn [description]
   * @param {*}       init_value - initial reduce value
   */
  reduce: function(reduceFn, init_value) {
    this.reduceFn = reduceFn;

    if(init_value)
      this._currentReduceResult = init_value;

    //if waiting reduces in buffer, empty it :
      while(this._reduceBuffer.length >0) {
        var args = this._reduceBuffer.shift();
        this._launchReduce.apply(this, args);
      }

    return this;
  },

  /**
   * The reduce function, to be defined: should combine resolved result from
   * mapped deferred and the previous reduce result. It can feed the mapping
   * process with keys to map, by calling the map argument function.
   *
   * If the deferred resolved multiple arguments, the additional arguments are
   * present.
   *
   * At any moment the iterative process can be stopped manually just by
   * completing the working process as deferred: simply call `this.resolve` or
   * `this.reject`.
   *
   * The end arguments key, resolved and rejected are if needed to decide the
   * reduce process.
   *
   * @param  {*}     previous - previously returned by the reduce function
   * @param  {*}       result - the result resolved by the mapped Deferred
   * @param  {*} [additional] - if the resolve callback was called with multiple
   *                            arguments, additional arguments are present
   * @param  {function}   map - use this function to feed the mapping process with
   *                            new keys
   * @param  {object}     key - original mapping key whose deferred produced the
   *                            given resolved result
   * @param  {array} resolved - array of keys which mapped Deferred have been resolved
   * @param  {array} rejected - array of keys which mapped Deferred have been rejected
   *
   * @return {*} reduce result
   */
  //reduceFn: function(result /* ... */, previous, map, key, resolved, rejected) {
  //},

  /**
   * Functionnal programming: easy setter for the end function.
   * @see #endFn
   *
   * @param  {function} endFn [description]
   */
  end: function(endFn) {
    this.endFn = endFn;

    //it's over : launch immediatly end
    if(this._endShouldBeLaunched)
      this._launchEnd();

    return this;
  },

  /**
   * The end function, will be called when the iterative process ends, ie. there
   * is no more uncompleted mapped Deferred and all reduce processes are finished.
   *
   * The end function should complete the process by calling `this.resolve` or
   * `this.reject`. If this is not done, the process will be automatically resolved.
   *
   * @param  {*} reduce_result - what finally came out the reduce process
   * @param  {array} resolved  - array of keys which mapped Deferred have been resolved
   * @param  {array} rejected  - array of keys which mapped Deferred have been rejected
   */
  //endFn: function(reduce_result, resolved, rejected) {
  //},

  /**
   * Start the iterative map/reduce given the this array of
   * map consumable.
   *
   * @param  {Array<key>} array [description]
   */
  start: function(array) {
    if(this._started)
      return this;
    this._started = true;

    if(array)
      this.to_map = array;

    var to_map = this.to_map;
    var length = to_map.length || to_map.size();
    if(length !== 0) {
      //initialization
      this._onFly = 0;
      this._alreadyMaped = [];
      this._resolved = [];
      this._rejected = [];

      //go !
      for (var i = 0, l = to_map.length; i < l; i++) {
        this._launchMap(to_map[i]);
      }

    } else {
      this.endFn(this._currentReduceResult);
    }
    return this;
  },

  /**
   * Test the equality of 2 keys.
   *
   * Used to determine if a key has already been mapped. Use an #equals method if
   * present. Else use the result of `===`.
   *
   * @param  {*} key1
   * @param  {*} key2
   * @return {boolean} result
   */
  equalTestFn: function(key1, key2) {
    return (typeof key1.equals !== 'undefined') ?
            key1.equals(key2)
          : key1 === key2;
  },

  _launchMap: function(key) {

    //if the key has alreday been mapped
    var already = this._alreadyMaped.some(function(key2) {
      return this.equalTestFn(key, key2);
    }, this);
    if(already)
      return;
    this._alreadyMaped.push(key);

    //call the map function and get the deferred
    var def = this.mapFn(key);
    if(!def || def === null)
      return;

    //it's not a deferred, it's  just an object to reduce directly :
    if(typeof def.then !== 'function') {
      var res = def;
      def = new Deferred()
                .resolve(res);
    }

    //we've got a new deferred on the fly
    this._onFly ++;

    //on deferred resolve or reject, decrement
    def.always(function() { this._onFly --;}, this)

       .addCallback(function() {
          if(!this.isCompleted()) {
            //add to resolved
            this._resolved.push(key);
            //reduce result
            this._launchReduce(key, arguments);
          }
       }, this)

       .addErrback(function() {
        if(!this.isCompleted()) {
          //add to rejected
          this._rejected.push(key);
          //end ?
          this._checkFinish();
        }
       }, this);
  },

  _launchReduce: function(key, result) {
    //if the reduce function is not yet defined, put in a buffer for later
    if(!this.reduceFn) {
      this._reduceBuffer.push(arguments);
      return;
    }

    var reduce_args = [],
        i, l;

    //add previous reduce result
    reduce_args.push(this._currentReduceResult);
    //add resolve result of the mapped deferred
    for (i = 0, l = result.length; i < l; i++) { reduce_args.push(result[i]); }
    //add back-to-mapping function : aggregate keys
    // to map and do mapping at the end.
    var to_map = [];
    reduce_args.push(function map(key) {
      to_map.push(key);
    });
    //add the key that produced result
    reduce_args.push(key);
    //add current resolved key
    reduce_args.push(this._resolved);
    //add current rejected key
    reduce_args.push(this._rejected);

    //call reduce
    this._currentReduceResult = this.reduceFn.apply(this, reduce_args);

    //launch mappings
    for (i = 0, l = to_map.length; i < l; i++) {
      this._launchMap(to_map[i]);
    }

    //end ?
    this._checkFinish();
  },

  _launchEnd: function() {
    this._endShouldBeLaunched = true;

    if(this.endFn) {
      var toMap = [];
      var map = function(key) { toMap.push(key); };
      this.endFn(this._currentReduceResult, map, this._resolved, this._rejected);

      // if we have to relaunch a mapping
      if (toMap.length) {
        for (var i = 0, l = toMap.length; i < l; i++) {
          this._launchMap(toMap[i]);
        }
      } else if(!this.isCompleted()) {
        //force the completion of the process if endFn didn't do it
        this.resolve(this._currentReduceResult);
      }
      
    }
  },

  _checkFinish: function() {
    if(this._onFly === 0 && this._reduceBuffer.length === 0 && !this.isCompleted()) {
      this._launchEnd();
    }
  }
});