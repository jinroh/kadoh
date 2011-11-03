describe('jsonrpc2', function() {
 
 beforeEach(function() {
   prot = KadOH.protocol.jsonrpc2;
   RPCS = KadOH.globals._rpcs;
 }); 
  
  it('should be the expected object', function() {
    expect(prot.buildError).toBeFunction();
    expect(prot.buildRequest).toBeFunction();
    expect(prot.buildResponse).toBeFunction();
    expect(prot.parseRequest).toBeFunction();
  }); 
  
  
  describe('parse request', function() {
    it('should be able to parse any type of RPCs', function() {
      RPCS.forEach(function(rpc){
        expect(prot.parseRequest({'jsonrpc':'2.0', 'method': rpc})).toBeObject;
      });
    });

    it('should be able to parse a good request', function() {
      var obj = prot.parseRequest({'jsonrpc':'2.0', 'method': 'ping', id : 34});
      expect(obj.msg).toBeObject();
      expect(obj.getMethod()).toEqual('PING');
      expect(obj.getRPCID()).toEqual('34');
      expect(obj.stringify()).toEqual(obj.msg);
    });

    it('should throw an error message at bad parse', function(){
      try{prot.parseRequest({'jsonrpc':'2.0', 'method': 'badmethod', 'id':'34'})
      var catched = false}
      catch(mes){
        var catched =true;
        expect(mes).toBeDefined();
        expect(mes.stringify()).toBeDefined();
        expect(mes.stringify().error.code).toEqual(-32601);
        expect(mes.isError()).toBeTruthy();
        }
      expect(catched).toBeTruthy();   
    });  
  });

    
});