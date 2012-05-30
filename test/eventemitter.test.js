var chai = require('chai');
    helpers = require('./helpers'),
    spies = require('chai-spies'),
    expect = chai.expect;

chai.use(spies);

describe('EventEmitter', function() {

  var EventEmitter = require('../lib/util/eventemitter'),
      ee, spy;

  beforeEach(function() {
    ee = new EventEmitter();
    spy = chai.spy();
  });

  it('should be defined and be a function', function() {
    expect(EventEmitter).to.be.ok;
    expect(EventEmitter).to.be.a('function');
  });

  describe('when i add a listener', function() {

    it('should be added to the event queue', function() {
      ee.on('foo', spy);
      expect(typeof ee._events.foo).to.be.ok;
      var evt = ee._events.foo.callbacks[ee._events.foo.callbacks.length - 1];
      expect(evt.listener).to.equal(spy);
    });

    describe('and when I fire the associated event with arguments', function() {
      it('should have been called with the right arguments', function(done) {
        ee.on('foo', function(arg1, arg2) {
          expect(arg1).to.equal('arg1');
          expect(arg2).to.be.false;
          done();
        });
        ee.emit('foo', 'arg1', false);
      });
    });

    it('should be removable', function() {
      ee.on('foo', spy);
      ee.removeListener('foo', spy);
      ee.emit('foo');
      expect(spy).to.not.have.been.called;
    });
  });

  describe('when i add a one time listener and I fire the event 2 times', function() {
    it('the listener should have been called only one time', function() {
      ee.once('foo', spy);
      ee.emit('foo').emit('foo');
      expect(spy).to.have.been.called.once;
    });
  });

  describe('when i add a listener specifying the scope and i fire the event', function() {

    var that = {};

    it('should have bee called with the appropriate scope', function() {
      spy = chai.spy(function() {
        expect(this).to.equal(that);
      })
      ee.once('foo', spy, that);
      ee.emit('foo');
      expect(spy).to.have.been.called;
    });
  });

  describe('subscribers', function() {
    
    beforeEach(function() {
      ee.subscribe(spy);
      ee.emit('foo');
      ee.emit('bar', {baz: 'alex'});
    });

    it('should be possible to subscribe', function() {
      expect(spy).to.have.been.called.twice;
    });

    it('should be possible to unsubscribe', function() {
      ee.unsubscribe(spy);
      ee.emit('empty');
      expect(spy).to.have.been.called.twice;
    });

  });

  describe('chain of events', function() {
    
    var that = {};

    it('should be possible to add chain of events', function() {
      var fooSpy = chai.spy();
      var barSpy = chai.spy();
      var chain = {
        foo: fooSpy,
        bar: barSpy
      };
      ee.on(chain, that);
      ee.emit('foo');
      expect(fooSpy).to.have.been.called.once;
      ee.emit('bar');
      expect(barSpy).to.have.been.called.once;
    });

  });

});