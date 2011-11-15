/**
 * A common API wrapper for jQuery (browser) and Restler (Node) written in deffered style.
 * 
 * @namespace <i>Namespace </i> : KadOH.util.ajax
 * @name ajax
 */


// Dep : [jQuery]/jquery-1.7.js

(function(exports,jquery) {

  var KadOH   = exports;
  KadOH.util  = KadOH.util ? KadOH.util : {};
  var restler = ('undefined' !==typeof require) ? require('restler') : null;

  if(jquery === null && restler === null) {
    console.warn('WARNING : jQuery or Restler is not defined : no ajax transport');
    return;
  }


  KadOH.util.ajax = /** @lends ajax */
    {

    /**
     * Get ajax call.
     * @param  {String} url      URL
     * @param  {Object} [settings] Additional settings
     * @return {AjaxReq} Deffered object
     */
    get : function(url, settings) {
      settings = settings || {};
      settings.type = 'GET';
      return new AjaxReq(url, settings);
    },

    /**
     * Post ajax call.
     * @param  {String} url      URL
     * @param  {Object | String} data     Post data
     * @param  {Object} [settings] Additional settings
     * @return {AjaxReq} Deffered object
     */
    post : function(url, data, settings) {
      settings = settings || {};
      settings.type = 'POST';
      settings.data = settings.data || data || undefined;
      return new AjaxReq(url, settings);
    },

    /**
     * Put ajax call.
     * @param  {String} url      URL
     * @param  {Object | String} data     Post data
     * @param  {Object} [settings] Additional settings
     * @return {AjaxReq} Deffered object
     */
    put : function(url, data, settings) {
      settings = settings || {};
      settings.type = 'PUT';
      settings.data = settings.data || data || undefined;
      return new AjaxReq(url, settings);
    },

    /**
     * Delete ajax call.
     * @param  {String} url      URL
     * @param  {Object} [settings] Additional settings
     * @return {AjaxReq} Deffered object
     */
    'delete' : function(url, settings) {
      settings = settings || {};
      settings.type = 'DELETE';
      return new AjaxReq(url, settings);
    },

    /**
     * Custom ajax call.
     * @param  {String} url      URL
     * @param  {Object} [settings] Additional settings
     * @return {AjaxReq} Deffered object
     */
    request : function(url, settings) {
      return new AjaxReq(url, settings);
    }
  };
/**
 * Simili-deffered object of the Ajax request
 * 
 * @class <i>Namespace</i> : KadOH.util.ajax.AjaxReq
 * @name AjaxReq
 * 
 * @constructor
 * @param {String} url Ressource url
 * @param {Object} [settings] Additionals settings 
 * @param {String} [settings.type] GET, POST, PUT, DELETE
 * @param {Object|String} [settings.data] Data associated
 */
  var AjaxReq = function(url, settings) {
    var options = settings || {};
    if(jquery !== null) {
      this.jqXHR = jquery.ajax(url, options);
    }
    if(restler !== null) {
      if(typeof options.type !== undefined) {
        options.method = options.type;
        options.parser = restler.parsers.auto;
        delete options.type;
      }
      this.restReq = restler.request(url, options);
    }
  };

  AjaxReq.prototype = /** @lends AjaxReq# */
    {
    /**
     * Execute a _function_ when the request is completed.
     * @param {Function} donefn(data,textStatus) The function to be called when request is completed.
     * @return {AjaxReq} Chainable AjaxReq
     */  
    done : function(fn) {
      if(jquery !== null) { 
        this.jqXHR.done(fn);
      }
      if(restler !== null) {
        this.restReq.on('success', function(data, response) {
          fn(data, response);
        });
      }
      return this;
    },

    /**
     * Execute a function when the request is rejected.
     * @param {Function} failfn(textStatus,thrownError) The function to be called when request is rejected.
     * @return {AjaxReq} Chainable AjaxReq
     */ 
    fail : function(fn) {
      if(jquery !== null) { 
        this.jqXHR.fail(fn);
      }
      if(restler !== null) {
        this.restReq.on('error', function(status, object) {
          fn(status, object);
        });
      }
      return this;
    },
    /**
     * Execute the first function passed as parameter when the request is completed, the second when it is failed.
     * @param {Function} donefn(data,textStatus) The function to be called when request is completed.
     * @param {Function} failfn(textStatus,thrownError) The function to be called when request is rejected.
     * @return {AjaxReq} Chainable AjaxReq
     */ 
    then : function(donefn, failfn) {
      if(jquery !== null) { 
        this.jqXHR.then(donefn, failfn);
      }
      if(restler !== null) {
        //@TODO : not sure, to be tested
        this.done(donefn);
        this.fail(failfn);
      }
      return this;
    },

    /**
     * Execute function passed as parameter wathever the request is completed or rejected.
     * @param {Function} callback(data,textStatus) Allways called function.
     * @return {AjaxReq} Chainable AjaxReq
     */ 
    always : function(fn) {
      if(jquery !== null) { 
        this.jqXHR.always(fn);
      }
      if(restler !== null) {
         //@TODO : not sure, to be tested
         this.restReq.on('complete', function(data, response) {
          fn(response, data);
        });
      }
      return this;
    }
  };


    
})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}),
   'function' === typeof this.jQuery ? this.jQuery           : null);