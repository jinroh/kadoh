node = null;

var config = {
  bootstraps : [
    'bootstrap0@kadoh.fr.nf/kadoh',
    'bootstrap1@kadoh.fr.nf/kadoh',
    'bootstrap2@kadoh.fr.nf/kadoh'
  ],
  reactor : {
    transport : {
      jid      : 'kadoh@jabber.org',
      password : 'azerty',
      resource : 'kadoh'
    }
  }
};

function createNode() {
  node = new KadOH.Node(undefined, config);

  KadOH.log.subscribeTo(node, 'Node', 'info');
  KadOH.log.subscribeTo(node._reactor, 'Reactor', 'debug');
  KadOH.log.subscribeTo(node._reactor._transport, 'Transport', 'debug');
  KadOH.log.subscribeTo(node._routingTable, 'RoutingTable', 'debug');

  // UI ...
  new KadOHui.Logger(KadOH.log, '#log .console', '#log .control');
  new KadOHui.Control(node);
  new KadOHui.Routing(node._routingTable, '#routing-table');
  new KadOHui.Transport(node._reactor._transport, '#transport>pre');
  new KadOHui.Reactor(node._reactor, '#reactor .received', '#reactor .sent', '#reactor .connection_state');
  node.once('connected', function() {
    new KadOHui.ValueM(node._store, '#value-management');
  });
  new KadOHui.Node(node, '#node');
}

function connect() {
  var that = $(this);
  that.unbind("click", connect);
  that.button('loading');
  var connected = function() {
    that.button('complete').button('toggle');
    $('#info').html('<h3>'+node.getAddress()+' / <small><a href="#" data-placement="bottom" rel="tooltip" title="'+node.getID()+'">'+node.getID().slice(0,10)+'</a></small></h3>');
    that.click(disconnect);
  };
  var failure = function() {
    that.button('failed');
    that.click(connect);
  };
  createNode();
  enableControls();
  node.once('connected', connected);
  node.connect();
}

function disconnect() {
  var that = $(this);
  disableControls();
  that.unbind("click", disconnect);
  that.addClass("disabled");
  var disconnected = function() {
    that.button('toggle').button('reset');
    that.click(connect);
  };
  var failure = function() {
    that.button('failed');
    that.click(disconnect);
  };
  node.disconnect();
  node.once('disconnected', function() {
    disconnected();
  });
}

function warning() {
  var alert = $('<div class="span6 offset3 alert alert-error">' +
    '<button class="close" data-dismiss="alert">×</button>' +
    '<strong>Warning!</strong> You need to be connected to perform this action.'+
    '</div>').alert();
  $("#control").prepend(alert);
}

function disableControls() {
  buttons = $("#control button");
  buttons.unbind();
  buttons.click(warning);
}

function enableControls() {
  buttons = $("#control button");
  buttons.unbind('click', warning);
}

$(function () {
  KadOHui.init();
  
  var jidInput   = $("#jid");
  var pswdInput  = $("#password");
  var connectBtn = $("#connection_btn");
  connectBtn.button();

  disableControls();

  // Connect button
  connectBtn.click(connect);
  
  // Login configs
  jidInput.keyup(function() {
    config.reactor.transport.jid = $(this).val();
  });
  pswdInput.keyup(function() {
    config.reactor.transport.password = $(this).val();
  });
});
