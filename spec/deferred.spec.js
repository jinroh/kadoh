describe('Deferred', function() {

  var Deferred, def, success, failure;

  beforeEach(function() {
    Deferred = KadOH.core.Deferred;
    def = new Deferred();
    success = jasmine.createSpy();
    failure = jasmine.createSpy();
  });

  it('should be a function', function() {
    expect(Deferred).toBeFunction();
    expect(def).toBeObject();
    expect(def.then).toBeFunction();
  });

  describe('in a resolve state', function() {

    beforeEach(function() {
      def.addCallback(success);
      expect(def.isResolved()).toBeFalsy();
    });

    it('should resolve with the good arguments', function() {
      def.resolve('foo', 'bar');
      expect(def.isResolved()).toBeTruthy();
      expect(success).toHaveBeenCalledWith('foo', 'bar');
    });

    it('should be possible to get passed arguments', function(){
      def.resolve('foo', 'bar');
      expect(def.getResolvePassedArgs()).toEqual(['foo', 'bar']);
    });
    
    it('should not be resolve twice', function() {
      def.resolve().resolve();
      expect(success).toHaveBeenCalled();
      expect(success.callCount).toBe(1);
    });

    it('should execute callbacks event after being resolved', function() {
      def.resolve();
      def.addCallback(success);
      expect(success).toHaveBeenCalled();
    });

    it('should properly cancel', function() {
      def.addCallback(success);
      def.cancel();
      def.addCallback(failure);
      def.resolve();
      expect(success).not.toHaveBeenCalled();
      expect(failure).not.toHaveBeenCalled();
    });

  });
  
  describe('in a reject state', function() {
    
    beforeEach(function() {
      def.addErrback(failure);
      expect(def.isRejected()).toBeFalsy();
    });

    it('should reject with the good arguments', function() {
      def.reject('foo', 'bar');
      expect(def.isRejected()).toBeTruthy();
      expect(failure).toHaveBeenCalledWith('foo', 'bar');
    });

    it('should be possible to get passed arguments', function(){
      def.reject('foo', 'bar');
      expect(def.getRejectPassedArgs()).toEqual(['foo', 'bar']);
    });

    it('should not be reject twice', function() {
      def.reject().reject();
      expect(failure).toHaveBeenCalled();
      expect(failure.callCount).toBe(1);
    });

    it('should execute callbacks event after being rejected', function() {
      def.reject();
      def.addErrback(failure);
      expect(failure).toHaveBeenCalled();
    });

    it('should properly cancel', function() {
      def.addErrback(success);
      def.cancel();
      def.addErrback(failure);
      def.resolve();
      expect(success).not.toHaveBeenCalled();
      expect(failure).not.toHaveBeenCalled();
    });

  });

  describe('context of execution', function() {
    
    it('should resolve in the good context', function() {
      var that = {};
      def.then(success, failure, that);
      def.resolve();
      expect(success.mostRecentCall.object).toBe(that);
    });

    it('should reject in the good context', function() {
      var that = {};
      def.then(success, failure, that);
      def.reject();
      expect(failure.mostRecentCall.object).toBe(that);
    });

    it('should progress in the good context', function() {
      var that = {};
      var progress = jasmine.createSpy();
      def.then(success, failure, progress, that);
      def.progress();
      expect(progress.mostRecentCall.object).toBe(that);
    });

  });

  describe('in nested cases', function() {
    
    it('should respect the order of execution', function() {
      var test = [];
      
      def.then(function() {
        def.then(function() {
          test.push('baz');
        });
        test.push('foo');
      });

      def.then(function() {
        test.push('bar');
      });

      def.resolve();

      def.then(function() {
        def.then(function() {
         test.push('quux'); 
        });
        test.push('qux');
      });

      expect(test).toEqual(['foo', 'bar', 'baz', 'qux', 'quux']);
    });

    it('should cancel properly', function() {
      success.andCallFake(function() {
        def.then(failure);
        def.cancel();
      });
      def.then(success);
      def.resolve();
      expect(success).toHaveBeenCalled();
      expect(failure).not.toHaveBeenCalled();
    });

  });

  describe('pipe', function() {
    
    it('should pipe deferred', function() {
      KadOH.log.addLogger('ConsoleLogger');
      var pipe1 = new Deferred();
      var pipe2 = new Deferred();
      def.pipe(function(value) {
        pipe1.resolve(value + 1);
        return pipe1;
      }).pipe(function(value) {
        pipe2.resolve(value + 1);
        return pipe2;
      });
      pipe2.addCallback(success);
      def.resolve(10);
      expect(success).toHaveBeenCalledWith(12);
    });

  });

  describe('when', function() {
    
    var promises;

    beforeEach(function() {
      promises = [
        new Deferred(),
        new Deferred(),
        new Deferred()
      ];
    });

    it('should test if it is a value or a promise', function() {
      expect(Deferred.isPromise('value')).toBeFalsy();
      expect(Deferred.isPromise(def)).toBeTruthy();
    });

    it('should return a promise', function() {
      var promise  = Deferred.when('foo');
      var deferred = Deferred.when(def);
      expect(promise.then).toBeFunction();
      expect(promise.isResolved()).toBeTruthy();
      expect(deferred).toBe(def);
    });

    describe('whenAll', function() {
      
      it('should be resolved when all are resolved', function() {
        var all = Deferred.whenAll(promises).then(success, failure);
        expect(all.isResolved()).toBeFalsy();
        promises[0].resolve('foo');
        expect(success).not.toHaveBeenCalled();
        promises[1].resolve('bar');
        expect(success).not.toHaveBeenCalled();
        promises[2].resolve('baz');
        expect(success).toHaveBeenCalledWith(['foo'], ['bar'], ['baz']);
        expect(all.isResolved()).toBeTruthy();
      });

    });

    describe('whenSome', function() {
      
      it('should be resolved when some are resolved', function() {
        var some = Deferred.whenSome(promises, 2).then(success, failure);
        expect(some.isResolved()).toBeFalsy();
        promises[0].resolve('foo');
        expect(success).not.toHaveBeenCalled();
        promises[2].resolve('baz');
        expect(success).toHaveBeenCalledWith(['foo'], undefined, ['baz']);
        expect(some.isResolved()).toBeTruthy();
      });

    });

    describe('whenAtLeast', function() {
      
      var atl;

      beforeEach(function() {
        atl = Deferred.whenAtLeast(promises).then(success, failure);
        expect(atl.isResolved()).toBeFalsy();
      });

      it('should resolve if at least one has resolved when they are all completed', function() {
        promises[0].reject();
        expect(success).not.toHaveBeenCalled();
        promises[2].resolve('bar');
        expect(success).not.toHaveBeenCalled();
        promises[1].reject();
        expect(success).toHaveBeenCalledWith([promises[2]], [promises[0], promises[1]]);
        expect(atl.isResolved()).toBeTruthy();
      });

      it('should reject when all have rejected', function() {
        promises[0].reject();
        promises[1].reject();
        promises[2].reject();
        expect(failure).toHaveBeenCalled();
        expect(success).not.toHaveBeenCalledWith([], [promises[0], promises[1], promises[2]]);
        expect(atl.isRejected()).toBeTruthy();
      });

    });

    describe('whenMap', function() {
      
      var map;

      beforeEach(function() {
        map = Deferred.whenMap(promises, function(value) {
          return value + '_bar';
        }).then(success);
      });

      it('should', function() {
        promises[0].resolve('foo1');
        promises[1].resolve('foo2');
        promises[2].resolve('foo3');
        expect(success).toHaveBeenCalledWith(['foo1_bar', 'foo2_bar', 'foo3_bar']);
      });
    });

  });

});