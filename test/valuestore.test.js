var chai = require('chai'),
    sinonChai = require('sinon-chai'),
    sinon = require('sinon'),
    expect = chai.expect;

chai.use(sinonChai);

describe('Value Store', function() {

  var VS = require('../lib/data/value-store'),
      globals = require('../lib/globals'),
      randomSHA1 = require('../lib/util/crypto').digest.randomSHA1;

  var node = new Peer('foo@bar', '8ba5c4acf388e17a1a8a5364b14ee48c2cb29b01'),
      v;
  
  beforeEach(function(){
    v = new VS(node, {recover : false, delayedRep : false});
  });

  afterEach(function(){
    v.stop();
  });

  it('should be a function', function() {
    expect(VS).to.be.a('function');
  });

  it('should be instanciable', function() {
    expect(v).to.be.a('object');
  });

  describe('when i instanciate one (no recover)', function() {

    describe('and when I\'ve stored a value', function() {

      var key = randomSHA1();

      beforeEach(function(){
        v.save(key, {foo : 'bar'});
      });

      it('should be possible to retrieve later (with callback)', function(done) {
        v.retrieve(key, function(obj) {
          expect(obj.foo).to.equal('bar');
          done();
        });
      });

      it('should be possible to retrieve later (with deferred)', function(done) {
        v.retrieve(key).then(function(obj) {
          expect(obj.foo).to.equal('bar');
          done();
        });
      });
    });

    describe('and when I\'ve stored a value with an expiration time', function() {

      var key = randomSHA1(),
          ttl = 250, exp;

      beforeEach(function() {
        ttl = 250;
        exp = +(new Date()) + ttl;
        v.save(key, {foo : 'babar'}, exp);
      });

      it('should be there now..', function(done) {
        v.retrieve(key, function(obj) {
          expect(obj.foo).to.equal('babar');
          done();
        });
      });

      it('should have exprired after a while', function(done) {
        setTimeout(function() {
          v.retrieve(key, function(obj) {
            expect(obj).to.be.null;
            done();
          });
        }, ttl * 1.1);
      });
    });

    describe('when I\'ve stored a value (and manuelly dropped down the republish time to test it)', function() {

      var key = randomSHA1(),
          ttl = 250;

      beforeEach(function(){
        v._repTime = ttl;
        v.save(key, {foo : 'bar'});
      });

      afterEach(function() {
        v._repTime = globals.TIMEOUT_REPUBLISH;
      });

      it('should be republished at least twice', function(done) {
        var spy = sinon.spy();
        v.on('republish', spy);
        setTimeout(function(){
          expect(spy).to.have.been.calledOnce;
          expect(spy).to.have.been.calledWith(key);
          setTimeout(function() {
            expect(spy).to.have.been.calledTwice;
            expect(spy).to.have.been.calledWith(key);
            done();
          }, ttl * 1.1);
        }, ttl * 1.1);
      });

      describe('and when I re-store it a while later', function() {

        beforeEach(function(done) {
          setTimeout(function() {
            v.save(key, {foo : 'bar'});
            done();
          }, ttl / 2);
        });

        it('should not have been republished too early..', function() {
          var spy = sinon.spy();
          v.on('republish', spy);
          expect(spy).not.to.have.been.called;
        });

        it('..but at the rigth time', function(done) {
          var spy = sinon.spy();
          v.on('republish', spy);
          setTimeout(function() {
            expect(spy).to.have.been.calledOnce;
            done();
          }, ttl * 1.1);
        });

      });

    });

  });
  
});
