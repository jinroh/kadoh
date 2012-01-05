// Dep: [KadOH]/core/stateeventemitter
// Dep: [KadOH]/rpc/object/rpc

(function(exports) {

  var KadOH = exports;
  KadOH.rpc = KadOH.rpc || {};

  var StateEventEmitter = KadOH.core.StateEventEmitter,
      RPC               = KadOH.rpc.object.RPC;
    
  KadOH.rpc.Reactor = StateEventEmitter.extend({

    initialize: function() {
      this.supr();
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
      this.setState('disconnect');
    },

    //Query out
    sendRPCQuery: function(rpc) {
      if(this.stateIsNot('connected')) {
        rpc.reject('Transport not connected');
        KadOH.log.error('send RPCQuery : transport disconnect', rpc);
      } else {
        this._storeRequest(rpc);
        this.sendNormalizedQuery(rpc.normalizeQuery(), rpc.getQueried(), rpc);
        KadOH.log.info('send RPCQuery', rpc, rpc.normalizeQuery());
      }
      return this;
    },

    sendNormalizedQuery: function(query, dst_peer, rpc) {
      //to be defined
    },

    sendRPCResponse: function(rpc) {
      if(this.stateIsNot('connected')) {
        KadOH.log.error('send RPCResponse : transport disconnect', rpc);
      } else {
        this.sendNormalizedResponse(rpc.normalizeResponse(), rpc.getQuering(), rpc);
        KadOH.log.info('send RPCResponse', rpc, rpc.normalizeResponse());
      }
      return this;
    },

    sendNormalizedResponse: function(response, dst_peer, rpc) {
      //to be defined
    },

    handleNormalizedQuery: function(query, from) {
      var method = (this.RPCObject.hasOwnProperty(query.method)) ? query.method : '__default';

      if(!this.RPCObject[method]) {
        KadOH.log.info('receive query method '+query.method+' not available');
        return;
      } else {
        var rpc = new this.RPCObject[method]();
        rpc.handleNormalizedQuery(query, from);
        //handler could have rejected the query
        
        if(!rpc.isRejected()) {
          this.emit('reached', rpc.getQuering());
          this.emit('receive RPCQuery', rpc);
          KadOH.log.info('receive RPCQuery', rpc, query);
        }

        rpc.then(function() {
          this.sendResponse();
        }, function() {

          this.sendResponse();
        }, rpc);
      }
    },

    handleNormalizedResponse: function(response, from) {
      var rpc = this._getRequestById(response.id);

      if(typeof rpc == 'undefined')
        this.log.info('response matches no request', from, response);
      else {
        rpc.handleNormalizedResponse(response, from);
        KadOH.log.info('receive RPCResponse', rpc, response);
      }
      return this;
    },

    onRPCMessage: function() {
      //to be defined
    },


    _getRequestById: function(id) {
      return this._requests[id];
    },
    _storeRequest: function(rpc) {
      this._requests[rpc.getId()] = rpc;
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
