var StateEventEmitter = require('../../util/state-eventemitter'),
    csock = (chrome.socket || chrome.experimental.socket);

var UDPChrome = module.exports = StateEventEmitter.extend({

  initialize: function(server_name, options) {
    this.supr();
    this._listening = false;
    this._socket = null
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
    this._stringToArrayBuffer(message, function(buff) {
      csock.sendTo(self._socket.socketId, buff, addr[1], addr[0], function() {});
    });
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
      self._arrayBufferToString(infos.data, function(msg) {
        self._handler.call(self._context || self, {
          dst : this.iam,
          src : infos.address + ':' + infos.port,
          msg : msg
        });
      });
    });
  },

  _arrayBufferToString = function(buf, callback) {
    var bb = new Blob([new Uint8Array(buf)]);
    var f = new FileReader();
    f.onload = function(e) { callback(e.target.result); };
    f.readAsText(bb);
  },

  _stringToArrayBuffer = function(str, callback) {
    var bb = new Blob([str]);
    var f = new FileReader();
    f.onload = function(e) { callback(e.target.result); };
    f.readAsArrayBuffer(bb);
  }
});
