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

  });

});