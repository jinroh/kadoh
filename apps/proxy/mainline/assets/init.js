$(function() {
  KadOHui.init();
     
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
  new KadOHui.Control(node);

  node.once('connected', function() {
    $('#info').html('<h3>'+node.getAddress()+' / <small><a href="#" data-placement="below" rel="tooltip" title="'+node.getID()+'">'+node.getID().slice(0,10)+'</a></small></h3>');
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