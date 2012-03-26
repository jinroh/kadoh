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
        KadOH.log.error(message);
        break;
      case Strophe.LogLevel.FATAL:
        KadOH.log.fatal(message);
        break;
      default:
        // KadOH.log.debug(message);
        break;
    }
  };

  var $msg  = function(attrs) { return new Strophe.Builder('message',  attrs); };
  var $pres = function(attrs) { return new Strophe.Builder('presence', attrs); };

  KadOH.transport = KadOH.transport || {};
  KadOH.transport.XMPP = StateEventEmitter.extend({

    initialize: function(host, options) {
      this.supr();

      this._host       = host || globals.BOSH_SERVER;
      this._jid        = Strophe.getBareJidFromJid(options.jid) + '/' +
                         (options.resource || globals.JID_RESOURCE);
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
      this.setState('connecting', this._host, this._jid);

      this._connection = new Strophe.Connection(this._host);

      this._connection.rawInput = function(data) {
        self.emit('data-in', data);
      };

      this._connection.rawOutput = function(data) {
        self.emit('data-out', data);
      };

      var onConnect = function(status, error) {
        switch (status) {
          case Strophe.Status.CONNECTED:
          case Strophe.Status.ATTACHED:
            self._jid = self._connection.jid;
            self._setConnCookies();
            self._connection._notifyIncrementRid = function(rid) {
              self._setConnCookies();
            };
            self.setState('connected', self._connection.jid);
            break;
          case Strophe.Status.DISCONNECTING:
            self.setState('disconnecting');
            break;
          case Strophe.Status.DISCONNECTED:
            self._deleteConnCookies();
            self.setState('disconnected');
            break;
          case Strophe.Status.AUTHFAIL:
          case Strophe.Status.CONNFAIL:
            self._deleteConnCookies();
            self.setState('failed', error);
            break;
          case Strophe.Status.ERROR:
            throw error;
          default:
            return;
        }
      };
      
      var prev_session = this._getConnCookies();

      if(prev_session.sid !== null && prev_session.rid !== null) {
        KadOH.log.info('Transport', 'try connection attach');

        this._connection.attach(this._jid, prev_session.sid, prev_session.rid,
          function(status, error) {
            if(status === Strophe.Status.ATTACHED) {
              self._connection.send($pres().tree());

              setTimeout(function() {
                if(!self._connection.connected) {
                  KadOH.log.info('Attach failed : trying normal connect');

                  self._connection.connect(self._jid, self._password, function(status, error) {
                    if(status === Strophe.Status.CONNECTED) {
                      self._connection.send($pres().tree());
                    }
                    onConnect(status, error);
                  });
                }
              }, 4000);
              //self._connection.connect(self._jid, self._password, onConnect);
            }
            onConnect(status, error);
        });
      } else {
        this._connection.connect(this._jid, this._password, function(status, error) {
          if(status === Strophe.Status.CONNECTED) {
            self._connection.send($pres().tree());
          }
          onConnect(status, error);
        });
      }
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
        fn.call(context, {
          dst: iq.getAttribute('to'),
          src: iq.getAttribute('from'),
          msg: iq
        });
        return true;
      };
      this._connection.rpc.addXMLHandler(handler, context);
    },

    _setConnCookies: function() {
      var exp = (new Date((Date.now()+90*1000))).toGMTString();
      document.cookie = '_strophe_sid_'+this._jid+'='+String(this._connection.sid)+'; expires='+exp;
      document.cookie = '_strophe_rid_'+this._jid+'='+String(this._connection.rid)+'; expires='+exp;
    },

    _deleteConnCookies : function() {
      document.cookie = '_strophe_sid_'+this._jid+'='+'foo'+'; expires=Thu, 01-Jan-1970 00:00:01 GMT';
      document.cookie = '_strophe_rid_'+this._jid+'='+'bar'+'; expires=Thu, 01-Jan-1970 00:00:01 GMT';
    },

    _getConnCookies: function() {
      var sid_match = (new RegExp('_strophe_sid_'+this._jid+"=([^;]*)", "g")).exec(document.cookie);
      var rid_match = (new RegExp('_strophe_rid_'+this._jid+"=([^;]*)", "g")).exec(document.cookie);

      return {
        sid : (sid_match !== null) ? sid_match[1] : null,
        rid : (rid_match !== null) ? rid_match[1] : null
      };
    }

  });

})( 'object' === typeof module       ? module.exports : (this.KadOH = this.KadOH || {}),
    'object' === typeof this.Strophe ? this.Strophe   : undefined);