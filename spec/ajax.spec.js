describe('Ajax and Botserver', function() {

  beforeEach(function() {
    ajax = KadOH.util.ajax;
    for_node_server = (typeof exports !== 'undefined')? 'http://localhost:3000' : '';
  });

  it('should be possible to register', function() {
    var bot = {type : 'test', ip_port : 'foo:foo'};
    var callback = jasmine.createSpy();
    console.log(for_node_server);
    var req = ajax.post(for_node_server+'/bot', bot).done(callback);//.fail(function(){});
    waits(300);
    runs(function() {
      expect(callback).toHaveBeenCalled();
      var res = callback.mostRecentCall.args[0];
      expect(res.type).toEqual('test');
      expect(res.ip_port).toEqual('foo:foo');
      expect(res.id).toBeNumber();
    });
  });

  it('then it should be possible to retrieve the registered bot', function() {
    var callback = jasmine.createSpy();
    var req = ajax.get(for_node_server+'/bot/test').done(callback);
    waits(100);
    runs(function(){
      expect(callback).toHaveBeenCalled();
      bot = callback.mostRecentCall.args[0].pop();
      expect(bot.type).toEqual('test');
      var req = ajax.get(for_node_server+'/bot/test/'+bot.id).done(callback);
    });
    waits(100);
    runs(function(){
      expect(callback).toHaveBeenCalled();
      var _bot = callback.mostRecentCall.args[0];
      expect(_bot.id).toEqual(bot.id);
    });
  });
});