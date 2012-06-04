var StateEventEmitter = require('../../util/state-eventemitter'),
    xmpp              = require('node-xmpp'),
    globals           = require('../../globals'),

    log = require('../../logging').ns('Transport');

var NodeXMPPTransport = module.exports = StateEventEmitter.extend({

  initialize: function(host, options) {
    this.supr();

    this._reconnect = options.reconnect || false;

    var jid = new xmpp.JID(options.jid);
    
    this._jid        = jid.user + '@' + jid.domain+'/'+
            (options.resource || globals.JID_RESOURCE);
    this._host       = jid.domain;
    this._password   = options.password;
    this._connection = null;

    this.setState('disconnected');
    if (!this._jid || !this._password)
      throw new Error('No JID or password to connect');
  },

  connect: function() {
    var self = this;
    this.setState('connecting', this._host, this._jid, this._password);

    this._connection = new xmpp.Client({
      jid       : this._jid,
      password  : this._password,
      reconnect : this._reconnect
    });

    this._connection.on('online', function() {
      self.setState('connected',  self._connection.jid.user+
                              '@'+self._connection.jid.domain+
                              '/'+self._connection.jid.resource);
    });

    this._connection.on('disconnect', function() {
      self.setState('disconnecting');
    });

    this._connection.on('close', function() {
      self.setState('disconnected');
    });

    this._connection.on('error', function(e) {
      log.error( e);
    });

    // Service discovery
    var NS_DISCO_INFO  = 'http://jabber.org/protocol/disco#info';
    var NS_RPC         = 'jabber:iq:rpc';
    this._connection.on('stanza', function(iq) {
      if (iq.is('iq') && iq.getChild('query', NS_DISCO_INFO)) {
        self._connection.send(new xmpp.Element('query', {xmlns: NS_DISCO_INFO})
                .c('feature', {'var': NS_DISCO_INFO}).up()
                .c('feature', {'var': NS_RPC}).up()
                .c('identity', {
                  category: 'automation',
                  type: 'rpc'
                }).tree());
      }
    });
  },

  disconnect: function() {
    this._connection.removeAllListeners();
    this._connection.end();
  },

  _onDiscovery: function() {
    
  },

  send: function(to, encoded, normalized) {
    if (this.stateIsNot('connected'))
      throw new Error('XMPP transport layer not connected');
    
    var iq = new xmpp.Element('iq', {
      type :  normalized.type === 'request' ? 'set' : 'result',
      id : normalized.id,
      to : to
    })
    .c('query', {xmlns : "jabber:iq:rpc"})
    .cnode(encoded);

    this._connection.send(iq);
  },

  listen: function(fn, context) {
    if (this.stateIsNot('connected'))
      throw new Error('XMPP transport layer not connected');
    
    context = context || this;
    var handler = function(iq) {
      if (iq.is('iq') && iq.getChild('query', 'jabber:iq:rpc')) {
        fn.call(context, {
          dst: iq.attrs.to,
          src: iq.attrs.from,
          msg: iq
        });
      }
      return true;
    };
    this._connection.on('stanza', handler);
  }

});