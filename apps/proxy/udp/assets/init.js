$(function() { 
  KadOHui.init();
     
  var connectBtn = $("#connection_btn");

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

  KadOH.log.subscribeTo(node, 'Node');
  KadOH.log.subscribeTo(node._reactor, 'Reactor');
  KadOH.log.subscribeTo(node._reactor._transport, 'Transport');
  KadOH.log.subscribeTo(node._routingTable, 'RoutingTable');

  logger = new KadOHui.Logger(KadOH.log, '#log .console', '#log .control');

  routing = new KadOHui.Routing(node._routingTable, '#routing-table');
  reactor = new KadOHui.Reactor(node._reactor, '#reactor .received', '#reactor .sent', '#reactor .connection_state');
  new KadOHui.Node(node, '#node');
  
  node.once('connected', function() {
    new KadOHui.ValueM(node._store, '#value-management');
  });

  new KadOHui.Transport(node._reactor._transport, '#transport>pre');
  new KadOHui.Control(node);
  
  node.once('connected', function() {
    $('#info').html('<h3>'+node.getAddress()+' / <small><a href="#" data-placement="bottom" rel="tooltip" title="'+node.getID()+'">'+node.getID().slice(0,10)+'</a></small></h3>');
  });
  
  connectionBtn = $('#connection_btn').button();
  var onConnect = function() {
    connectionBtn.unbind('click', onConnect);
    node.connect(function() {
      connectionBtn.button('complete').button('toggle');
    });
  }
  connectionBtn.click(onConnect);
});