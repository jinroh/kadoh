// Dep: [KadOH]/core/class
// Dep: [KadOH]/transport/SimUDP
// Dep: [KadOH]/util/when
// Dep: [KadOH]/protocol/json-rpc2


(function(exports, when) {
  
  var KadOH = exports;
  var Class = KadOH.core.Class;
  var SimUDP = KadOH.transport.SimUDP;
  var globals = KadOH.globals;
  
  if (!when) {
    if ('object' === typeof console)
      console.warn('WARNING : when is not defined');
    return;
  }
  
  KadOH.Reactor = Class({
    
    initialize: function(protocol) {
      this._protocol = protocol;
      this._udp = SimUDP;
      
      // main loop
      this._udp.listen(this._handleRequest, this);
    },
    
    // Private
    
    _handleRequest: function(request) {
      console.log('RECV : ');
      console.log(request.msg);
      
      if(this._validRPC(request)) {
        this._sendRPC(request);
      }
    },
    
    _sendRPC: function(request) {
      var message = request.msg;
      
      // instanciate a new deferred object
      var deferred = when.defer();
      
      // the RPC to call
      var rpc = this._protocol[message.rpc];
      
      // the parameters followed by he deferred object to 
      // give to the Protocol object
      var params = message.params ? message.params.split('|') : [];
      params.unshift(deferred);
      
      var self = this;
      var datagram = {
        src: request.dst,
        dst: request.src
      };
      
      rpc.apply(this._protocol, params).then(
        function(data) {
          datagram.msg = data;
          self._udp.send(datagram);
        },
        function(err) {
          console.error(err);
        }
      );
    },
    
    _validRPC: function(request) {
      if (!this._validRequest(request)) {
        return false;
      }
      
      if (typeof request.msg !== 'object' ||
          typeof request.msg.rpc !== 'string') {
        return false;
      }
      
      if (globals._rpcs.indexOf(request.msg.rpc.toUpperCase()) === -1) {
        return false;
      }
      
      return true;
    },
    
    _validRequest: function(data) {
      if (typeof data.src !== 'string' ||
          typeof data.dst !== 'string' ||
          typeof data.msg === 'undefined') {
        return false;
      }
      return true;
    }
  });
})( 'object'   === typeof module    ? module.exports : (this.KadOH = this.KadOH || {}),
    'function' === typeof this.when ? this.when      : false                          );
