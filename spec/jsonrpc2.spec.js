describe('jsonrpc2', function() {
 
 beforeEach(function() {
    prot = KadOH.protocol.jsonrpc2;
    RPCS = KadOH.globals.RPCS;
 }); 
  
  it('should RPCMessage constructor work', function() {
    expect(prot).toBeObject();
    expect(prot._RPCMessage).toBeFunction();
    var mes = new prot._RPCMessage({id : '3'});
    expect(mes).toBeObject();
    expect(mes.id).toEqual('3');
    expect(mes.setRPCID).toBeDefined();
    mes.setRPCID('4');
    expect(mes.getRPCID).toBeDefined();
    expect(mes.getRPCID()).toEqual('4');
    expect(mes.stringify()).toBeObject();
    expect(mes.stringify().id).toEqual('4');
  }); 
  
  it('should RPCError constructor work', function() {
    expect(prot).toBeObject();
    expect(prot._RPCError).toBeFunction();
    var err = new prot._RPCError(-32601, null, {id : '3'});
    expect(err).toBeObject();
    expect(err.code).toEqual(-32601);
    expect(err.getRPCID).toBeDefined();
    expect(err.getRPCID()).toEqual('3');
    expect(err.stringify()).toBeObject();
    expect(err.stringify().message).toEqual("Method not found.");
  });
  
  it('should build a good requestMessage', function() {
    expect(prot.buildRequest).toBeFunction();
    var req = prot.buildRequest('foo', ['bar','dot']);
    expect(req).toBeObject();
    expect(req.isRequest()).toBeTruthy();
    expect(req.getMethod()).toEqual('foo');
    expect(req.getParams()[0]).toEqual('bar');
  });
  
  it('should build a good responseMessage', function() {
    expect(prot.buildResponse).toBeFunction();
    var req = prot.buildResponse('foo');
    expect(req).toBeObject();
    expect(req.isResponse()).toBeTruthy();
    expect(req.getResult()).toEqual('foo');
  });

  it('should build a good errorResponse', function() {
    expect(prot.buildErrorResponse).toBeFunction();
    var resp = prot.buildErrorResponse(new prot._RPCError(-32601, null, {id : '3'}));
    expect(resp).toBeObject();
    expect(resp.isError()).toBeTruthy();
    expect(resp.getError().stringify().code).toEqual(-32601);
  });
  
  it('should parse a requestMessage', function() {
    expect(prot.parseRPCMessage).toBeFunction();
    var mes = prot.parseRPCMessage({'jsonrpc' : '2.0', 'method' : 'ping', 'id' : '5'});
    expect(mes).toBeObject();
    expect(mes.isRequest()).toBeTruthy();
    expect(mes.getMethod()).toEqual('PING');
      var catched = false;
    try{
      prot.parseRPCMessage({'jsonrpc' : '2.0', 'method' : 'brigitte_bardot', 'id' : '5'});
    }catch(e) {
      catched = true;
      expect(e.code).toEqual(-32601);
      expect(e.getRPCID()).toEqual('5');
    }
    expect(catched).toBeTruthy();
  });
  
  it('should parse a responseMessage', function() {
    expect(prot.parseRPCMessage).toBeFunction();
    var mes = prot.parseRPCMessage({'jsonrpc' : '2.0', 'result' : 'PONG', 'id' : '5'});
    expect(mes).toBeObject();
    expect(mes.isResponse()).toBeTruthy();
    expect(mes.getResult()).toEqual('PONG');
      var catched = false;
    try{
      prot.parseRPCMessage({'jsonrpc' : '2.0', 'result' : 'PONG', 'error' : 'foof','id' : '5'});
    }catch(e) {
      catched = true;
      expect(e.code).toEqual(-32600);
      expect(e.getRPCID()).toEqual('5');
    }
    expect(catched).toBeTruthy();
  });
  
  it('should parse an errorMessage', function() {
    expect(prot.parseRPCMessage).toBeFunction();
    var mes = prot.parseRPCMessage({'jsonrpc' : '2.0', 'error' : {'code': -32601, 'message': "Method not found."}, 'id' : '5'});
    expect(mes).toBeObject();
    expect(mes.isError()).toBeTruthy();
    expect(mes.getError().code).toEqual(-32601);
    expect(mes.getError().getRPCID()).toEqual('5');
  });
});