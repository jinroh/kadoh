var KadOH = require(__dirname + '/../dist/KadOH.node.js');
var Hook  = require('hook.io').Hook;
var hook  = new Hook({
  name: 'bot'
});

var options = {
  reactor : {
    protocol  : 'jsonrpc2',
    type      : 'UDP',
    transport : {
      port : 8000
    }
  }
}
var node = new KadOH.Node(null, options);
KadOH.log.subscribeTo(node._reactor._transport);
KadOH.log.subscribeTo(node._reactor);

node.connect();
