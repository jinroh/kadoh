// Dep: [KadOH]/core/stateeventemitter
// Dep: [KadOH]/rpc/object/rpc

(function(exports) {

  var KadOH             = exports,
      StateEventEmitter = KadOH.core.StateEventEmitter,
      RPC               = KadOH.rpc.object.RPC;
    
  KadOH.rpc.Reactor = StateEventEmitter.extend({

    initialize: function(options) {
      this.supr();

      this.config = this.config || {};
      for (var option in options) {
        this.config[option] = options[option];
      }

      this._requests = {};
      this._startCleanup();
      this.setState('disconnected');

      this.RPCObject = {
        '__default' : RPC.extend({reactor : this})
      };
    },

    stop: function() {
      this._stopCleanup();
      this.disconnectTransport();
    },

    connectTransport: function() {
      //to be defined
      this.setState('connected');
    },

    disconnectTransport: function() {
      //to be defined
      this.setState('disconnected');
    },

    //Query out
    sendRPCQuery: function(rpc) {
      if (this.stateIsNot('connected')) {
        rpc.reject('transport not connected');
        KadOH.log.error('Reactor', 'send query : transport disconnected', rpc);
      }
      else {
        this._storeRequest(rpc);
        this.sendNormalizedQuery(rpc.normalizeQuery(), rpc.getQueried(), rpc);
        KadOH.log.debug('Reactor', 'send query', rpc.getMethod(), rpc.getQueried().getAddress(), rpc.normalizeQuery());
      }
      return this;
    },

    sendNormalizedQuery: function(query, dst_peer, rpc) {
      //to be defined
    },

    sendRPCResponse: function(rpc) {
      if(this.stateIsNot('connected')) {
        rpc.reject('transport not connected');
        KadOH.log.error('Reactor', 'send response : transport disconnected', rpc);
      } else {
        this.sendNormalizedResponse(rpc.normalizeResponse(), rpc.getQuerying(), rpc);
        KadOH.log.debug('Reactor', 'send response', rpc.getMethod(), rpc.getQuerying().getAddress(), rpc.normalizeResponse());
      }
      return this;
    },

    sendNormalizedResponse: function(response, dst_peer, rpc) {
      //to be defined
    },

    handleNormalizedQuery: function(query, from) {
      var method = (this.RPCObject.hasOwnProperty(query.method)) ? query.method : '__default';

      if(!this.RPCObject[method]) {
        KadOH.log.warn('Reactor', 'receive query method ' + query.method + ' not available');
        return;
      }
      
      var rpc = new this.RPCObject[method]();
      var respond = function() {
        this.sendResponse();
      };
      
      rpc.handleNormalizedQuery(query, from);
      KadOH.log.debug('Reactor', 'received query', rpc.getMethod(), from, query);

      //handler could have rejected the query
      if(!rpc.isRejected()) {
        this.emit('reached', rpc.getQuerying());
        this.emit('queried', rpc);
      }
      rpc.then(respond, respond);
    },

    handleNormalizedResponse: function(response, from) {
      var rpc = this._getRequestByID(response.id);

      if(!rpc) {
        KadOH.log.warn('Reactor', 'response matches no request', from, response);
      } else {
        KadOH.log.debug('Reactor', 'received response', rpc.getMethod(), from, response);
        rpc.handleNormalizedResponse(response, from);
      }
      return this;
    },

    _getRequestByID: function(id) {
      return this._requests[id];
    },

    _storeRequest: function(rpc) {
      this._requests[rpc.getID()] = rpc;
    },

    _startCleanup: function() {
      this._cleanupProcess = setInterval(function(self) {
        var requests = self._requests;
        for (var id in requests) {
          if (requests.hasOwnProperty(id)) {
            if (requests[id].isCompleted())
              delete requests[id];
          }
        }
      }, this.config.cleanup, this);
    },

    _stopCleanup: function() {
      clearInterval(this._cleanupProcess);
    }
  });

})('object' === typeof module ? module.exports : (this.KadOH = this.KadOH || {}));
