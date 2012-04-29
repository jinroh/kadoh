$(function() { KadOHui.init();}); 

function enable(elt) {
  return elt.removeClass("disabled")
            .removeAttr("disabled");
}

function disable(elt) {
  return elt.addClass("disabled")
            .attr("disabled", "disabled");
}

$(function () {
  node = undefined;

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
  
  var inputs     = $("#credentials input");
  var transport  = $("select.transport");
  var jidInput   = $("#jid");
  var pswdInput  = $("#password");
  var connection = $("#connection");
  var connectBtn = $("#connection input[name=connect]");
  var joinBtn    = $("#connection input[name=join]");
  
  // Transport configs
  var changeTransport = function() {
    var type = config.reactor.type = $(this).val();
    if (type === "XMPP") {
      enable(inputs);
    } else {
      disable(inputs);
    }
  };
  transport.change(changeTransport);
  changeTransport.call(transport);

  // Login configs
  jidInput.keyup(function() {
    config.reactor.transport.jid = $(this).val();
  });
  pswdInput.keyup(function() {
    config.reactor.transport.password = $(this).val();
  });

  // Connection
  var connect = function() {
    var that = $(this);
    that.unbind("click", connect);
    that.addClass("disabled");
    disable(transport);
    var connected = function() {
      that.removeClass("primary danger disabled")
          .addClass("success")
          .attr("value", "Disconnect");
      that.click(disconnect);
      enable(joinBtn);
    };
    var failure = function() {
      that.removeClass("primary danger disabled")
          .addClass("danger")
          .attr("value", "Retry ?");
      that.click(connect);
      enable(transport);
    };

    node = new KadOH.Node(undefined, config);

    KadOH.log.subscribeTo(node, 'Node', 'info');
    KadOH.log.subscribeTo(node._reactor, 'Reactor', 'debug');
    KadOH.log.subscribeTo(node._reactor._transport, 'Transport', 'debug');
    KadOH.log.subscribeTo(node._routingTable, 'RoutingTable', 'debug');

    logger = new KadOHui.Logger(KadOH.log, '#log .console', '#log .control');

    new KadOHui.Control(node);
    new KadOHui.Routing(node._routingTable, '#routing-table');
    new KadOHui.Transport(node._reactor._transport, '#transport>pre');
    new KadOHui.Reactor(node._reactor, '#reactor .received', '#reactor .sent', '#reactor .connection_state');
    node.once('connected', function() {
      valueM = new KadOHui.ValueM(node._store, '#value-management');
    }, this);
    new KadOHui.Node(node, '#node');
    node.once('connected', connected);
    node.connect();
  };
  var disconnect = function() {
    var that = $(this);
    that.unbind("click", disconnect);
    that.addClass("disabled");
    var disconnected = function() {
      that.removeClass("success disabled")
          .addClass("primary")
          .attr("value", "Connect");
      that.click(connect);
      enable(transport);
      disable(joinBtn);
    };
    var failure = function() {
      that.removeClass("success disabled")
          .addClass("danger")
          .attr("value", "Retry ?");
      that.click(disconnect);
    };
    node.disconnect();
    node.once('disconnected', function() {
      disconnected();
    });
  }
  connectBtn.click(connect);
  joinBtn.click(function() {
    node.join();
  });
});