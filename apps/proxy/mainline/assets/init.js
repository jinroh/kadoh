var config = {
  bootstraps : ['67.215.242.139:6881', '67.215.242.138:6881'],
  reactor : {
    protocol  : 'jsonrpc2',
    type      : 'SimUDP',
    transport : {
      transports : [
        'flashsocket', 
        'htmlfile', 
        'xhr-multipart', 
        'xhr-polling', 
        'jsonp-polling'
      ]
    }
  }
};

function createNode() {
  node = KadOH.node = new KadOH.Node(undefined, config);

  KadOH.log.subscribeTo(node, 'Node');
  KadOH.log.subscribeTo(node._reactor, 'Reactor');
  KadOH.log.subscribeTo(node._reactor._transport, 'Transport');
  KadOH.log.subscribeTo(node._routingTable, 'RoutingTable');

  new KadOHui.Control(node);
  new KadOHui.Node(node, '#node');
  new KadOHui.Reactor(node._reactor, '#reactor .received', '#reactor .sent', '#reactor .connection_state');
  new KadOHui.Routing(node._routingTable, '#routing-table');
  new KadOHui.Transport(node._reactor._transport, '#transport>pre');
  new KadOHui.Logger(KadOH.log, '#log .console', '#log .control');
  node.once('connected', function() {
    $('#info').html('<h3>'+node.getAddress()+' / <small><a href="#" data-placement="bottom" rel="tooltip" title="'+node.getID()+'">'+node.getID().slice(0,10)+'</a></small></h3>');
  });
}

function connect() {
  var that = $(this);
  that.unbind('click', connect);
  node.connect(function() {
    that.button('complete').button('toggle');
  });
}

$(function() {
  KadOHui.init();

  createNode();

  var connectBtn = $('#connection_btn')
  connectBtn.button();
  connectBtn.click(connect);
});