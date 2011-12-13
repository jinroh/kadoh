// Dep: [strophejs]/strophe.rpc.js
// Dep: [strophejs]/strophe.disco.js
// Dep: [strophejs]/strophe
// Dep: [KadOH]/core/eventemitter
// Dep: [KadOH]/globals

(function(exports, Strophe) {

  if (!Strophe) {
    if ('object' == typeof console) 
      console.warn('WARNING : Strophe not defined : no transport');
    return;
  }

  Strophe.log = function(level, message) {
    switch (level) {
      case Strophe.LogLevel.WARN:
        console.warn(message);
        break;
      case Strophe.LogLevel.ERROR:
      case Strophe.LogLevel.FATAL:
        console.error(message);
        break;
      default:
        break;
    }
  };

  var KadOH        = exports,
      EventEmitter = KadOH.core.EventEmitter,
      globals      = KadOH.globals;
  
  var $msg  = function(attrs) { return new Strophe.Builder('message',  attrs); };
  var $pres = function(attrs) { return new Strophe.Builder('presence', attrs); };

  KadOH.transport = KadOH.transport || {};
  KadOH.transport.XMPP = EventEmitter.extend({

    initialize: function(host, options) {
      this.supr();
      this.setState('disconnected');

      this._host = host;

      this._jid      = Strophe.getBareJidFromJid(options.jid);
      this._password = options.password;

      if (!this._jid || !this._password)
        throw new Error('No JID or password to connect');

      this._jid = this._jid + '/' + globals.JID_RESOURCE;

      // @TODO: Using `attach()` instead of `connect()` when we can
      // by storing the RID and SID in the localStorage for security
      // and performance reasons...since it would be possible to have
      // session persistence
      // @see: Professional XMPP p.377
      this._connection = new Strophe.Connection(host);
      this.setStateAndEmit('connecting');

      var self = this;
      this.on('connect', function() {
        self._connection.send($pres().tree());
      });
    },

    connect: function() {
      var self = this;
      this._connection.connect(this._jid, this._password,
        function(status, error) {
          switch (status) {
            case Strophe.Status.CONNECTED:
            case Strophe.Status.ATTACHED:
              self.setStateAndEmit('connected', self._jid);
              break;
            case Strophe.Status.DISCONNECTING:
              self.setStateAndEmit('disconnecting');
              break;
            case Strophe.Status.DISCONNECTED:
              self.setStateAndEmit('disconnected');
              break;
            case Strophe.Status.AUTHFAIL:
            case Strophe.Status.CONNFAIL:
              self.setStateAndEmit('failed');
              break;
            case Strophe.Status.ERROR:
              throw error;
            default:
              return;
          }
        }
      );
    },

    send: function(to, message) {
      if (this.stateIsNot('connected'))
        throw new Error('XMPP transport layer not connected');

      var rpc = this._connection.rpc;
      if (message.isRequest()) {
        rpc.sendRequest(
          message.getRPCID(),
          to,
          message.getMethod(),
          message.getParams()
        );
      }
      else if (message.isResponse()) {
        rpc.sendResponse(
          message.getRPCID(),
          to,
          message.getResult()
        );
      }
      else if (message.isError()) {
        rpc.sendResponseError(
          message.getRPCID(),
          to,
          message.getError().code,
          message.getError().message
        );
      }
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
      this._connection.rpc.addHandlers(handler, handler, context);
    }

  });

})( 'object' === typeof module       ? module.exports : (this.KadOH = this.KadOH || {}), 
    'object' === typeof this.Strophe ? this.Strophe   : undefined);