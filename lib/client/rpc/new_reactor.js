// Dep: [KadOH]/core/stateeventemitter
// Dep: [KadOH]/rpc/object/rpc

(function(exports) {

  var KadOH = exports;

  var StateEventEmitter = KadOH.core.StateEventEmitter,
      RPC               = KadOH.rpc.object.RPC;

  KadOH.Reactor = StateEventEmitter.extend({

    initialize: function() {
      this._requests = {};
      this._startCleanup();
      this.setState('disconnected');

      this._RPCObject = {
        '__default' : RPC.extend({reactor : this})
      };
    },

    stop: function() {
      this._stopCleanup();
      this.disconnect();
    },

    connect: function() {
      //to be defined
      this.setState('connected');
    },

    disconnect: function() {
      //to be defined
      this.setState('disconnect');
    },

    //Query out
    sendRPCQuery: function(rpc) {
      if(this.stateIsNot('connected')) {
        rpc.reject('Transport not connected');
        this.emit('FAIL send RPCQuery', rpc);
        return this;
      } else {
        this._storeRequest(rpc);
        this.sendNormalizedQuery(this.normalizeQuery(), this.getQueried());
        this.emit('send RPCQuery', rpc);
        return this;
      }
    },

    sendNormalizedQuery: function(query, dst_peer) {
      //to be defined
    },

    sendRPCResponse: function(rpc) {
      if(this.stateIsNot('connected')) {
        this.emit('FAIL send RPCResponse', rpc);
        return this;
      } else {
        this.sendNormalizedRPCResponse(this.normalizeResponse(), this.getQuering());
        this.emit('send RPCResponse', rpc);
      }
    },

    sendNormalizedRPCResponse: function(response, dst_peer) {
      //to be defined
    },

    handleNormalizedQuery: function(query, from) {
      var name = (this._RPCObject.hasOwnProperty(query.method)) ? query.method : '__default';

      if(typeof this._RPCObject(name) == 'undefined') {
        this.emit('no method '+query.method);
        return;
      } else {
        var rpc = this._RPCObject(name).parseQuery(query, from);
        var self = this;
        rpc.then(function(){
          this.sendResponse();
        }, function(){
          this.sendResponse();
        });
        this.emit('receive RPCQuery', rpc);
      }
    },

    handleNormalizedResponse: function(response, from) {
      var rpc = this._getRequestById(response.id);

      if(typeof rpc == 'undefined')
        this.emit('response matches no request', from, response);
      else
        rpc.handleNormalizedResponse(response);
      return this;
    },

    onRPCMessage: function() {
      //to be defined
    },


    _getRequestById: function(id) {
      return this._requests[id];
    },
    _storeRequest: function(rpc) {
      this._requests[request.getId()] = request;
    },


    _cleanup_interval: 30*1000,

    _startCleanup: function() {
      this._cleanupProcess = setInterval(function(self) {
        var requests = self._requests;
        for (var id in requests) {
          if (requests.hasOwnProperty(id)) {
            if (requests[id].isCompleted())
              delete requests[id];
          }
        }
      }, this._cleanup_interval, this);
    },

    _stopCleanup: function() {
      clearInterval(this._cleanupProcess);
    }
  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
