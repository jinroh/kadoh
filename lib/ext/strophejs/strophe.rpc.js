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
  addJidToWhiteList: function(jids) {
    if (typeof(jids.sort) !== "function") {
      jids = [jids];
    }

    for (var i = 0; i < jids.length; i++) {
      var jid = jids[i];

      if (jid === "*@*") {
        this._whitelistEnabled = false;
        return;
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
   * Send a XMLElement as the request
   * Does not check whether it is properly formed or not
   * 
   * @param  {String}  id      ID of the request or response 
   * @param  {String}  to      JID of the recipient
   * @param  {String}  type    Type of the request ('set' for a request and 'result' for a response)
   * @param  {Element} element The XMLElement to send
   */
  sendXMLElement: function(id, to, type, element) {
    if (typeof element.tree === 'function') {
      element = element.tree();
    }

    var iq = $iq({type: type, id: id, from: this._connection.jid, to: to})
      .c("query", {xmlns: Strophe.NS.RPC})
      .cnode(element);
    
    this._connection.send(iq.tree());
  },

  _sendForbiddenAccess: function(id, to) {
    var iq = $iq({type: "error", id: id, from: this._connection.jid, to: to})
      .c("error", {code: 403, type: "auth"})
      .c("forbidden", {xmlns: Strophe.NS.STANZAS});
    
    this._connection.send(iq.tree());
  },

  /**
   * Add a raw XML handler for every RPC message incoming
   * @param {Function} handler The handler function called every time a rpc is received
   * @param {Object} context Context of the handler
   */
  addXMLHandler: function(handler, context) {
    this._connection.addHandler(this._filteredHandler(handler, context), Strophe.NS.RPC, "iq");
  },

  _filter: function(xml) {
    var from = xml.getAttribute("from");
    if (!this._jidInWhitelist(from)) {
      this._sendForbiddenAccess(xml.getAttribute("id"), from);
      return false;
    }
    return true;
  },

  _filteredHandler: function(handler, context) {
    context = context || this;
    var self = this;
    return function(xml) {
      if (self._filter(xml)) {
        return handler.apply(context, arguments);
      }
      return true;
    };
  }

});