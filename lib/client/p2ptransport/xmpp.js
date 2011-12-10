// Dep: [strophejs]/core
// Dep: [strophejs]/flxhr.js
// Dep: [KadOH]/core/eventemitter

(function(exports, strophe) {

  if (!strophe) {
    if ('object' == typeof console) 
      console.warn('WARNING : strophe not defined : no transport');
    return;
  }

  var KadOH        = exports,
      EventEmitter = KadOH.core.EventEmitter;
  
  var $msg   = function(attrs) { return new strophe.Builder('message', attrs); };
  var $pres  = function(attrs) { return new strophe.Builder('presence', attrs); };

  KadOH.transport = KadOH.transport || {};
  KadOH.transport.XMPP = EventEmitter.extend({

    initialize: function(host, options) {
      this.supr();
      this.state = 'disconnected';

      this._host = host;

      this._jid = options.jid;
      this._password = options.password;

      if (!this._jid || !this._password)
        throw new Error('No JID or password to connect');

      // @TODO: Using `attach()` instead of `connect()` when we can
      // by storing the RID and SID in the localStorage for security
      // and performance reasons...since it would be possible to have
      // session persistence
      // @see: Professional XMPP p.377
      this._connection = new strophe.Connection(host);
      this._connection.connect(jid, password, this._connectionHandler);
    },

    _connectionHandler: function(status, error) {
      switch (status) {
        case strophe.Status.CONNECTED:
        case strophe.Status.ATTACHED:
          this._connection.send($pres().tree());

          this.state = 'connected';
          this.emit('connect', this._jid);
          break;
        case strophe.Status.AUTHFAIL:
        case strophe.Status.CONNFAIL:
        case strophe.Status.ERROR:
          throw new Error(status);
        default:
          return;
      }
    },

    send: function(dst, message) {
      if (this.state !== 'connected')
        throw new Error('XMPP transport layer not connected');
      
      var stanza = $msg({
        from: this._jid,
        to: dst,
        type: 'chat'
      }).c('body').cnode(strophe.copyElement(message));
      this._connection.send(stanza);
    },

    listen: function(fn, context) {
      if (this.state !== 'connected')
        throw new Error('XMPP transport layer not connected');
      
      context = context || this;
      var handler = function() {
        fn.apply(context, arguments);
      };
      this._connection.addHandler(handler, null, 'message'); 
    }

  });

})( 'object' === typeof module       ? module.exports : (this.KadOH = this.KadOH || {}), 
    'object' === typeof this.Strophe ? this.Strophe   : undefined);