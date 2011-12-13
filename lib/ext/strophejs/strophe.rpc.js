/**
 * This program is distributed under the terms of the MIT license.
 * 
 * Copyright 2011 (c) Pierre Guilleminot <pierre.guilleminot@gmail.com>
 */

/**
 * Jabber-RPC plugin (XEP-0009)
 * Allow the management of RPC
 */
Strophe.addConnectionPlugin("rpc", {

  _connection : undefined,

  _whitelistEnabled : false,

  jidWhiteList : [],
  nodeWhiteList : [],
  domainWhiteList : [],

  /**
   * Plugin init
   * 
   * @param  {Strophe.Connection} connection Strophe connection
   */
  init: function(connection) {

    this._connection = connection;

    this._whitelistEnabled = false;

    this.jidWhiteList    = [];
    this.nodeWhiteList   = [];
    this.domainWhiteList = [];

    Strophe.addNamespace("RPC", "jabber:iq:rpc");

    if (!connection.hasOwnProperty("disco")) {
      Strophe.warn("You need the discovery plugin " +
                   "to have Jabber-RPC fully implemented.");
    }
    else {
      this._connection.disco.addIdentity("automation", "rpc");
      this._connection.disco.addFeature(Strophe.NS.RPC);
    }
  },

  /**
   * Add a jid or an array of jids to
   * the whitelist.
   * It's possible to use wildecards for the domain
   * or the node. ie:
   *   *@*
   *   myname@*
   *   *@jabber.org
   * 
   * @param {String|Array} jid
   */
  addJidToWhiteList: function(jid) {
    if (typeof(jid.sort) !== "function") {
      jid = [jid];
    }

    for (var i = 0; i < jid.length; i++) {
      if (jid === "*@*") {
        this._whitelistEnabled = false;
      }

      var node   = Strophe.getNodeFromJid(jid);
      var domain = Strophe.getDomainFromJid(jid);
      if (jid) {
        if (node === "*") {
          this.domainWhiteList.push(domain);
        } else if (domain === "*") {
          this.nodeWhiteList.push(node);
        } else {
          this.jidWhiteList.push(jid);
        }
        this._whitelistEnabled = true;
      }
    }
  },

  /**
   * Helper to filter out Jid outside of the whitelists
   * 
   * @param  {String} jid Jid to test 
   * @return {Boolean}
   */
  _jidInWhitelist: function(jid) {
    if (!this._whitelistEnabled)
      return true;

    if (jid === this._connection.jid)
      return true;
    
    return (
      this.domainWhiteList.indexOf(Strophe.getDomainFromJid(jid)) !== -1  ||
      this.nodeWhiteList.indexOf(Strophe.getNodeFromJid(jid))     !== -1  ||
      this.jidWhiteList.indexOf(jid) !== -1
    );
  },

  /**
   * Send a request message
   * 
   * @param  {Object} id     ID of the request
   * @param  {String} to     JID of the recipient
   * @param  {String} method name of the method
   * @param  {Array}  params Array of parameters
   */
  sendRequest: function(id, to, method, params) {
    params = (typeof(params.sort) === "function") ? params : [params];

    var iq = $iq({type: "set", id: id, from: this._connection.jid, to: to})
      .c("query", {xmlns: Strophe.NS.RPC})
      .c("methodCall")
      .c("methodName").t(method)
      .up()
      .c("params");

    for (var i = 0; i < params.length; i++) {
      iq.c("param").cnode(this._convertToXML(params[i]));
      iq.up();
    }

    this._connection.send(iq.tree());
  },

  /**
   * Send a response message
   * 
   * @param  {String} id     ID of the request
   * @param  {String} to     JID of the recipient
   * @param  {Object} result Result of the function call
   */
  sendResponse: function(id, to, result) {
    var iq = $iq({type: "result", id: id, from: this._connection.jid, to: to})
      .c("query", {xmlns: Strophe.NS.RPC})
      .c("methodResponse")
      .c("params")
      .c("param")
      .cnode(this._convertToXML(result));
    
    this._connection.send(iq.tree());
  },

  /**
   * Send an error response (or fault)
   * 
   * @param  {String} id      ID of the faulted request
   * @param  {String} to      JID of the recipient
   * @param  {Number} code    Code of the error
   * @param  {String} message Error message
   */
  sendError: function(id, to, code, message) {
    if (isNaN(code)) {
      Strophe.error(code + " is NaN");
      return;
    }
    message = String(message);

    var iq = $iq({type: "result", id: id, from: this._connection.jid, to: to})
      .c("query", {xmlns: Strophe.NS.RPC})
      .c("methodResponse")
      .c("fault")
      .cnode(this._convertToXML({
        faultCode: code,
        faultString: message
      }));
    
    this._connection.send(iq.tree());
  },

  _sendForbiddenAccess: function(id, to) {
    var iq = $iq({type: "error", id: id, from: this._connection.jid, to: to})
      .c("error", {code: 403, type: "auth"})
      .c("forbidden", {xmlns: Strophe.NS.STANZAS});
    
    this._connection.send(iq.tree());
  },

  /**
   * Add a request and response handlers
   * 
   * @param {Function} request_h  Request handler
   * @param {Function} response_h Response handler
   * @param {Object} context Context of the handlers
   */
  addHandlers: function(request_h, response_h, context) {
    this.addRequestHandler(request_h, context);
    this.addResponseHandler(response_h, context);
  },

  /**
   * Add a request handler
   * called every time a request is received
   * 
   * @param {Function} handler The handler function
   * @param {Object} context Context of the handler
   */
  addRequestHandler: function(handler, context) {
    this._connection.addHandler(this._filteredHandler(handler, context), Strophe.NS.RPC, "iq", "set");
  },

  /**
   * Add a response handler
   * called every time a response is received
   * 
   * @param {Function} handler The handler function called every time a response is received
   * @param {Object} context Context of the handler
   */
  addResponseHandler: function(handler, context) {
    this._connection.addHandler(this._filteredHandler(handler, context), Strophe.NS.RPC, "iq", "result");
  },

  _filteredHandler: function(handler, context) {
    context = context || this;
    var self = this;
    return function(doc) {
      var from = doc.getAttribute("from");
      if (!self._jidInWhitelist(from)) {
        self._sendForbiddenAccess(doc.getAttribute("id"), from);
        return true;
      }
      return handler.apply(context, arguments);
    };
  },

  /**
   * Helper to transform a Javascript object
   * into its XML representation as described in
   * the XML-RPC spec
   * 
   * @param  {Object} obj The objec to convert
   * @return {Element} A <value> element
   */
  _convertToXML: function(obj) {
    var key;

    var xml  = new Strophe.Builder("value");
    var type = new RegExp("function (.*?)\\(\\) \\{.*").exec(obj.constructor.toString())[1];

    switch (type) {
      case "Number":
        // Numbers can only be sent as integers or doubles.
        var number = (Math.floor(obj) !== obj) ? "double" : "i4";
        xml.c(number).t(obj);
        break;
      case "String":
        xml.c("string").t(obj);
        break;
      case "Boolean":
        xml.c("boolean").t(obj*1);
        break;
      case "Object":
        xml.c("struct");
        for (key in obj) {
          if (obj.hasOwnProperty(key) && typeof(obj[key]) !== "function") {
            xml.c("member").c("name").t(key);
            xml.up().cnode(this._convertToXML(obj[key]));
            xml.up().up();
          }
        }
        break;
      case "Date":
        var datetext = obj.getFullYear() +
                       this._padNumber(obj.getMonth()+1) +
                       this._padNumber(obj.getDate())    + "T" +
                       this._padNumber(obj.getHours())   + ":" +
                       this._padNumber(obj.getMinutes()) + ":" +
                       this._padNumber(obj.getSeconds());
        xml.c("dateTime.iso8601").t(datetext);
        break;
      case "Array":
        xml.c("array").c("data");
        for (key in obj) {
          if (obj.hasOwnProperty(key) && typeof(obj[key]) !== "function") {
            xml.cnode(this._convertToXML(obj[key]));
            xml.up();
          }
        }
        break;
      default:
        break;
    }

    return xml.tree();
  },

  _padNumber: function(num) {
    if (num < 10) {
      num = "0" + num;
    }
    return num;
  }

});