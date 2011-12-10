xdescribe('xmlrpc', function() {
 
 beforeEach(function() {
    prot = KadOH.protocol.xmlrpc;
    RPCS = KadOH.globals.RPCS;
 }); 
  
  it('should RPCMessage constructor work', function() {
    expect(prot).toBeObject();
    expect(prot.RPCMessage).toBeFunction();
    var mes = new prot.RPCMessage({id : '3'});
    expect(mes).toBeObject();
    expect(mes.id).toEqual('3');
    expect(mes.setRPCID).toBeDefined();
    expect(mes.getRPCID).toBeDefined();
    expect(mes.getRPCID()).toEqual('3');
  }); 
  
  it('should RPCError constructor work', function() {
    expect(prot).toBeObject();
    expect(prot.RPCError).toBeFunction();
    var err = new prot.RPCError(-32601, null, {id : '3'});
    expect(err).toBeObject();
    expect(err.code).toEqual(-32601);
    expect(err.getRPCID).toBeDefined();
    expect(err.getRPCID()).toEqual('3');
  });
  
  it('should build a good requestMessage', function() {
    expect(prot.buildRequest).toBeFunction();
    var req = prot.buildRequest('foo', ['bar','dot'], 123);
    expect(req).toBeObject();
    expect(req.isRequest()).toBeTruthy();
    expect(req.getMethod()).toEqual('foo');
    expect(req.getParams()[0]).toEqual('bar');
    expect(req.getRPCID()).toEqual('123');

    req.setRPCID('321');
    expect(req.getRPCID()).toEqual('321');

    expect(req.stringify()).toEqual('<methodCall id="321"><methodName>foo</methodName><params><param><value><string>bar</string></value></param><param><value><string>dot</string></value></param></params></methodCall>');
  });
  
  it('should build a good responseMessage', function() {
    expect(prot.buildResponse).toBeFunction();
    var req = prot.buildResponse({foo: 'bar', bar: ['foo', 'bar']}, 3);
    expect(req).toBeObject();
    expect(req.isResponse()).toBeTruthy();
    expect(req.getResult()).toEqual({foo: 'bar', bar: ['foo', 'bar']});
    expect(req.getRPCID()).toEqual('3');

    expect(req.stringify()).toEqual('<methodResponse id="3"><params><param><struct><member><name>foo</name><value><string>bar</string></value></member><member><name>bar</name><value><array><data><value><string>foo</string></value><value><string>bar</string></value></data></array></value></member></struct></param></params></methodResponse>');
  });

  it('should build a good errorResponse', function() {
    expect(prot.buildErrorResponse).toBeFunction();
    var resp = prot.buildErrorResponse(new prot.RPCError(-32601, null, {id : '3'}));
    expect(resp).toBeObject();
    expect(resp.isError()).toBeTruthy();
    expect(resp.getError().stringify().code).toEqual(-32601);

    expect(resp.stringify()).toEqual('<methodResponse id="3"><fault><value><struct><member><name>faultCode</name><i4>-32601</i4><name>faultString</name><string>Method not found.</string></member><member/></struct></value></fault></methodResponse>');
  });
  
  it('should parse a requestMessage', function() {
    expect(prot.parseRPCMessage).toBeFunction();
    var req = '\
    <methodCall id="123">           \
      <methodName>PING</methodName> \
      <params>                      \
        <param>                     \
          <value>                   \
            <array><data><value><i4>12</i4></value><value><string>Egypt</string></value><value><boolean>0</boolean></value><value><i4>-31</i4></value></data></array></value></param><param>                     \
          <value>                   \
            <string>dot</string>    \
          </value>                  \
        </param>                    \
      </params>                     \
    </methodCall>';
    var mes = prot.parseRPCMessage(req);
    expect(mes).toBeObject();
    expect(mes.isRequest()).toBeTruthy();
    expect(mes.getMethod()).toEqual('PING');
    expect(mes.getParams()).toEqual([[12, 'Egypt', false, -31], 'dot']);
    expect(mes.getRPCID()).toEqual('123');
  });
  
  it('should parse a responseMessage', function() {
    expect(prot.parseRPCMessage).toBeFunction();
    var res = '\
    <methodResponse id="123"> \
    <params>                  \
      <param>                 \
         <value><string>South Dakota</string></value> \
         </param>             \
      </params>               \
    </methodResponse>';
    var mes = prot.parseRPCMessage(res);
    expect(mes).toBeObject();
    expect(mes.isResponse()).toBeTruthy();
    expect(mes.getResult()).toEqual('South Dakota');
    expect(mes.getRPCID()).toEqual('123');
  });
  
  it('should parse an errorMessage', function() {
    expect(prot.parseRPCMessage).toBeFunction();
    var err = '\
    <methodResponse id="5">\
    <fault>\
      <value>\
         <struct>\
            <member>\
               <name>faultCode</name>\
               <value><int>-32601</int></value>\
               </member>\
            <member>\
               <name>faultString</name>\
               <value><string>Too many parameters.</string></value>\
               </member>\
            </struct>\
         </value>\
      </fault>\
    </methodResponse>';
    var mes = prot.parseRPCMessage(err);
    expect(mes).toBeObject();
    expect(mes.isError()).toBeTruthy();
    expect(mes.getError().code).toEqual(-32601);
    expect(mes.getError().message).toEqual('Too many parameters.');
    expect(mes.getError().getRPCID()).toEqual('5');
  });
});