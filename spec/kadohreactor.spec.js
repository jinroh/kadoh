describe('in Reactor', function() {
  beforeEach(function() {
    Peer      = KadOH.Peer;
    PeerArray = KadOH.PeerArray;

    //mocking
    Reactor = KadOH.rpc.KadOHReactor.extend({
      connectTransport: function() {
        this.setState('connected');
      },
      disconnectTransport: function() {
        this.setState('disconnect');
      },
      sendNormalizedQuery: function(query, dst_peer, rpc) {},
      sendNormalizedResponse: function(response, dst_peer, rpc) {}
    });

    KadOH.rpc.protocol.test = 'test';
    KadOH.transport.test = function() {};

    node = {
      me : new Peer('me@me.me', 'a2cfd6254f8dcfa189b0c1142056df9d3daca861'),

      getMe : function() {
        return this.me;
      }
    };
    R = new Reactor(node, {protocol : 'test', type : 'test'});
    R.connectTransport();

    reached_cb = jasmine.createSpy();
    R.on('reached', reached_cb, this);

    // KadOH.log.addLogger('ConsoleLogger');
    // KadOH.log.subscribeTo(R);
  });

  afterEach(function() {
    R.stop();
  });

  it('should be object', function(){
    expect(typeof R).toEqual('object');
  });

  /**-----------PING----------------**/

  describe('PING', function() {
    describe('when sending', function() {
      beforeEach(function() {
        spyOn(R, 'sendNormalizedQuery');
        you = new Peer('you@you.me','b2cfd6254f8dcfa189b0c1142056df9d3daca861');
        rpc = R.sendRPC(you ,'PING');
      });

      it('should have been sent' ,function() {
        expect(R.sendNormalizedQuery).toHaveBeenCalled();
        var args = R.sendNormalizedQuery.mostRecentCall.args;
        expect(args[1].getAddress()).toEqual('you@you.me');
        expect(args[0].method).toEqual('PING');
        expect(args[0].params[0].id).toEqual('a2cfd6254f8dcfa189b0c1142056df9d3daca861');
        expect(args[0].id).toEqual(rpc.getID());
      });

      describe('when receive a response result', function() {
        beforeEach(function() {
          cb = jasmine.createSpy();
          R.on('reached', cb);
          rpc.then(cb, this);
          R.handleNormalizedResponse({
            id : rpc.getID(),
            result : {id : 'b2cfd6254f8dcfa189b0c1142056df9d3daca861'}
          },'you@you.me');
        });

        it('should be resolved', function() {
          expect(cb).toHaveBeenCalled();
          expect(cb.mostRecentCall.args.length).toEqual(0);
        });

        it('should emit reached event', function() {
          expect(reached_cb).toHaveBeenCalled();
          expect(reached_cb.mostRecentCall.args[0].equals(you)).toBeTruthy();
        });

        it('should emit reached before being resolved', function() {
          expect(cb.argsForCall[0]).toEqual([you]);
          expect(cb.argsForCall[1]).toEqual([]);
        });
      });

      describe('when receive a response error',function() {
        beforeEach(function() {
          var spy = jasmine.createSpy();
          rpc.addErrback(spy, this);
          R.handleNormalizedResponse({
            id : rpc.getID(),
            error : 'error'
          },'you@you.me');
        });
        it('should be rejected', function() {
          expect(spy).toHaveBeenCalled();
        });
      });

      describe('when i receive a response from a different peer (spoofing prevention)', function(){
        beforeEach(function() {
          R.handleNormalizedResponse({
            id : rpc.getID(),
            error : 'error'
          },'NASTY_BOY@you');
        });
        it('should be ignored', function() {
          expect(rpc.getState()).toEqual('progress');
        });
        it('but resolved later if OK', function() {
          cb = jasmine.createSpy();
          rpc.then(cb, this);
          R.handleNormalizedResponse({
            id : rpc.getID(),
            result : {id : 'b2cfd6254f8dcfa189b0c1142056df9d3daca861'}
          },'you@you.me');
          expect(cb).toHaveBeenCalled();
        });
      });

      describe('when i receive a response with an outdated id', function() {
        beforeEach(function() {
          outdated_cb = jasmine.createSpy();
          R.on('outdated', outdated_cb, this);
          R.handleNormalizedResponse({
            id : rpc.getID(),
            result : {id : 'f2cfd6254f8dcfa189b0c1142056df9d3daca861'}
          },'you@you.me');
        });

        it('should have emited outdated event', function() {
          expect(outdated_cb).toHaveBeenCalledWith(you, 'f2cfd6254f8dcfa189b0c1142056df9d3daca861');
        });
      });

      it('should timeout after a while', function() {
        var spy = jasmine.createSpy();
        rpc.addErrback(spy, this);
        waits(KadOH.globals.TIMEOUT_RPC + 500);
        runs(function() {
          expect(spy).toHaveBeenCalled();
        });
      });
    });

    describe('when sending but i dont know the id (bootstrap)', function() {
      beforeEach(function() {
        you = new Peer('you@you.me',null);
        rpc = R.sendRPC(you ,'PING');
      });
      describe('when receiving a response', function() {
        beforeEach(function() {
          reached_cb = jasmine.createSpy();
          R.on('reached', reached_cb);
          R.handleNormalizedResponse({
            id : rpc.getID(),
            result : {id : 'b2cfd6254f8dcfa189b0c1142056df9d3daca861'}
          },'you@you.me');
        });
        it('should emit a reached event with the right id', function() {
          expect(reached_cb).toHaveBeenCalled();
          expect(reached_cb.mostRecentCall.args[0].equals(you)).toBeTruthy();
        });
      });
    });

    describe('when receiving', function() {
      beforeEach(function() {
        spyOn(R, 'sendNormalizedResponse');
        handler = jasmine.createSpy();
        R.on('queried', handler, this);

        R.handleNormalizedQuery({
          id : 'lu',
          method : 'PING',
          params : [{id : 'b2cfd6254f8dcfa189b0c1142056df9d3daca861'}]
        }, 'you@you.me');

        you = new Peer('you@you.me', 'b2cfd6254f8dcfa189b0c1142056df9d3daca861');
      });

      it('should have been parsed', function() {
        expect(handler).toHaveBeenCalled();
        var rpc = handler.mostRecentCall.args[0];
        //expect(rpc).toBeInstanceof(KadOH.rpc.object.PingRPC); //trigger cycling
        expect(rpc instanceof KadOH.rpc.object.PingRPC).toBeTruthy();
        expect(rpc.getID()).toEqual('lu');
        expect(rpc.getMethod()).toEqual('PING');
        expect(rpc.getQuerying().getID()).toEqual(you.getID());
        expect(rpc.getQuerying().getAddress()).toEqual(you.getAddress());
      });

      it('should emit reached event', function() {
          expect(reached_cb).toHaveBeenCalled();
          expect(reached_cb.mostRecentCall.args[0].equals(you)).toBeTruthy();
      });

      describe('when i resolve it', function() {
        beforeEach(function() {
        rpc = handler.mostRecentCall.args[0];
        rpc.resolve();
        });

        it('should be a response sent', function() {
          expect(R.sendNormalizedResponse).toHaveBeenCalled();
          res = R.sendNormalizedResponse.mostRecentCall.args[0];
          dst = R.sendNormalizedResponse.mostRecentCall.args[1];

          expect(dst.equals(you)).toBeTruthy();
          expect(res.id).toEqual(rpc.getID());
          expect(res.result.id).toEqual('a2cfd6254f8dcfa189b0c1142056df9d3daca861');
        });
      });

      describe('when i reject it', function() {
        beforeEach(function() {
        rpc = handler.mostRecentCall.args[0];
        rpc.reject();
        });

        it('should be a response sent', function() {
          expect(R.sendNormalizedResponse).toHaveBeenCalled();
          res = R.sendNormalizedResponse.mostRecentCall.args[0];
          dst = R.sendNormalizedResponse.mostRecentCall.args[1];

          expect(dst.equals(you)).toBeTruthy();
          expect(res.id).toEqual(rpc.getID());
          expect(res.error).toBeDefined();
        });
      });
    });
  });

  /**-----------FIND_NODE--------------**/

    describe('FIND_NODE', function() {
    describe('when sending', function() {
      beforeEach(function() {
        target = '0d8694139e9fa9f49b683876b99ce958b234ca22';
        spyOn(R, 'sendNormalizedQuery');
        you = new Peer('you@you.me','b2cfd6254f8dcfa189b0c1142056df9d3daca861');
        rpc = R.sendRPC(you ,'FIND_NODE', target);
      });

      it('should have been sent' ,function() {
        expect(R.sendNormalizedQuery).toHaveBeenCalled();
        var args = R.sendNormalizedQuery.mostRecentCall.args;
        expect(args[1].getAddress()).toEqual('you@you.me');
        expect(args[0].method).toEqual('FIND_NODE');
        expect(args[0].params[0].id).toEqual('a2cfd6254f8dcfa189b0c1142056df9d3daca861');
        expect(args[0].params[0].target).toEqual(target);
        expect(args[0].id).toEqual(rpc.getID());
      });

      describe('when receive a response result', function() {
        beforeEach(function() {
          cb = jasmine.createSpy();
          R.on('reached', cb);
          rpc.then(cb, this);
          R.handleNormalizedResponse({
            id : rpc.getID(),
            result : {
              id : 'b2cfd6254f8dcfa189b0c1142056df9d3daca861',
              nodes : [
                ['axel@him.him', 'c97013ab971561ce573dc061d36504b85da9328e'],
                ['francoise@her.her','ebbd7f3e89354ac25411b29cbfd08b2f7c3b03c0']
              ]
            }
          },'you@you.me');
        });

        it('should be resolved', function() {
          expect(cb).toHaveBeenCalled();
          var peers = cb.mostRecentCall.args[0];
          expect(peers.length()).toEqual(2);
          var axel = new Peer(['axel@him.him', 'c97013ab971561ce573dc061d36504b85da9328e']);
          var francoise = new Peer(['francoise@her.her','ebbd7f3e89354ac25411b29cbfd08b2f7c3b03c0']);
          expect(peers.contains(axel)).toBeTruthy();
          expect(peers.contains(francoise)).toBeTruthy();
        });

        it('should emit reached event', function() {
          expect(reached_cb).toHaveBeenCalled();
          expect(reached_cb.mostRecentCall.args[0].equals(you)).toBeTruthy();
        });

        it('should emit reached before being resolved', function() {
          expect(cb.argsForCall[0][0]).toEqual(you);
          expect(cb.argsForCall[1][0] instanceof PeerArray).toBeTruthy();
        });
      });

      describe('when receive a response error',function() {
        beforeEach(function() {
          var spy = jasmine.createSpy();
          rpc.addErrback(spy, this);
          R.handleNormalizedResponse({
            id : rpc.getID(),
            error : 'error'
          },'you@you.me');
        });
        it('should be rejected', function() {
          expect(spy).toHaveBeenCalled();
        });
      });

      describe('when i receive a response from a different peer (spoofing prevention)', function(){
        beforeEach(function() {
          R.handleNormalizedResponse({
            id : rpc.getID(),
            error : 'error'
          },'NASTY_BOY@you');
        });
        it('should be ignored', function() {
          expect(rpc.getState()).toEqual('progress');
        });
        it('but resolved later if OK', function() {
          cb = jasmine.createSpy();
          rpc.then(cb, this);
          R.handleNormalizedResponse({
            id : rpc.getID(),
            result : {
              id : 'b2cfd6254f8dcfa189b0c1142056df9d3daca861',
              nodes : [
                ['axel@him.him', 'c97013ab971561ce573dc061d36504b85da9328e'],
                ['francoise@her.her','ebbd7f3e89354ac25411b29cbfd08b2f7c3b03c0']
              ]
            }
          },'you@you.me');
          expect(cb).toHaveBeenCalled();
        });
      });

      describe('when i receive a response with an outdated id', function() {
        beforeEach(function() {
          outdated_cb = jasmine.createSpy();
          R.on('outdated', outdated_cb, this);
          R.handleNormalizedResponse({
            id : rpc.getID(),
            result : {
              id : 'f2cfd6254f8dcfa189b0c1142056df9d3daca861',
              nodes : [
                ['axel@him.him', 'c97013ab971561ce573dc061d36504b85da9328e'],
                ['francoise@her.her','ebbd7f3e89354ac25411b29cbfd08b2f7c3b03c0']
              ]}
          },'you@you.me');
        });

        it('should have emited outdated event', function() {
          expect(outdated_cb).toHaveBeenCalledWith(you, 'f2cfd6254f8dcfa189b0c1142056df9d3daca861');
        });
      });

      it('should timeout after a while', function() {
        var spy = jasmine.createSpy();
        rpc.addErrback(spy, this);
        waits(KadOH.globals.TIMEOUT_RPC + 500);
        runs(function() {
          expect(spy).toHaveBeenCalled();
        });
      });
    });

    describe('when receiving', function() {
      beforeEach(function() {
        spyOn(R, 'sendNormalizedResponse');
        handler = jasmine.createSpy();
        R.on('queried', handler, this);
        target = '0d8694139e9fa9f49b683876b99ce958b234ca22';

        R.handleNormalizedQuery({
          id : 'lu',
          method : 'FIND_NODE',
          params : [{id : 'b2cfd6254f8dcfa189b0c1142056df9d3daca861',
          target : target}]
        }, 'you@you.me');

        you = new Peer('you@you.me', 'b2cfd6254f8dcfa189b0c1142056df9d3daca861');
      });

      it('should have been parsed', function() {
        expect(handler).toHaveBeenCalled();
        var rpc = handler.mostRecentCall.args[0];
        //expect(rpc).toBeInstanceof(KadOH.rpc.object.FindNodeRPC); //trigger cycling
        expect(rpc instanceof KadOH.rpc.object.FindNodeRPC).toBeTruthy();
        expect(rpc.getID()).toEqual('lu');
        expect(rpc.getMethod()).toEqual('FIND_NODE');
        expect(rpc.getTarget()).toEqual(target);
        expect(rpc.getQuerying().getID()).toEqual(you.getID());
        expect(rpc.getQuerying().getAddress()).toEqual(you.getAddress());
        expect(rpc.getTarget()).toEqual(target);
      });

      it('should emit reached event', function() {
          expect(reached_cb).toHaveBeenCalled();
          expect(reached_cb.mostRecentCall.args[0].equals(you)).toBeTruthy();
      });

      describe('when i resolve it', function() {
        beforeEach(function() {
        peers = new PeerArray([new Peer(['axel@him.him', 'c97013ab971561ce573dc061d36504b85da9328e']),
        new Peer(['francoise@her.her','ebbd7f3e89354ac25411b29cbfd08b2f7c3b03c0'])]);
        rpc = handler.mostRecentCall.args[0];
        rpc.resolve(peers);
        });

        it('should be a response sent', function() {
          expect(R.sendNormalizedResponse).toHaveBeenCalled();
          res = R.sendNormalizedResponse.mostRecentCall.args[0];
          dst = R.sendNormalizedResponse.mostRecentCall.args[1];

          expect(dst.equals(you)).toBeTruthy();
          expect(res.id).toEqual(rpc.getID());
          expect(res.result.id).toEqual('a2cfd6254f8dcfa189b0c1142056df9d3daca861');
          expect(res.result.nodes).toEqual(peers.getTripleArray());
        });
      });

      describe('when i reject it', function() {
        beforeEach(function() {
        rpc = handler.mostRecentCall.args[0];
        rpc.reject();
        });

        it('should be a response sent', function() {
          expect(R.sendNormalizedResponse).toHaveBeenCalled();
          res = R.sendNormalizedResponse.mostRecentCall.args[0];
          dst = R.sendNormalizedResponse.mostRecentCall.args[1];

          expect(dst.equals(you)).toBeTruthy();
          expect(res.id).toEqual(rpc.getID());
          expect(res.error).toBeDefined();
        });
      });
    });
  });

});