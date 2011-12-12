// Dep: [strophejs]/strophe
// Dep: [KadOH]/core/eventemitter

(function(exports, strophe) {

  if (!strophe) {
    if ('object' == typeof console) 
      console.warn('WARNING : strophe not defined : no transport');
    return;
  }

  strophe.log = function(level, message) {
    switch (level) {
      case strophe.LogLevel.WARN:
        console.warn(message);
        break;
      case strophe.LogLevel.ERROR:
      case strophe.LogLevel.FATAL:
        console.error(message);
        break;
      default:
        break;
    }
  };

  var KadOH        = exports,
      EventEmitter = KadOH.core.EventEmitter;
  
  var $msg  = function(attrs) { return new strophe.Builder('message',  attrs); };
  var $pres = function(attrs) { return new strophe.Builder('presence', attrs); };

  KadOH.transport = KadOH.transport || {};
  KadOH.transport.XMPP = EventEmitter.extend({

    initialize: function(host, options) {
      this.supr();
      this.setState('disconnected');

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
    },

    connect: function() {
      var self = this;
      this._connection.connect(
        this._jid,
        this._password,
        function(status, error) {
          switch (status) {
            case strophe.Status.CONNECTED:
            case strophe.Status.ATTACHED:
              self.setState('connected');
              self.emit('connect', self._jid);

              self._connection.send($pres().tree());
              break;
            case strophe.Status.AUTHENTICATED:
            case strophe.Status.AUTHFAIL:
            case strophe.Status.CONNFAIL:
            case strophe.Status.ERROR:
              throw new Error(status);
            default:
              return;
          }
        }
      );
    },

    send: function(dst, message) {
      if (this.state !== 'connected')
        throw new Error('XMPP transport layer not connected');
      
      var stanza = $msg({
        from: this._jid,
        to: dst,
        type: 'chat'
      }).c('body');

      if ('function' === typeof message.stringify) {
        message = message.stringify();
      }

      if (message instanceof Document)
        stanza.cnode(strophe.copyElement(message.documentElement));
      else if (message instanceof Element)
        stanza.cnode(strophe.copyElement(message));
      else
        stanza.t(JSON.stringify(message));

      this._connection.send(stanza.tree());
    },

    listen: function(fn, context) {
      if (this.state !== 'connected')
        throw new Error('XMPP transport layer not connected');
      
      context = context || this;
      var handler = function(doc) {
        var msg, src;
        try {
          // @TODO: use XML-RPC instead
          var body = doc.getElementsByTagName('body')[0];
          msg = body ? JSON.parse(body.textContent) : null;
          src = doc.getAttribute('from');
        }
        catch(e) {
          console.warn('unable to parse an incoming message', e, doc);
        }
        
        if (msg && src) {
          fn.call(context, {
            src: src,
            msg: msg
          });
        }
        return true;
      };
      this._connection.addHandler(handler, null, 'message');
    },

    pause: function() {
      return this._connection.pause();
    },

    resume: function() {
      return this._connection.resume();
    }

  });

})( 'object' === typeof module       ? module.exports : (this.KadOH = this.KadOH || {}), 
    'object' === typeof this.Strophe ? this.Strophe   : undefined);