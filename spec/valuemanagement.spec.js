describe('In Value Management', function() {
  
  beforeEach(function() {
    VM = KadOH.ValueManagement;
    globals = KadOH.globals;
    
    //mimic a node
    node = {
      getID: function() {
        return '8ba5c4acf388e17a1a8a5364b14ee48c2cb29b01';
      },
      getAddress: function() {
        return 'kadoh@jabber.org';
      }
    };
  });
  
  it('should be a function', function() {
    expect(VM).toBeFunction();
  });

  it('should be instanciable', function() {
    var v = new VM(node, {recover : false});
    expect(typeof v).toEqual('object');
    v.stop();
  });

  describe('when i instanciate one (no recover)', function() {
    beforeEach(function(){
      v = new VM(node, {recover : false});
    });

    afterEach(function(){
      v.stop();
    });

    it('should be possible to store a value', function(){
      v.save('9Va5c4acf388e17a1a8a5364b14ee48c2cb29b01', {foo : 'bar'});
      expect(true).toBeTruthy();
    });

    describe(' and when I\' ve stored a value', function() {
      beforeEach(function(){
        v.save('9Va5c4acf388e17a1a8a5364b14ee48c2cb29b01', {foo : 'bar'});
      });
      it('should be possible to retrieve later (with callback)', function(){
        res = undefined;
        runs(function(){
          v.retrieve('9Va5c4acf388e17a1a8a5364b14ee48c2cb29b01', function(obj) {
            res = obj.foo;
          });
        });
        waits(10);
        runs(function(){
          expect(res).toEqual('bar');
        });
      });
      it('should be possible to retrieve later (with deferred)', function(){
        res = undefined;
        runs(function(){
          v.retrieve('9Va5c4acf388e17a1a8a5364b14ee48c2cb29b01').then(
            function(obj) {
            res = obj.foo;
          });
        });
        waits(10);
        runs(function(){
          expect(res).toEqual('bar');
        });
      });
    });

    describe('and when I\' ve stored a value with an expiration time', function() {
      beforeEach(function(){
        TTL = 1000;
        var exp = +(new Date()) + TTL;
        v.save('1Va5c4acf388e17a1a8a5364b14ee48c2cb29b01', {foo : 'babar'}, exp);
      });

      it('should be there now..', function(){
        runs(function(){
          v.retrieve('1Va5c4acf388e17a1a8a5364b14ee48c2cb29b01', function(obj) {
            res = obj.foo;
          });
        });
        waits(10);
        runs(function(){
          expect(res).toEqual('babar');
        });
      });

      it('should have exprired after a while', function(){
        res = 12345;
        waits(TTL+TTL/3);
        runs(function(){
          v.retrieve('1Va5c4acf388e17a1a8a5364b14ee48c2cb29b01', function(obj) {
            res = obj;
          });
        });
        waits(10);
        runs(function(){
          expect(res).toEqual(null);
        });
      });
    });

    describe('when I\' ve stored a value (and manuelly dropped down the republish time to test it)', function(){
      beforeEach(function(){
        v._repTime = 500;
        v.save('3Va5c4acf388e17a1a8a5364b14ee48c2cb29b01', {foo : 'bar'});
      });

      afterEach(function() {
        v._repTime = globals.TIMEOUT_REPUBLISH;
      });

      it('should be republished at least twice', function(){
        spy = jasmine.createSpy();
        v.on('republish', spy, this);
        waits(v._repTime+100);
        runs(function(){
          expect(spy).toHaveBeenCalled();
          expect(spy.callCount).toEqual(1);
          expect(spy.mostRecentCall.args[0]).toEqual('3Va5c4acf388e17a1a8a5364b14ee48c2cb29b01');
        });

        waits(v._repTime+100);
        runs(function(){
          expect(spy).toHaveBeenCalled();
          expect(spy.callCount).toEqual(2);
          expect(spy.mostRecentCall.args[0]).toEqual('3Va5c4acf388e17a1a8a5364b14ee48c2cb29b01');
        });
      });

      describe('and when I re-store it a while later', function() {
        beforeEach(function(){
          waits(v._repTime/2);
          runs(function() {
            v.save('3Va5c4acf388e17a1a8a5364b14ee48c2cb29b01', {foo : 'bar'});
          });
        });
        it('should not have been republished too early..', function() {
          spy = jasmine.createSpy();
          v.on('republish', spy, this);
          expect(spy).not.toHaveBeenCalled();
        });
        it('..but at the rigth time', function() {
          spy = jasmine.createSpy();
          v.on('republish', spy, this);
          waits(v._repTime/2+10);
          runs(function(){
            expect(spy).toHaveBeenCalled();
            expect(spy.callCount).toEqual(1);
          });
        });
      });
    });
  });
  
});