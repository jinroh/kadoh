var chai = require('chai'),
    spies = require('chai-spies'),
    expect = chai.expect;

chai.use(spies);

describe('Deferred', function() {

  var Deferred = require('../lib/util/deferred'),
      def, success, failure, progress;

  beforeEach(function() {
    def = new Deferred();
  });

  it('should be a function', function() {
    expect(Deferred).to.be.a('function');
    expect(def).to.be.a('object');
    expect(def.then).to.be.a('function');
  });

  describe('in a resolve state', function() {

    beforeEach(function() {
      success = chai.spy(function(foo, bar) {
        expect(foo).to.eql('foo');
        expect(bar).to.eql('bar');
      });
      def.addCallback(success);
      expect(def.isResolved()).to.be.false;
    });

    it('should resolve with the good arguments', function() {
      def.resolve('foo', 'bar');
      expect(def.isResolved()).to.be.true;
      expect(success).to.have.been.called;
    });

    it('should be possible to get passed arguments', function(){
      def.resolve('foo', 'bar');
      expect(def.getResolvePassedArgs()).to.eql(['foo', 'bar']);
    });
    
    it('should not be resolved twice', function() {
      def.resolve('foo', 'bar').resolve('foo', 'bar');
      expect(success).to.have.been.called.once;
    });

    it('should execute callbacks event after being resolved', function() {
      def.resolve('foo', 'bar');
      def.addCallback(success);
      expect(success).to.have.been.called;
    });

    it('should properly cancel', function() {
      def.addCallback(success);
      def.cancel();
      def.addCallback(failure);
      def.resolve();
      expect(success).to.not.have.been.called;
      expect(failure).to.not.have.been.called;
    });

  });
  
  describe('in a reject state', function() {
    
    beforeEach(function() {
      failure = chai.spy(function(foo, bar) {
        expect(foo).to.eql('foo');
        expect(bar).to.eql('bar');
      });
      def.addErrback(failure);
      expect(def.isRejected()).to.be.false;
    });

    it('should reject with the good arguments', function() {
      def.reject('foo', 'bar');
      expect(def.isRejected()).to.be.true;
      expect(failure).to.have.been.called;
    });

    it('should be possible to get passed arguments', function(){
      def.reject('foo', 'bar');
      expect(def.getRejectPassedArgs()).to.eql(['foo', 'bar']);
    });

    it('should not be reject twice', function() {
      def.reject('foo', 'bar').reject('foo', 'bar');
      expect(failure).to.have.been.called.once;
    });

    it('should execute callbacks event after being rejected', function() {
      def.reject('foo', 'bar');
      def.addErrback(failure);
      expect(failure).to.have.been.called;
    });

    it('should properly cancel', function() {
      def.addErrback(success);
      def.cancel();
      def.addErrback(failure);
      def.resolve('foo', 'bar');
      expect(success).to.not.have.been.called;
      expect(failure).to.not.have.been.called;
    });

  });

  describe('context of execution', function() {

    var that = {};
    
    beforeEach(function() {
      var checkContext = function() {
        expect(this).to.equal(that);
      }
      success = chai.spy(checkContext);
      failure = chai.spy(checkContext);
      progress = chai.spy(checkContext);
    });

    it('should resolve in the good context', function() {
      def.then(success, failure, that);
      def.resolve();
    });

    it('should reject in the good context', function() {
      def.then(success, failure, that);
      def.reject();
    });

    it('should progress in the good context', function() {
      def.then(success, failure, progress, that);
      def.progress();
    });

  });

  //
  // Deactivated for optimization purposes
  //
  xdescribe('in nested cases', function() {
    
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

      expect(test).to.eql(['foo', 'bar', 'baz', 'qux', 'quux']);
    });

    it('should cancel properly', function() {
      success = chai.spy(function() {
        def.then(failure);
        def.cancel();
      })
      def.then(success);
      def.resolve();
      expect(success).to.have.been.called;
      expect(failure).to.not.have.been.called;
    });

  });

  describe('pipe', function() {
    
    it('should pipe deferred', function() {
      success = chai.spy(function(value) {
        expect(value).to.equal(12);
      });
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
      expect(success).to.have.been.called;
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
      expect(Deferred.isPromise('value')).to.be.false;
      expect(Deferred.isPromise(def)).to.be.true;
    });

    it('should return a promise', function() {
      var promise  = Deferred.when('foo');
      var deferred = Deferred.when(def);
      expect(promise.then).to.be.a('function');
      expect(promise.isResolved()).to.be.true;
      expect(deferred).to.equal(def);
    });

    describe('whenAll', function() {
      
      it('should be resolved when all are resolved', function() {
        success = chai.spy(function() {
          expect(arguments).to.eql([['foo'], ['bar'], ['baz']]);
        })
        var all = Deferred.whenAll(promises).then(success, failure);
        expect(all.isResolved()).to.be.false;
        promises[0].resolve('foo');
        expect(success).to.not.have.been.called;
        promises[1].resolve('bar');
        expect(success).to.not.have.been.called;
        promises[2].resolve('baz');
        expect(all.isResolved()).to.be.true;
      });

    });

    describe('whenSome', function() {
      
      it('should be resolved when some are resolved', function() {
        success = chai.spy(function() {
          expect(arguments).to.eql([['foo'], undefined, ['baz']]);
        })
        var some = Deferred.whenSome(promises, 2).then(success, failure);
        expect(some.isResolved()).to.be.false;
        promises[0].resolve('foo');
        expect(success).to.not.have.been.called;
        promises[2].resolve('baz');
        expect(success).to.have.been.called;
        expect(some.isResolved()).to.be.true;
      });

    });

    describe('whenAtLeast', function() {
      
      var atl;

      beforeEach(function() {
        success = chai.spy(function() {
          expect(arguments).to.eql([[promises[2]], [promises[0], promises[1]]]);
        });
        failure = chai.spy();
        atl = Deferred.whenAtLeast(promises).then(success, failure);
        expect(atl.isResolved()).to.be.false;
      });

      it('should resolve if at least one has resolved when they are all completed', function() {
        promises[0].reject();
        expect(success).to.not.have.been.called;
        promises[2].resolve('bar');
        expect(success).to.not.have.been.called;
        promises[1].reject();
        expect(success).to.have.been.called;
        expect(atl.isResolved()).to.be.true;
      });

      it('should reject when all have rejected', function() {
        promises[0].reject();
        promises[1].reject();
        promises[2].reject();
        expect(failure).to.have.been.called;
        expect(success).to.not.have.been.called;
        expect(atl.isRejected()).to.be.true;
      });

    });

    describe('whenMap', function() {
      
      var map;

      beforeEach(function() {
        success = chai.spy(function() {
          expect(arguments).to.eql([['foo1_bar', 'foo2_bar', 'foo3_bar']])
        });
        map = Deferred.whenMap(promises, function(value) {
          return value + '_bar';
        }).then(success);
      });

      it('should', function() {
        promises[0].resolve('foo1');
        promises[1].resolve('foo2');
        promises[2].resolve('foo3');
        expect(success).to.have.been.called;
      });
    });

  });

});