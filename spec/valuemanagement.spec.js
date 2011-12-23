describe('Value Management', function() {
  
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
      },
      republish: function(key, value, exp) {
        //do nothing for the moment
      }
    };
  });
  
  it('should be a function', function() {
    expect(VM).toBeFunction();
  });

  it('should be instanciable', function() {
    var v = new VM(node, {recover : false});
    expect(typeof v).toEqual('object');
  });

  describe('when i instanciate one (no recover)', function() {
    beforeEach(function(){
      v = new VM(node, {recover : false});
    });

    it('should be possible to store a value', function(){
      v.save('9Va5c4acf388e17a1a8a5364b14ee48c2cb29b01', {foo : 'bar'});
      expect(true).toBeTruthy();
    });

    describe('when I\' ve stored a value', function() {
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

    describe('when I\' ve stored a value with an expiration time', function() {
      beforeEach(function(){
        var exp = +(new Date()) + 50; //TTL : 200 ms
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

      it('...and have exprired after a while', function(){
        res = 12345;
        waits(53);
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
        v._repTime = 50;
        v.save('3Va5c4acf388e17a1a8a5364b14ee48c2cb29b01', {foo : 'bar'});
      });
      afterEach(function() {
        v._repTime = globals.TIMEOUT_REPUBLISH;
      });

      it('should be republished at least twice', function(){
        spyOn(node,'republish');
        waits(50+3);
        runs(function(){
          expect(node.republish).toHaveBeenCalled();
          expect(node.republish.callCount).toEqual(1);
          expect(node.republish.mostRecentCall.args[0]).toEqual('3Va5c4acf388e17a1a8a5364b14ee48c2cb29b01');

        });
        waits(50+3);
        runs(function(){
          expect(node.republish).toHaveBeenCalled();
          expect(node.republish.callCount).toEqual(2);
          expect(node.republish.mostRecentCall.args[0]).toEqual('3Va5c4acf388e17a1a8a5364b14ee48c2cb29b01');

        });
        });

        describe('and when I re-store it a a while later', function() {
          waits(25);
          runs(function() {
            v.save('3Va5c4acf388e17a1a8a5364b14ee48c2cb29b01', {foo : 'bar'});
          });
          it('should not have been republished too early..', function() {
            spyOn(node,'republish');
            waits(25+3);
            runs(function(){
              expect(node.republish).not.toHaveBeenCalled();
            });
          });
          it('..but at the rigth time', function() {
            spyOn(node,'republish');
            waits(50+3);
            runs(function(){
              expect(node.republish).toHaveBeenCalled();
              expect(node.republish.callCount).toEqual(1);
            });
          });
      });
    });
  });
  
});