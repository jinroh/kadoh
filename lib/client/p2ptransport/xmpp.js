// Dep: [strophejs]/strophe.rpc.js
// Dep: [strophejs]/strophe.disco.js
// Dep: [strophejs]/strophe
// Dep: [KadOH]/core/stateeventemitter
// Dep: [KadOH]/globals

(function(exports, Strophe) {

  var KadOH             = exports,
      StateEventEmitter = KadOH.core.StateEventEmitter,
      globals           = KadOH.globals;
  
  if (!Strophe) {
    KadOH.log.warn('Strophe not defined : no transport');
    return;
  }

  Strophe.log = function(level, message) {
    switch (level) {
      case Strophe.LogLevel.WARN:
        KadOH.log.warn(message);
        break;
      case Strophe.LogLevel.ERROR:
      case Strophe.LogLevel.FATAL:
        KadOH.log.error(message);
        break;
      default:
        break;
    }
  };

  var $msg  = function(attrs) { return new Strophe.Builder('message',  attrs); };
  var $pres = function(attrs) { return new Strophe.Builder('presence', attrs); };

  KadOH.transport = KadOH.transport || {};
  KadOH.transport.XMPP = StateEventEmitter.extend({

    initialize: function(host, options) {
      this.supr();

      this._host       = host;
      this._jid        = Strophe.getBareJidFromJid(options.jid) +
                         '/' + globals.JID_RESOURCE;
      this._password   = options.password;
      this._connection = null;

      this.setState('disconnected');
      if (!this._jid || !this._password)
        throw new Error('No JID or password to connect');
    },

    // @TODO: Using `attach()` instead of `connect()` when we can
    // by storing the RID and SID in the localStorage for security
    // and performance reasons...since it would be possible to have
    // session persistence
    // @see: Professional XMPP p.377
    connect: function() {
      var self = this;
      this.setState('connecting', this._host, this._jid, this._password);

      this._connection = new Strophe.Connection(this._host);
      this.on('connected', function() {
        self._connection.send($pres().tree());
      });

      this._connection.connect(this._jid, this._password,
        function(status, error) {
          switch (status) {
            case Strophe.Status.CONNECTED:
            case Strophe.Status.ATTACHED:
              self.setState('connected', self._connection.jid);
              break;
            case Strophe.Status.DISCONNECTING:
              self.setState('disconnecting');
              break;
            case Strophe.Status.DISCONNECTED:
              self.setState('disconnected');
              break;
            case Strophe.Status.AUTHFAIL:
            case Strophe.Status.CONNFAIL:
              self.setState('failed', error);
              break;
            case Strophe.Status.ERROR:
              throw error;
            default:
              return;
          }
        }
      );
    },

    disconnect: function() {
      this._connection.disconnect();
    },

    send: function(to, message) {
      if (this.stateIsNot('connected'))
        throw new Error('XMPP transport layer not connected');
      
      this._connection.rpc.sendXMLElement(
        message.getRPCID(),
        to,
        message.isRequest() ? 'set' : 'result',
        message.stringify()
      );
    },

    listen: function(fn, context) {
      if (this.stateIsNot('connected'))
        throw new Error('XMPP transport layer not connected');
      
      context = context || this;
      var handler = function(iq) {
        fn.call(this, {
          dst: iq.getAttribute('to'),
          src: iq.getAttribute('from'),
          msg: iq
        });
        return true;
      };
      this._connection.rpc.addXMLHandler(handler, context);
    }

  });

})( 'object' === typeof module       ? module.exports : (this.KadOH = this.KadOH || {}), 
    'object' === typeof this.Strophe ? this.Strophe   : undefined);