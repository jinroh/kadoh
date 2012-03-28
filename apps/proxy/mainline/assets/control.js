KadOHui = (typeof KadOHui !== 'undefined') ? KadOHui : {};

KadOHui.Control = function(node) {
  this.node = node;

  $('#ping_btn').click(function() {
    $('#ping_result').html('<img src="UI/css/images/ajax-loader.gif" >');
    node._reactor.sendRPC(new KadOH.PeerBootstrap($('#ping_addr').val(), null), 'PING').then(function() {
      $('#ping_result').html('<img src="UI/css/images/success-icon24.png" >');
    }, function() {
      $('#ping_result').html('<img src="UI/css/images/fail-icon24.png" >');
    });
  });
};