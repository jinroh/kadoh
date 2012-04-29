$(function() { KadOHui.init();
     
    var inputs     = $("#credentials input");
    var transport  = $("select.transport");
    var jidInput   = $("#jid");
    var pswdInput  = $("#password");
    var connection = $("#connection");
    var joinBtn    = $("#connection input[name=join]");

    var options = {
    bootstraps : ['67.215.242.139:6881', '67.215.242.138:6881'],
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

  KadOH.log.subscribeTo(node, 'Node');
  KadOH.log.subscribeTo(node._reactor, 'Reactor');
  KadOH.log.subscribeTo(node._reactor._transport, 'Transport');
  KadOH.log.subscribeTo(node._routingTable, 'RoutingTable');

  logger = new KadOHui.Logger(KadOH.log, '#log .console', '#log .control');
  
  routing = new KadOHui.Routing(node._routingTable, '#routing-table');
  reactor = new KadOHui.Reactor(node._reactor, '#reactor .received', '#reactor .sent', '#reactor .connection_state');
  new KadOHui.Node(node, '#node');

  new KadOHui.Transport(node._reactor._transport, '#transport>pre');

  node._reactor.on('connected', function(iam) {
    $('#info').empty().append('<h3>'+iam+' / <small><span class="sha" data-placement="below" rel="twipsy" title="'+node.getID()+'">'+node.getID().slice(0,10)+'</span></small></h3>');
  });

  new KadOHui.Control(node);

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