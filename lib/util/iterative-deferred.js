var Deferred  = require('./deferred');

var IterativeDeferred = module.exports = Deferred.extend({
  /**
   * Functionnnal programming: easy setter for the map function.
   * @see #mapFn
   *
   * @param  {Function} mapFn [description]
   */
  map: function(mapFn) {
    this.mapFn = mapFn;
    return this;
  },

  /**
   * The map function, to be defined: should map a key to a deferred object.
   *
   * Should return a deferred object that wiil be registered: the iterative
   * process won't stop untill all registered deferred are completed or a
   * manual intervention.
   *
   * If the key has alreday been mapped, the mapping will be ignored. To test
   * equality between key, @see #equalTestFn.
   *
   * @param  {object} key - key to map to a Deferred
   * @return {undefined | Deffered} mapped Deferred
   */
  mapFn: function(key) {
  },

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
   * Functionnnal programming: easy setter for the reduce function.
   * @see #reduceFn
   *
   * @param  {function} reduceFn [description]
   * @param {*}       init_value - initial reduce value
   */
  reduce: function(reduceFn, init_value) {
    this.reduceFn = reduceFn;
    this._currentReduceResult = init_value;
    return this;
  },

  /**
   * The reduce function, to be defined: should combine resolved result from
   * mapped deffered and the previous reduce result. It can feed the mapping
   * process with keys to map, by calling the map arguement function.
   *
   * If the deffered resolved mutliple arguments, the addtional arguments are
   * present.
   *
   * At any moment the iterative process can be stopped manually just by
   * completing the workoing process as deferred: simply call `this.resolve` or
   * `this.reject`.
   * 
   * The end arguments key, resolved and rejected are if needed to decide the
   * reduce process.
   *
   * @param  {*}       result - the result resolved by the mapped Deffered
   * @param  {*} [additional] - if the resolve callback was called with multiple 
   *                            arguments, addtional arguments are present
   * @param  {*}     previous - previoulsy returned by the reduce function
   * @param  {function}   map - use this function to feed the mapping process with
   *                            new keys
   * @param  {object}     key - original mapping key whose deffered produced the
   *                            given resolved result
   * @param  {array} resolved - array of keys wich mapped Deferred has been resolved
   * @param  {array} rejected - array of keys wich mapped Deferred has been rejected
   *          
   * @return {*} reduce result
   */
  reduceFn: function(result, previous, map, key, resolved, rejected) {
  },

  /**
   * Functionnal programming: easy setter for the finally function.
   * @see #finallyFn
   *
   * @param  {function} finallyFn [description]
   */
  finally: function(finallyFn) {
    this.finallyFn = finallyFn;
    return this;
  },

  /**
   * The final function, will be called when the iterative process ends, ie there
   * is no more uncompleted mapped Deffered and all reduce process are finished.
   *
   * The final function should complete the process by calling `this.resolve` or
   * `this.reject`. If this is not done, the process will be automatically resolved.
   *
   * @param  {*} reduce_result - what finally came out the reduce process
   * @param  {array} resolved  - array of keys wich mapped Deferred has been resolved
   * @param  {array} rejected  - array of keys wich mapped Deferred has been rejected
   */
  finallyFn: function(reduce_result, resolved, rejected) {
  },

  /**
   * Start the iterative map/reduce given the this array of
   * map consumable.
   *
   * @param  {Array<key>} array [description]
   */
  startWith: function(array) {
    var length = array.length || array.size();
    if(length !== 0) {
      //initialization
      this._onFly = 0;
      this._alreadyMaped = [];
      this._resolved = [];
      this._rejected = [];

      //go !
      array.forEach(function(key) {
        this._launchMap(key);
      },this);

    } else {
      this.finallyFn(this._currentReduceResult);
    }
    return this;
  },

  /**
   * Test the equality of 2 keys.
   *
   * Used to dtermine if a key has already been mapped. Use an #equals method if
   * if present. Else use the result of `===`.
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
    if(!def || typeof def.then !== 'function')
      return;

    //we've got a new deferred on the fly
    this._onFly ++;

    //on deferred resolve or reject, decrement
    def.always(function() { this._onFly --;}, this)

       .addCallback(function() {
          if(!this.isCompleted()) {
            //add to resolved
            this._resolved.push(key);
            //reduce result
            this._launchReduce(key, Array.prototype.slice.call(arguments));
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
    var reduce_args = [];

    //add resolve result of the mapped deferred
    result.forEach(function(arg) { reduce_args.push(arg);});
    //add previous reduce result
    reduce_args.push(this._currentReduceResult);
    //add back-to-mapping function
    var that = this;
    reduce_args.push(function map(key) {
      that._launchMap(key);
    });
    //add the key that produced result
    reduce_args.push(key);
    //add current resolved key
    reduce_args.push(this._resolved);
    //add current rejected key
    reduce_args.push(this._rejected);

    //call reduce
    this._currentReduceResult = this.reduceFn.apply(this, reduce_args);

    //end ?
    this._checkFinish();
  },

  _checkFinish: function() {
    if(this._onFly === 0 && !this.isCompleted()) {
      this.finallyFn(this._currentReduceResult, this._resolved, this._rejected);

      //force the completion of the process if finallyFn didn't do it
      if(!this.isCompleted())
        this.resolve(this._currentReduceResult);
    }
  }
});