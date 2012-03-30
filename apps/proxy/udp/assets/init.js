  $(function() { KadOHui.init();
     
    var joinBtn    = $("#connection input[name=join]");

    var options = {
    bootstraps : ["127.0.0.1:3000", "127.0.0.1:3001", "127.0.0.1:3002"],
    reactor : {
      protocol  : 'jsonrpc2',
      //host      : 'localhost',
      type      : 'SimUDP',
      transport : {
        transports : [
                      //'websocket', 
                      'flashsocket', 
                      'htmlfile', 
                      'xhr-multipart', 
                      'xhr-polling', 
                      'jsonp-polling'
                      ]
      }
    }
  };

  node = new KadOH.Node(undefined, options);
  KadOH.log.setLevel('debug');
  KadOH.log.subscribeTo(node, 'Node');
  KadOH.log.subscribeTo(node._reactor, 'Reactor');
  KadOH.log.subscribeTo(node._reactor._transport, 'Transport');
  KadOH.log.subscribeTo(node._routingTable, 'RoutingTable');

  logger = new KadOHui.Logger('#log .console', '#log .control');
  KadOH.log.addLogger('UILogger', logger);

  routing = new KadOHui.Routing(node._routingTable, '#routing-table');
  reactor = new KadOHui.Reactor(node._reactor, '#reactor .received', '#reactor .sent', '#reactor .connection_state');
  new KadOHui.Node(node, '#node')
  node.once('connected', function() {
    valueM = new KadOHui.ValueM(node._store, '#value-management');
  }, this);

  new KadOHui.Transport(node._reactor._transport, '#transport>pre');
  new KadOHui.Control(node);
  
  node._reactor.on('connected', function(iam) {
    $('#info').empty().append('<h3>'+iam+' / <small><a href="#" data-placement="below" rel="twipsy" title="'+node.getID()+'">'+node.getID().slice(0,10)+'</a></small></h3>')
  })

  function onClickJoin(event) {
    try {
      if(node.stateIsNot('connected')){ 
        node.connect().once('connected', function() {
          node.join();
        });
        } else {
          node.join();
        }
    } catch(e) {
      console.error(e.stack);
    }
    event.preventDefault();
  }

  joinBtn.click(onClickJoin);
});