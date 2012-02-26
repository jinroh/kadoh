var proxy = require(__dirname+'/mainlineproxy');
var jsonrpc = require(__dirname+'/../client/rpcprotocol/jsonrpc2').protocol.jsonrpc2;
//console.log(jsonrpc);

var id_1 = '05bacde39e74168b800604f6f40c43d14ec8e36e';
var id_2 = '05bac0ca0338507219fd7e59fd735a369ac75cdc';

console.log('/////////////QUERY///////////////');
var req = jsonrpc.buildRequest('FIND_NODE', {id :  id_1, target : id_2}, 'foof');
console.log(req);

var enc = proxy.JSONrpc2ToBencode(req);
console.log(enc);

var riq = proxy.bencodeToJSONrpc2(enc);

console.log(riq);

console.log('/////////////RESPONSE///////////');

var resp = jsonrpc.buildResponse({id : id_1,
                                  nodes : [
                                            ['192.168.0.1:4555', id_1 ],
                                            ['192.168.255.1:35', id_2 ]
                                          ]
                                  }, 'foof');

console.log(resp);
console.log(resp.getResult().nodes);

var enc = proxy.JSONrpc2ToBencode(resp);
console.log(enc);

var risp = proxy.bencodeToJSONrpc2(enc);

console.log(risp);
console.log(risp.getResult().nodes);

console.log('/////////////MAL-FORMED JSON REQ///////////');

var req = jsonrpc.buildRequest('FIND_NODE', {id :  id_1, target : id_2}, 'foof');
req.jsonrpc = '1.0';

var handle = function(msg) {
  try {
    var rpc = jsonrpc.parseRPCMessage(msg);
  } catch(e) {
    if(! e instanceof jsonrpc.RPCError) {
      e = new jsonrpc.RPCError(-32600, 'Proxy : '+e.toString());
    }
    console.log(e);

    var message = jsonrpc.buildErrorResponse(e);

    var resp = {
      src: 'mainline_proxy',
      dst: 'foof',
      msg: message
    };

    return resp;
  }
};

console.log(handle(req));
proxy.listen(8080);

