describe('SimUDP with Bot', function() {
	beforeEach(function() {
    for_node_server = (typeof exports !== 'undefined') ? 'http://localhost:3000' : '';

    var req = ajax.get(for_node_server+'/bot/reply').done(function(bot) {
      reply_bot = bot.pop().ip_port;
    });

    simudp = KadOH.transport.SimUDP;
    waits(200);
  });

  it('should be', function(){
    callback = jasmine.createSpy();
    expect(reply_bot).toBeDefined();
    s = new simudp(for_node_server);

    expect(typeof s).toEqual('object');

    s.listen(callback);
    s.send(reply_bot, 'hi');
    waits(300);

    runs(function() {
      expect(callback).toHaveBeenCalled();
      var arg = callback.mostRecentCall.args[0];
      expect(arg.src).toEqual(reply_bot);
      expect(arg.msg).toEqual('RE:hi');
    });
  });
});