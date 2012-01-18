// Dep: [KadOH]/core/stateeventemitter
// Dep: [KadOH]/globals

(function(exports) {

  var KadOH             = exports,
      StateEventEmitter = KadOH.core.StateEventEmitter,
      globals           = KadOH.globals;
  
  try {
    var xmpp = require('node-xmpp');
  } catch(e) {
    return;
  }


  KadOH.transport = KadOH.transport || {};
  KadOH.transport.NodeXMPP = StateEventEmitter.extend({

    initialize: function(host, options) {
      this.supr();


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
        jid: this._jid,
        password: this._password
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
        KadOH.log.error(e);
      });
    },

    disconnect: function() {
      this._connection.removeAllListeners();
      this._connection.end();
    },

    send: function(to, message) {
      if (this.stateIsNot('connected'))
        throw new Error('XMPP transport layer not connected');
      
      var iq = new xmpp.Element('iq', {
        type :  message.isRequest() ? 'set' : 'result',
        id : message.getRPCID(),
        to : to
      })
      .c('query', {xmlns : "jabber:iq:rpc"})
      .cnode(message.stringify());

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

})( 'object' === typeof module       ? module.exports : (this.KadOH = this.KadOH || {}));
