var StateEventEmitter = require('../../util/state-eventemitter'),
    csock = (chrome.socket || chrome.experimental.socket);

var UDPChrome = module.exports = StateEventEmitter.extend({

  initialize: function(server_name, options) {
    this.supr();
    this._listening = false;
    this._socket = null;
    this._addr   = '127.0.0.1';
    this._port   = parseInt(options.port, 10) || 8000;
  },

  connect: function() {
    this._socket = csock.create('udp', { onEvent: this.listener.bind(this) }, this.onCreate.bind(this));
  },

  onCreate: function(createInfo) {
    this._socket = createInfo;
    if (createInfo.socketId > 0) {
      csock.connect(createInfo.socketId, this._addr, this._port, this.onConnect.bind(this));
    }
  },

  onConnect: function() {
    this.iam = this._socket.peerAddress + ':' + this._socket.peerPort;
    this.setState('connected', this.iam);
  },

  disconnect: function() {
    this._listening = false;
    this._handler   = null;
    this._context   = null;
    csock.disconnect(this._socket.socketId);
    this.setState('disconnected');
  },

  send: function(dst, message) {
    if (this.stateIsNot('connected')) {
      throw new Error('ChromeUDP transport layer not connected.');
    }
    var addr = dst.split(':'),
        self = this;
    csock.sendTo(self._socket.socketId, this._stringToArrayBuffer(message), addr[1], addr[0], function() {});
  },

  listen: function(fn, context) {
    if (this.stateIsNot('connected')) {
      throw new Error('ChromeUDP transport layer not connected.');
    }
    this._listening = true;
    this._handler = fn;
    this._context = context;
  },

  listener: function() {
    if (!this._listening) { return; }
    var self = this;
    csock.recvFrom(this._socket.socketId, function(infos) {
      self._handler.call(self._context || self, {
        dst : this.iam,
        src : infos.address + ':' + infos.port,
        msg : self._arrayBufferToString(infos.data)
      });
    });
  },

  _arrayBufferToString: function(buff) {
    return String.fromCharCode.apply(null, new Uint16Array(buff));
  },

  _stringToArrayBuffer: function(str) {
    var buff = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    var view = new Uint16Array(buff);
    for (var i = 0, len = str.length; i < len; i++) {
      view[i] = str.charCodeAt(i);
    }
    return buff;
  }
});
