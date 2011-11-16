xdescribe('Reactor', function() {
  beforeEach(function() {
    Reactor = KadOH.Reactor;
    reactor = new Reactor(Dumb.Node);
  });

  it('should be a function', function() {
    expect(Reactor).toBeFunction();
  });

  it('should be possible to send a RPC', function() {
    spyOn(reactor._udp, 'send');
    reactor.sendRPC('foo:foo', 'PING');
    expect(reactor._udp.send).toHaveBeenCalled();
  });
});