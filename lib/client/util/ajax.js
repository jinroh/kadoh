// Dep : [jQuery]/jquery-1.7.js

(function(exports,jquery) {

  var KadOH = exports;
  KadOH.util = KadOH.util ? KadOH.util : {};

  if(jquery === null && 'undefined' === typeof require) {
    console.warn('WARNING : jQuery or Restler is not defined : no ajax transport');
    return;
  }
  /**
   * A common API wrapper for jQuery and Restler written in deffered style
   */

  KadOH.util.ajax = {

    /**
     * Get ajax call.
     * @param  {String} url      URL
     * @param  {Object} [settings] Additional settings
     * @return {AjaxReq} Deffered object
     */
    get : function(url, settings) {
    },

    /**
     * Post ajax call.
     * @param  {String} url      URL
     * @param  {Object | String} data     Post data
     * @param  {Object} [settings] Additional settings
     * @return {AjaxReq} Deffered object
     */
    post : function(url, data, settings) {
    },

    /**
     * Put ajax call.
     * @param  {String} url      URL
     * @param  {Object | String} data     Post data
     * @param  {Object} [settings] Additional settings
     * @return {AjaxReq} Deffered object
     */
    put : function(url, data, settings) {
    },

    /**
     * Delete ajax call.
     * @param  {String} url      URL
     * @param  {Object} [settings] Additional settings
     * @return {AjaxReq} Deffered object
     */
    'delete' : function(url, settings) {
    },

    /**
     * Custom ajax call.
     * @param  {String} url      URL
     * @param  {Object} [settings] Additional settings
     * @return {AjaxReq} Deffered object
     */
    request : function(url, sttings) {
    }
  };
/**
 * @constructor
 * Simili-deffered object of the Ajax request
 * @param {String} url Ressource url
 * @param {String} settings.method GET, POST, PUT, DELETE
 * @param {Object|String} settings.data Data associated
 */
  var AjaxReq = function(url, settings) {
    
  };

  AjaxReq.prototye = {
    /**
     * Execute a function when the request is completed.
     * @param {function(data, textStatus)} The function to be called when request is completed.
     * @return {AjaxReq} Chainable AjaxReq
     */  
    done : function(fn) {
      /////
      return this;
    },

    /**
     * Execute a function when the request is rejected.
     * @param {function(textStatus, thrownError)} The function to be called when request is rejected.
     * @return {AjaxReq} Chainable AjaxReq
     */ 
    fail : function(fn) {
      ///
      return this;
    },
    /**
     * Execute the first function passed as parameter when the request is completed, the second when it is failed.
     * @param {function(data, textStatus)} The function to be called when request is completed.
     * @param {function(textStatus, thrownError)} The function to be called when request is rejected.
     * @return {AjaxReq} Chainable AjaxReq
     */ 
    then : function(donefn, failfn) {
      /////
      return this;
    },

    /**
     * Execute function passed as parameter wathever the request is completed or rejected.
     * @param {function(data, textStatus, thrownError)} The function to be called.
     * @return {AjaxReq} Chainable AjaxReq
     */ 
    always : function(fn) {
      /////
      return this;
    }
  };


    
})('object' === typeof module   ? module.exports : (this.KadOH = this.KadOH || {}),
   'object' === typeof window.$ ? window.$       : null);