var StateEventEmitter = require('../../util/state-eventemitter'),
    globals           = require('../../globals');

require('Strophe.js'); //available as Strophe global variable
require('./strophe.disco.js');
require('./strophe.rpc.js');

var log = require('../../logging').ns('Transport');

Strophe.log = function(level, message) {
  switch (level) {
    case Strophe.LogLevel.WARN:
      log.warn(message);
      break;
    case Strophe.LogLevel.ERROR:
      log.error(message);
      break;
    case Strophe.LogLevel.FATAL:
      log.fatal(message);
      break;
    default:
      // log.debug(message);
      break;
  }
};

var $msg  = function(attrs) { return new Strophe.Builder('message',  attrs); };
var $pres = function(attrs) { return new Strophe.Builder('presence', attrs); };

var StropheTransport = module.exports = StateEventEmitter.extend({

  initialize: function(host, options) {
    this.supr();

    var jid = Strophe.getBareJidFromJid(options.jid);
    if (jid === null) {
      throw new Error('No JID provided to connect.');
    }

    // Anonymous login
    if (!options.password) {
      this._jid = Strophe.getDomainFromJid(jid);
      this._password = null;
    } else {
      this._jid = jid + '/' + (options.resource || globals.JID_RESOURCE);
      this._password = options.password;
    }

    this._host = host || globals.BOSH_SERVER;
    this._connection = null;
    this.setState('disconnected');
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
      log.info('try connection attach');

      this._connection.attach(this._jid, prev_session.sid, prev_session.rid,
        function(status, error) {
          if(status === Strophe.Status.ATTACHED) {
            self._connection.send($pres().tree());

            setTimeout(function() {
              if(!self._connection.connected) {
                log.info('Attach failed : trying normal connect');

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

  send: function(to, encoded, normalized) {
    if (this.stateIsNot('connected'))
      throw new Error('XMPP transport layer not connected');
    
    this._connection.rpc.sendXMLElement(
      normalized.id,
      to,
      normalized.type === 'request' ? 'set' : 'result',
      encoded
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