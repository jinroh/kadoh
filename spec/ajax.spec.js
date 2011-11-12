describe('Ajax and Botserver', function() {

  beforeEach(function() {
    ajax = KadOH.util.ajax;
  });
  
  it('should be possible to register', function() {
    var bot = {type : 'test', ip_port : 'foo:foo'};
    var callback = jasmine.createSpy();
    var for_node_server = (typeof exports !== 'undefined')? 'http://localhost:8124' : '';
    console.log(for_node_server);
    var req = ajax.post(for_node_server+'/bot', bot).done(callback).fail(function(){});
    waits(200);
    runs(function() {
      expect(callback).toHaveBeenCalled();
      var res = callback.mostRecentCall.args[0];
      expect(res.type).toEqual('test');
      expect(res.ip_port).toEqual('foo:foo');
      expect(res.id).toBeNumber();
    });
    

  });
  
});